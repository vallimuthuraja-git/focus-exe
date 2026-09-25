import { readStorage, writeStorage } from './browser';
import { CONFIG, DEADLINE, MAX_SESSIONS, STORAGE_KEY, type Mode } from './config';

export interface AppState {
  mode: Mode;
  running: boolean;
  /** Epoch ms the running timer ends at, `null` when idle or paused. */
  endAt: number | null;
  /** Remaining ms frozen while paused, `null` when idle or running. */
  remaining: number | null;
  sessions: number;
  brownNoise: boolean;
  metronome: boolean;
  minimized: boolean;
}

export function defaultState(): AppState {
  return {
    mode: 'focus',
    running: false,
    endAt: null,
    remaining: null,
    sessions: 0,
    brownNoise: true,
    metronome: true,
    minimized: false
  };
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

/** Never trusts stored data: everything is range checked before it reaches the UI. */
export function sanitize(raw: Partial<AppState> | null | undefined): AppState {
  const base = defaultState();
  if (!raw || typeof raw !== 'object') {
    return base;
  }

  const mode: Mode = raw.mode === 'break' ? 'break' : 'focus';
  const maxMs = (mode === 'focus' ? CONFIG.focusMinutes : CONFIG.breakMinutes) * 60_000;
  const running = raw.running === true;
  const endAt = Number.isFinite(Number(raw.endAt)) && running ? Number(raw.endAt) : null;
  const remaining = Number.isFinite(Number(raw.remaining)) ? Number(raw.remaining) : null;

  return {
    mode,
    running: running && endAt !== null,
    endAt: endAt === null ? null : Math.min(endAt, Date.now() + maxMs),
    remaining: remaining === null ? null : clampNumber(remaining, 0, maxMs, 0),
    sessions: clampNumber(raw.sessions, 0, MAX_SESSIONS, 0),
    brownNoise: raw.brownNoise !== false,
    metronome: raw.metronome !== false,
    minimized: raw.minimized === true
  };
}

export function durationMs(state: AppState): number {
  return (state.mode === 'focus' ? CONFIG.focusMinutes : CONFIG.breakMinutes) * 60_000;
}

export function remainingMs(state: AppState, now = Date.now()): number {
  if (state.running && state.endAt !== null) {
    return Math.max(0, state.endAt - now);
  }
  if (state.remaining !== null) {
    return Math.max(0, state.remaining);
  }
  return durationMs(state);
}

export function deadlineRemainingMs(now = Date.now()): number {
  return Math.max(0, DEADLINE.getTime() - now);
}

/** Applies an elapsed timer: counts the session and flips to the opposite mode. */
function settle(state: AppState): AppState {
  const finished: AppState = {
    ...state,
    running: false,
    endAt: null,
    remaining: null
  };

  if (finished.mode === 'focus') {
    finished.sessions = Math.min(MAX_SESSIONS, finished.sessions + 1);
  }

  finished.mode = finished.mode === 'focus' ? 'break' : 'focus';
  return finished;
}

export interface Settled {
  state: AppState;
  completedMode: Mode;
  expired: boolean;
}

export function reconcile(state: AppState, now = Date.now()): Settled {
  if (state.running && state.endAt !== null && state.endAt <= now) {
    const completedMode = state.mode;
    return { state: settle(state), completedMode, expired: true };
  }
  return { state, completedMode: state.mode, expired: false };
}

export interface Store {
  save(): void;
  flush(): void;
}

export function createStore(getState: () => AppState): Store {
  let pending: number | null = null;

  const write = (): void => {
    pending = null;
    void writeStorage(STORAGE_KEY, getState());
  };

  return {
    save(): void {
      if (pending !== null) {
        return;
      }
      pending = window.setTimeout(write, 200);
    },
    flush(): void {
      if (pending !== null) {
        window.clearTimeout(pending);
      }
      write();
    }
  };
}

export async function loadState(): Promise<AppState> {
  return sanitize(await readStorage<Partial<AppState>>(STORAGE_KEY));
}
