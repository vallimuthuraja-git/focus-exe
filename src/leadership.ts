import { readStorage, writeStorage } from './browser';

/**
 * Single-audio leadership.
 *
 * The widget mounts in every tab, but its brown noise and metronome must be
 * audible from exactly one tab. Tabs share one short-lived
 * `chrome.storage.local` lease; only the recorded holder may emit audio.
 * The holder renews the lease on a heartbeat, releases it on unmount/pause,
 * and followers take over when the lease expires or is released. Expired or
 * malformed leases never block a live tab.
 */

export interface AudioLease {
  holder: string;
  updatedAt: number;
}

export const AUDIO_LEADER_KEY = 'focusExeAudioLeaderV1';

/**
 * Longer than any expected heartbeat gap (hidden tabs can have their timers
 * clamped hard), so a live-but-throttled leader is never usurped mid-session.
 * Normal close/unmount releases explicitly, so failover is immediate there;
 * the TTL only bounds crash recovery.
 */
const LEASE_TTL_MS = 60_000;
const HEARTBEAT_MS = 5_000;

let identity = '';

export function leaderIdentity(): string {
  if (!identity) {
    const random = Math.floor(Math.random() * 0xffffffff).toString(16);
    identity = `tab-${Date.now().toString(36)}-${random}`;
  }
  return identity;
}

function sanitizeLease(raw: unknown, now = Date.now()): AudioLease | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const record = raw as Partial<AudioLease>;
  if (typeof record.holder !== 'string' || record.holder.length === 0 || record.holder.length > 160) {
    return null;
  }
  if (typeof record.updatedAt !== 'number' || !Number.isFinite(record.updatedAt) || record.updatedAt <= 0) {
    return null;
  }
  if (record.updatedAt > now + 60_000) {
    return null;
  }
  return { holder: record.holder, updatedAt: Math.floor(record.updatedAt) };
}

function leaseFresh(lease: AudioLease | null, now = Date.now()): boolean {
  return lease !== null && now - lease.updatedAt < LEASE_TTL_MS;
}

export interface AudioLeadership {
  /** Last-known leadership, without touching storage. */
  isLeader(): boolean;
  /**
   * Claim or renew the lease when this tab wants audio. Resolves true only
   * when this tab is the recorded holder afterwards. Never throws.
   */
  ensure(): Promise<boolean>;
  /** Give up the lease if held; stays usable for future claims. Never throws. */
  standDown(): Promise<void>;
  /** Stop heartbeats and release the lease; the instance is done. */
  dispose(): void;
}

export function createAudioLeadership(): AudioLeadership {
  const id = leaderIdentity();
  let leader = false;
  let active = true;
  let heartbeatTimer: number | null = null;
  let lastRenewAt = 0;

  function stopHeartbeat(): void {
    if (heartbeatTimer !== null) {
      window.clearTimeout(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  async function clearOwnLease(): Promise<void> {
    try {
      const observed = sanitizeLease(await readStorage<AudioLease>(AUDIO_LEADER_KEY), Date.now());
      if (observed && observed.holder === id) {
        await writeStorage(AUDIO_LEADER_KEY, { holder: '', updatedAt: 0 });
      }
    } catch {
      return;
    }
  }

  async function renew(): Promise<boolean> {
    try {
      // A successful claim stays claimable without rewriting storage on every
      // sync call; the periodic heartbeat is the only writer after the claim.
      if (leader && Date.now() - lastRenewAt < HEARTBEAT_MS) {
        return true;
      }
      const observed = sanitizeLease(await readStorage<AudioLease>(AUDIO_LEADER_KEY), Date.now());
      if (observed && leaseFresh(observed) && observed.holder !== id) {
        leader = false;
        stopHeartbeat();
        return false;
      }
      await writeStorage(AUDIO_LEADER_KEY, { holder: id, updatedAt: Date.now() });
      lastRenewAt = Date.now();
      const confirm = sanitizeLease(await readStorage<AudioLease>(AUDIO_LEADER_KEY), Date.now());
      if (confirm && confirm.holder === id) {
        leader = true;
        return true;
      }
      leader = false;
      stopHeartbeat();
      return false;
    } catch {
      leader = false;
      stopHeartbeat();
      return false;
    }
  }

  function armHeartbeat(): void {
    if (heartbeatTimer !== null || !active) {
      return;
    }
    heartbeatTimer = window.setTimeout(function loop() {
      heartbeatTimer = null;
      if (!active || !leader) {
        return;
      }
      void renew()
        .catch(() => false)
        .finally(() => {
          if (active && leader && heartbeatTimer === null) {
            heartbeatTimer = window.setTimeout(loop, HEARTBEAT_MS);
          }
        });
    }, HEARTBEAT_MS);
  }

  return {
    isLeader(): boolean {
      return leader;
    },

    async ensure(): Promise<boolean> {
      if (!active) {
        return false;
      }
      const ok = await renew();
      if (ok) {
        armHeartbeat();
      }
      return ok;
    },

    async standDown(): Promise<void> {
      leader = false;
      stopHeartbeat();
      await clearOwnLease();
    },

    dispose(): void {
      leader = false;
      active = false;
      stopHeartbeat();
      void clearOwnLease();
    }
  };
}

