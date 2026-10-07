import { CONFIG, type Mode } from './config';
import type { AppState } from './state';

export interface AudioEngine {
  /** Must be called from a user gesture; browsers block audio otherwise. */
  unlock(): Promise<boolean>;
  /** Brings the running sounds in line with the given state. Safe to call often. */
  sync(state: AppState): void;
  /** Stops every sound but keeps the audio graph alive. */
  stop(): void;
  dispose(): void;
}

/** One scheduled metronome pulse: two oscillators plus their gain envelopes. */
interface Beat {
  sources: OscillatorNode[];
  gains: GainNode[];
}

export function createAudioEngine(): AudioEngine {
  let state: AppState | null = null;
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  let compressor: DynamicsCompressorNode | null = null;
  let noiseBuffer: AudioBuffer | null = null;
  let noiseSource: AudioBufferSourceNode | null = null;
  let noiseGain: GainNode | null = null;
  let metronomeTimer: number | null = null;
  let nextBeatAt = 0;
  let queue: Promise<void> = Promise.resolve();
  /** Pulses already queued on the audio clock, so a stop can cancel them. */
  const pendingBeats = new Set<Beat>();
  /** Mode the queued pulses were pitched for, so a switch can drop them. */
  let scheduledMode: Mode | null = null;
  let watching = false;
  let disposed = false;

  function getContext(): AudioContext | null {
    if (context) {
      return context;
    }
    const Ctor = window.AudioContext ?? window.webkitAudioContext;
    context = Ctor ? new Ctor() : null;
    if (context && !watching) {
      watching = true;
      const ctx = context;
      // The autoplay policy or a browser suspension can stop the context at any
      // moment: ask to come back, and re-apply the sounds the moment we may run.
      ctx.addEventListener('statechange', () => {
        if (disposed) {
          return;
        }
        const wantsSound = state !== null && state.running && (state.brownNoise || state.metronome);
        if (ctx.state === 'suspended' && wantsSound) {
          void ctx.resume().catch(() => undefined);
        } else if (ctx.state === 'running') {
          scheduleApply();
        }
      });
    }
    return context;
  }

  async function unlock(): Promise<boolean> {
    if (disposed) {
      return false;
    }
    const ctx = getContext();
    if (!ctx) {
      return false;
    }
    try {
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      return ctx.state === 'running';
    } catch (error) {
      console.warn('[Focus Exe] Audio unlock failed.', error);
      return false;
    }
  }

  function ensureChain(ctx: AudioContext): boolean {
    if (master && compressor) {
      return true;
    }
    master = ctx.createGain();
    compressor = ctx.createDynamicsCompressor();

    compressor.threshold.value = -20;
    compressor.knee.value = 12;
    compressor.ratio.value = 6;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.16;
    master.gain.value = CONFIG.masterVolume;

    compressor.connect(master);
    master.connect(ctx.destination);
    return true;
  }

  /** One pole low pass over white noise: a soft brown-ish bed, cheap to generate. */
  function buildNoise(ctx: AudioContext): AudioBuffer {
    if (noiseBuffer) {
      return noiseBuffer;
    }
    const frames = Math.max(1, Math.floor(ctx.sampleRate * 4));
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let previous = 0;

    for (let index = 0; index < frames; index += 1) {
      const white = Math.random() * 2 - 1;
      previous = (previous + 0.02 * white) / 1.02;
      data[index] = previous * 3.2;
    }

    noiseBuffer = buffer;
    return buffer;
  }

  function startNoise(ctx: AudioContext): void {
    if (noiseSource) {
      return;
    }
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    source.buffer = buildNoise(ctx);
    source.loop = true;

    filter.type = 'highpass';
    filter.frequency.value = 45;
    filter.Q.value = 0.55;

    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(CONFIG.brownNoiseVolume, ctx.currentTime + 0.35);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(compressor as DynamicsCompressorNode);
    source.start();
    noiseSource = source;
    noiseGain = gain;
  }

  function stopNoise(): void {
    const source = noiseSource;
    const gain = noiseGain;
    const ctx = context;
    noiseSource = null;
    noiseGain = null;
    if (!source || !gain || !ctx) {
      return;
    }

    try {
      const now = ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      source.stop(now + 0.2);
    } catch {
      try {
        source.stop();
      } catch {
        return;
      }
    }

    window.setTimeout(() => {
      try {
        source.disconnect();
        gain.disconnect();
      } catch {
        return;
      }
    }, 300);
  }

  function scheduleBeat(ctx: AudioContext, at: number, mode: Mode): void {
    if (!compressor) {
      return;
    }
    const primary = ctx.createOscillator();
    const harmonic = ctx.createOscillator();
    const primaryGain = ctx.createGain();
    const harmonicGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    const from = mode === 'focus' ? 740 : 620;
    const to = mode === 'focus' ? 520 : 440;

    primary.type = 'sine';
    harmonic.type = 'triangle';

    primary.frequency.setValueAtTime(from, at);
    primary.frequency.exponentialRampToValueAtTime(to, at + 0.11);
    harmonic.frequency.setValueAtTime(from * 2, at);
    harmonic.frequency.exponentialRampToValueAtTime(to * 2, at + 0.075);

    filter.type = 'bandpass';
    filter.frequency.value = 960;
    filter.Q.value = 0.72;

    primaryGain.gain.setValueAtTime(0.0001, at);
    primaryGain.gain.exponentialRampToValueAtTime(CONFIG.metronomeVolume, at + 0.006);
    primaryGain.gain.exponentialRampToValueAtTime(0.0001, at + 0.13);

    harmonicGain.gain.setValueAtTime(0.0001, at);
    harmonicGain.gain.exponentialRampToValueAtTime(CONFIG.metronomeVolume * 0.34, at + 0.004);
    harmonicGain.gain.exponentialRampToValueAtTime(0.0001, at + 0.085);

    primary.connect(primaryGain);
    harmonic.connect(harmonicGain);
    primaryGain.connect(filter);
    harmonicGain.connect(filter);
    filter.connect(compressor);

    primary.start(at);
    harmonic.start(at);
    primary.stop(at + 0.15);
    harmonic.stop(at + 0.1);

    const beat: Beat = { sources: [primary, harmonic], gains: [primaryGain, harmonicGain] };
    pendingBeats.add(beat);

    primary.addEventListener(
      'ended',
      () => {
        pendingBeats.delete(beat);
        try {
          primary.disconnect();
          harmonic.disconnect();
          primaryGain.disconnect();
          harmonicGain.disconnect();
          filter.disconnect();
        } catch {
          return;
        }
      },
      { once: true }
    );
  }

  /**
   * Drops pulses already queued on the audio clock. A hidden tab queues up to
   * `hiddenScheduleAheadSeconds` of them, so stopping the metronome (or flipping
   * the mode) must be able to cancel that backlog — fading first, so a stop is
   * never an audible click.
   */
  function flushPendingBeats(): void {
    const now = context ? context.currentTime : 0;
    for (const beat of pendingBeats) {
      for (const gain of beat.gains) {
        try {
          gain.gain.cancelScheduledValues(now);
          gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);
        } catch {
          // The graph is already torn down; the nodes die with it.
        }
      }
      for (const source of beat.sources) {
        try {
          source.stop(now + 0.03);
        } catch {
          // Already stopped, or never started.
        }
      }
    }
    pendingBeats.clear();
  }

  /**
   * Re-applies the sounds on the serialized queue. Nothing on this path awaits
   * the browser's autoplay decision: a `resume()` that never settles used to
   * wedge the queue, and then no later `sync()` could ever play again.
   */
  function scheduleApply(): void {
    queue = queue.then(apply).catch(() => undefined);
  }

  /** Look-ahead scheduler: pulses are queued on the audio clock, not setTimeout. */
  function pumpScheduler(): void {
    if (!state?.running || !state.metronome || !compressor) {
      return;
    }
    const ctx = context;
    if (!ctx || ctx.state !== 'running') {
      return;
    }
    if (scheduledMode !== state.mode) {
      // Queued pulses of the previous mode would keep ticking into the new one.
      scheduledMode = state.mode;
      flushPendingBeats();
    }
    // A background tab may wake minutes late; never queue a beat in the past,
    // or the backlog would all fire at once.
    if (nextBeatAt < ctx.currentTime) {
      nextBeatAt = ctx.currentTime + 0.05;
    }
    // Hidden tabs get their timers clamped (down to once a minute), so queue a
    // long window of beats on the audio clock while nobody is looking. The
    // window is bounded, so this fills up and then idles until the clock catches up.
    const lookAhead = document.hidden ? CONFIG.hiddenScheduleAheadSeconds : CONFIG.scheduleAheadSeconds;
    const horizon = ctx.currentTime + lookAhead;
    const interval = 60 / CONFIG.metronomeBpm;
    while (nextBeatAt < horizon) {
      scheduleBeat(ctx, nextBeatAt, state.mode);
      nextBeatAt += interval;
    }
  }

  function startMetronome(ctx: AudioContext): void {
    if (metronomeTimer !== null) {
      return;
    }
    nextBeatAt = ctx.currentTime + 0.08;
    pumpScheduler();
    metronomeTimer = window.setInterval(pumpScheduler, CONFIG.schedulerMs);
  }

  function stopMetronome(): void {
    if (metronomeTimer !== null) {
      window.clearInterval(metronomeTimer);
      metronomeTimer = null;
    }
    flushPendingBeats();
    scheduledMode = null;
    nextBeatAt = 0;
  }

  function stopEngine(): void {
    stopMetronome();
    stopNoise();
  }

  function apply(): void {
    if (disposed) {
      return;
    }
    // The tab stays audible in the background: nothing here looks at
    // document.hidden any more, only at the session the user asked for.
    if (!state?.running || (!state.brownNoise && !state.metronome)) {
      stopEngine();
      return;
    }
    const ctx = getContext();
    if (!ctx || !ensureChain(ctx)) {
      return;
    }
    if (ctx.state !== 'running') {
      // Autoplay policy: the context may only run after a gesture in the page.
      // Never await it — a resume() that settles only on a gesture used to hang
      // this whole queue, which is why a reopened widget stayed silent. The
      // statechange watcher above re-applies the sounds once we may run.
      void ctx.resume().catch(() => undefined);
      return;
    }

    if (state.brownNoise) {
      startNoise(ctx);
    } else {
      stopNoise();
    }

    if (state.metronome) {
      startMetronome(ctx);
    } else {
      stopMetronome();
    }
  }

  return {
    unlock,
    sync(next: AppState): void {
      if (disposed) {
        return;
      }
      state = next;
      scheduleApply();
    },
    stop(): void {
      state = null;
      stopEngine();
    },
    dispose(): void {
      disposed = true;
      stopEngine();
      pendingBeats.clear();
      scheduledMode = null;
      watching = false;
      if (context) {
        void context.close().catch(() => undefined);
        context = null;
      }
      master = null;
      compressor = null;
    }
  };
}



