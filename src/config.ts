export type Mode = 'focus' | 'break';

export const HOST_ID = 'focus-exe-host';

export const LOG_PREFIX = '[Focus Exe]';

export const STORAGE_KEY = 'focusExeStateV1';

/** Message contract between the service worker and an injected widget. */
export const COMMAND = Object.freeze({
  toggle: 'focus-exe/command:toggle',
  show: 'focus-exe/command:show',
  hide: 'focus-exe/command:hide',
  about: 'focus-exe/command:about',
  repo: 'focus-exe/command:repo'
});

export const COMPLETE = 'focus-exe/complete';

/** Bundled product page, opened in a tab from the settings panel. */
export const PAGE_PATH = 'page/index.html';

/** Source repository, injected by build.mjs from package.json. */
export const REPO_URL = __REPO_URL__;

export const DEADLINE = new Date(2026, 11, 31, 23, 59, 59, 999);

/** Upper bound for the session counter, so a tampered value cannot render absurd text. */
export const MAX_SESSIONS = 9999;

export const CONFIG = Object.freeze({
  focusMinutes: 25,
  breakMinutes: 5,
  metronomeBpm: 60,
  brownNoiseVolume: 0.05,
  metronomeVolume: 0.14,
  masterVolume: 0.82,
  scheduleAheadSeconds: 0.12,
  /**
   * A hidden tab gets its timers clamped hard (down to once a minute after a
   * few minutes), so the metronome queues this many seconds of beats on the
   * audio clock instead of `scheduleAheadSeconds`. The audio clock keeps
   * running while the tab is in the background, so the beats still land on time.
   */
  hiddenScheduleAheadSeconds: 75,
  schedulerMs: 50,
  expandedWidth: 430,
  minimizedWidth: 288,
  rollFallbackMs: 760,
  debug: false
});

export const COLORS = Object.freeze({
  focusGreen: '#53c783',
  focusBlue: '#4b9ee8',
  focusAmber: '#e2a93b',
  focusRed: '#dc5b55',
  breakTeal: '#52cfb4',
  breakBlue: '#62a7df',
  confirmGreen: '#2f9d67',
  confirmGreenHover: '#38b979'
});

export const ICONS = Object.freeze({
  school: 'M5 13.18V17l7 3.82L19 17v-3.82L12 17 5 13.18zM12 3 1 9l11 6 9-4.91V17h2V9L12 3z',
  timer: 'M15 1H9v2h6V1zm-1 13h-4v-4h4v4zm3.03-4.03.97-.97c-.43-.52-.9-.99-1.42-1.42l-.97.97A6.96 6.96 0 0 0 12 6a7 7 0 1 0 7 7c0-1.12-.27-2.18-.74-3.12l-1.23.09zM12 18a5 5 0 1 1 0-10 5 5 0 0 1 0 10z',
  event: 'M19 4h-1V2h-2v2H8V2H6v2H5a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3zm1 15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8h16v8zm0-10H4V7a1 1 0 0 1 1-1h1v2h2V6h8v2h2V6h1a1 1 0 0 1 1 1v2z',
  book: 'M21 4H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14V4zm-2 13H7a2 2 0 0 0 0 2h12v-2zm0-2H7V6h12v9zM3 6H1v13a2 2 0 0 0 2 2V6z',
  play: 'M8 5v14l11-7L8 5z',
  pause: 'M6 19h4V5H6v14zm8-14v14h4V5h-4z',
  reset: 'M12 5V2L8 6l4 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z',
  coffee: 'M18 8h1a3 3 0 0 1 0 6h-1v1a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V7h16v1zm0 4h1a1 1 0 0 0 0-2h-1v2zM4 9v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9H4zM6 2h2v3H6V2zm4 0h2v3h-2V2zm4 0h2v3h-2V2z',
  minimize: 'M6 11h12v2H6z',
  expand: 'M7.41 14.59 12 10l4.59 4.59L18 13.17l-6-6-6 6 1.41 1.42z',
  complete: 'M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z',
  cancel: 'M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.41 4.29 19.71 2.88 18.3 9.17 12 2.88 5.71 4.29 4.3 10.59 10.59 16.89 4.3z',
  settings: 'M19.14 12.94a7.49 7.49 0 0 0 .05-.94 7.49 7.49 0 0 0-.05-.94l2.03-1.58-1.92-3.32-2.39.96a7.08 7.08 0 0 0-1.63-.94L14.87 3h-3.74l-.36 3.18c-.58.24-1.13.56-1.63.94l-2.39-.96-1.92 3.32 2.03 1.58a7.49 7.49 0 0 0-.05.94c0 .32.02.63.05.94l-2.03 1.58 1.92 3.32 2.39-.96c.5.38 1.05.7 1.63.94l.36 3.18h3.74l.36-3.18c.58-.24 1.13-.56 1.63-.94l2.39.96 1.92-3.32-2.03-1.58zM13 15.5A3.5 3.5 0 1 1 13 8a3.5 3.5 0 0 1 0 7.5z',
  info: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z',
  github: 'M12 .3a12 12 0 0 0-3.79 23.4c.6.11.82-.26.82-.58v-2.03c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.6-2.8 5.62-5.48 5.92.43.37.82 1.11.82 2.24v3.32c0 .32.22.7.83.58A12 12 0 0 0 12 .3z',
  open: 'M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z',
  noise: 'M3 10v4h4l5 5V5L7 10H3zm11.5 2a2.5 2.5 0 0 0-1.5-2.29v4.58A2.5 2.5 0 0 0 14.5 12zm-1.5-7.97v2.06a6 6 0 0 1 0 11.82v2.06a8 8 0 0 0 0-15.94z',
  metronome: 'M9 2h6l1 4H8l1-4zm-1.5 6h9L20 22H4L7.5 8zm4.5 2-2 8h4l-2-8z'
} as const);

export type IconName = keyof typeof ICONS;

export function log(message: string, details?: unknown): void {
  if (!CONFIG.debug) {
    return;
  }
  if (details === undefined) {
    console.log(LOG_PREFIX, message);
  } else {
    console.warn(LOG_PREFIX, message, details);
  }
}
