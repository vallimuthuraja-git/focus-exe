import settingsStyles from './settings.css';
import widgetStyles from './widget.css';
import { createDeadlineClock, createFocusClock, updateDeadlineClock, updateFocusClock } from './clock';
import { COLORS, CONFIG, DEADLINE } from './config';
import { createSettingsPanel, type SettingKey, type SettingsLink } from './settings';
import { deadlineRemainingMs, durationMs, type AppState } from './state';
import { button, icon, need, popButton, replaceIcon } from './ui';

export type { SettingKey, SettingsLink } from './settings';

export type ActionKind = 'toggle' | 'reset' | 'switch';

export interface WidgetHooks {
  onGesture(): void;
  onAction(kind: ActionKind): void;
  onSetting(key: SettingKey, value: boolean): void;
  onOpen(target: SettingsLink): void;
  onMinimize(minimized: boolean): void;
}

/** The element that bounds the widget's UI (its shadow-root host). The
 *  outside-click listener uses it to tell a pointer target *inside* the
 *  widget from one on the page background. */

export interface Widget {
  root: HTMLElement;
  render(state: AppState, remaining: number, animate: boolean): void;
  setMinimized(minimized: boolean): void;
  closeOverlays(): void;
  setWidgetHost(host: HTMLElement): void;
  dispose(): void;
}

/** The shadow-root host that bounds the widget's UI. Set by the host page
 *  so the outside-click listener can tell a hit *inside* the widget from a
 *  hit on the page background. */

export const WIDGET_STYLES = `${widgetStyles}\n${settingsStyles}`;

let widgetHost: HTMLElement | null = null;

/** Register the element that bounds the widget's UI (the shadow-root host).
 *  The outside-click listener uses it to detect clicks on the page background. */
const MARKUP = `
    <div class="shell">
        <div class="header">
            <div class="title-group">
                <span class="title-icon-slot"></span>
                <span class="title">Pre-Exam Focus</span>
                <div class="mini-timer">
                    <span class="mini-timer-icon-slot"></span>
                    <div class="mini-timer-copy">
                        <span class="mini-label"></span>
                        <span class="mini-clock-slot"></span>
                    </div>
                </div>
            </div>
            <div class="header-actions"></div>
        </div>

        <div class="body">
            <div class="card deadline-card">
                <div class="card-main">
                    <span class="deadline-icon-slot"></span>
                    <div class="card-copy">
                        <span class="label deadline-label"></span>
                        <span class="deadline-clock-slot"></span>
                    </div>
                </div>
                <span class="date"></span>
            </div>

            <div class="card">
                <div class="card-main">
                    <span class="mode-icon-slot"></span>
                    <div class="card-copy">
                        <span class="label mode-label"></span>
                        <span class="focus-clock-slot"></span>
                    </div>
                </div>
                <span class="guidance"></span>
            </div>

            <div class="session-row">
                <span class="session-summary">
                    <span class="session-icon-slot"></span>
                    <span class="session-count"></span>
                </span>
                <span class="progress-status" role="status" aria-live="polite"></span>
            </div>

            <div class="controls"></div>

            <div class="expanded-confirmation">
                <span class="confirmation-message"></span>
                <div class="confirmation-actions"></div>
            </div>
        </div>

        <span class="progress-track-slot"></span>
    </div>

    <div class="mini-pop-controls"></div>
    <div class="mini-confirmation"></div>

    <div class="settings-panel expanded-settings-panel" role="dialog" aria-label="Settings"></div>
    <div class="settings-panel mini-settings-panel" role="dialog" aria-label="Settings"></div>

    <div class="deadline-panel" role="dialog" aria-label="Deadline countdown">
        <div class="card-main">
            <span class="deadline-panel-icon-slot"></span>
            <div class="card-copy">
                <span class="label deadline-label"></span>
                <span class="deadline-panel-clock-slot"></span>
            </div>
        </div>
        <span class="date deadline-panel-date"></span>
    </div>
`;

const DEADLINE_LABEL = new Intl.DateTimeFormat(undefined, {
  month: 'long',
  day: 'numeric'
}).format(DEADLINE);

const DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  year: 'numeric'
});

export function createWidget(hooks: WidgetHooks): Widget {
  const root = document.createElement('section');
  root.className = 'assistant';
  root.setAttribute('role', 'region');
  root.setAttribute('aria-label', 'Pre-exam focus assistant');
  root.innerHTML = MARKUP; // static markup, no interpolation
  root.style.setProperty('--fx-expanded-width', `${CONFIG.expandedWidth}px`);
  root.style.setProperty('--fx-minimized-width', `${CONFIG.minimizedWidth}px`);

  need(root, '.title-icon-slot').appendChild(icon('school', 'title-icon'));
  need(root, '.mini-timer-icon-slot').appendChild(icon('timer', 'mini-timer-icon'));
  need(root, '.deadline-icon-slot').appendChild(icon('event', 'card-icon'));
  need(root, '.deadline-panel-icon-slot').appendChild(icon('event', 'card-icon'));
  need(root, '.mode-icon-slot').appendChild(icon('book', 'mode-icon'));
  need(root, '.session-icon-slot').appendChild(icon('bullseye', 'session-icon'));
  need(root, '.deadline-clock-slot').appendChild(createDeadlineClock());
  need(root, '.deadline-panel-clock-slot').appendChild(createDeadlineClock());
  need(root, '.focus-clock-slot').appendChild(createFocusClock());
  need(root, '.mini-clock-slot').appendChild(createFocusClock('mini-clock'));

  const progressTrack = document.createElement('span');
  const progressFill = document.createElement('span');
  progressTrack.className = 'progress-track';
  progressFill.className = 'progress-fill';
  progressTrack.appendChild(progressFill);
  need(root, '.progress-track-slot').appendChild(progressTrack);

  for (const label of Array.from(root.querySelectorAll('.deadline-label'))) {
    label.textContent = `${DEADLINE_LABEL} deadline`;
  }

  const minimizeBtn = button('icon-button minimize-button', 'minimize', '', 'Minimize');
  const settingsBtn = button('icon-button settings-button', 'settings', '', 'Settings');
  const startBtn = button('action-button start-button', 'play', 'Start Focus', 'Start focus timer');
  const resetBtn = button('action-button reset-button', 'reset', 'Reset', 'Reset timer');
  const switchBtn = button('action-button switch-button', 'coffee', 'Start Break', 'Switch timer mode');

  settingsBtn.setAttribute('aria-haspopup', 'dialog');
  settingsBtn.setAttribute('aria-expanded', 'false');

  need(root, '.header-actions').append(minimizeBtn);
  need(root, '.controls').append(startBtn, resetBtn, switchBtn, settingsBtn);

  const popStart = popButton('pop-start', 'play', 'Start Focus');
  const popReset = popButton('pop-reset', 'reset', 'Reset timer');
  const popSwitch = popButton('pop-switch', 'coffee', 'Start Break');
  const popDeadline = popButton('deadline-pop-button', 'event', 'Show deadline');
  const popSettings = popButton('settings-pop-button', 'settings', 'Settings');
  popSettings.setAttribute('aria-haspopup', 'dialog');
  popSettings.setAttribute('aria-expanded', 'false');
  need(root, '.mini-pop-controls').append(popStart, popReset, popSwitch, popDeadline, popSettings);

  const confirmBtn = button('confirm-button', 'complete', 'Confirm', 'Confirm action');
  const cancelBtn = button('cancel-button', 'cancel', 'Cancel', 'Cancel action');
  need(root, '.confirmation-actions').append(confirmBtn, cancelBtn);

  const compactConfirm = button('compact-confirm-button', 'complete', 'Confirm', 'Confirm');
  const compactCancel = button('compact-cancel-button', 'cancel', 'Cancel', 'Cancel');
  need(root, '.mini-confirmation').append(compactConfirm, compactCancel);

  // Both views get the same panel, so About/GitHub and the audio toggles are
  // reachable whether the widget is expanded or collapsed.
  const panels = [createSettingsPanel('Settings'), createSettingsPanel('Settings')];
  need(root, '.expanded-settings-panel').appendChild(panels[0].fragment);
  need(root, '.mini-settings-panel').appendChild(panels[1].fragment);

  const confirmationMessage = need(root, '.confirmation-message');
  const expandedSettingsPanel = need(root, '.expanded-settings-panel');
  const miniSettingsPanel = need(root, '.mini-settings-panel');
  const deadlinePanel = need(root, '.deadline-panel');
  const deadlinePanelClock = need<HTMLElement>(root, '.deadline-panel .deadline-clock');
  const deadlinePanelDate = need(root, '.deadline-panel-date');
  const deadlineClock = need<HTMLElement>(root, '.deadline-clock');
  const focusClock = need<HTMLElement>(root, '.focus-clock:not(.mini-clock)');
  const miniClock = need<HTMLElement>(root, '.mini-clock');
  const dateLabel = need(root, '.date:not(.deadline-panel-date)');
  const modeLabel = need(root, '.mode-label');
  const miniLabel = need(root, '.mini-label');
  const modeIconSlot = need(root, '.mode-icon-slot');
  const miniTimerIconSlot = need(root, '.mini-timer-icon-slot');
  const guidance = need(root, '.guidance');
  const sessionCount = need(root, '.session-count');
  const progressStatus = need(root, '.progress-status');

  const noiseInputs = panels.map(panel => panel.noise);
  const metronomeInputs = panels.map(panel => panel.metronome);

  let lastState: AppState | null = null;
  let pending: ActionKind | null = null;
  let minimized = false;

  function closeSettings(): void {
    expandedSettingsPanel.classList.remove('visible');
    miniSettingsPanel.classList.remove('visible');
    settingsBtn.setAttribute('aria-expanded', 'false');
    popSettings.setAttribute('aria-expanded', 'false');
  }

  function closeDeadline(): void {
    deadlinePanel.classList.remove('visible');
  }

  function closeOverlays(): void {
    closeSettings();
    closeDeadline();
    if (!root.matches(':hover') && !root.matches(':focus-within')) {
      root.classList.remove('controls-pinned');
    }
  }

  function toggleSettings(fromMini: boolean): void {
    closeDeadline();
    const target = fromMini ? miniSettingsPanel : expandedSettingsPanel;
    const other = fromMini ? expandedSettingsPanel : miniSettingsPanel;

    other.classList.remove('visible');
    const visible = target.classList.toggle('visible');
    settingsBtn.setAttribute('aria-expanded', String(!fromMini && visible));
    popSettings.setAttribute('aria-expanded', String(fromMini && visible));
    root.classList.toggle('controls-pinned', visible);
  }

  function toggleDeadline(): void {
    closeSettings();
    const visible = deadlinePanel.classList.toggle('visible');
    root.classList.toggle('controls-pinned', visible);
  }

  function closeConfirmation(): void {
    pending = null;
    root.classList.remove('confirming-expanded', 'confirming-compact');
  }

  function messageFor(kind: ActionKind): string {
    const state = lastState;
    const breakMode = state?.mode === 'break';
    if (kind === 'reset') {
      return breakMode ? 'Reset the recovery timer?' : 'Reset the focus timer?';
    }
    if (kind === 'switch') {
      return breakMode ? 'Return to focus mode?' : 'Switch to recovery mode?';
    }
    if (state?.running) {
      return 'Pause the current timer?';
    }
    return breakMode ? 'Start the recovery break?' : 'Start the focus session?';
  }

  function request(kind: ActionKind): void {
    pending = kind;
    closeOverlays();

    if (minimized) {
      root.classList.add('confirming-compact', 'controls-pinned');
      return;
    }
    confirmationMessage.textContent = messageFor(kind);
    root.classList.add('confirming-expanded');
  }

  function confirm(): void {
    const kind = pending;
    closeConfirmation();
    if (kind) {
      hooks.onAction(kind);
    }
  }

  function setMinimized(next: boolean): void {
    minimized = next;
    closeConfirmation();
    closeOverlays();
    root.classList.toggle('minimized', next);
    replaceIcon(minimizeBtn, next ? 'expand' : 'minimize');
    const label = next ? 'Expand' : 'Minimize';
    minimizeBtn.title = label;
    minimizeBtn.setAttribute('aria-label', label);
  }

  function requestAction(node: HTMLElement, kind: ActionKind): void {
    node.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      hooks.onGesture();
      request(kind);
    });
  }

  function toggleFrom(node: HTMLElement, handler: () => void): void {
    node.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      handler();
    });
  }

  requestAction(startBtn, 'toggle');
  requestAction(popStart, 'toggle');
  requestAction(resetBtn, 'reset');
  requestAction(popReset, 'reset');
  requestAction(switchBtn, 'switch');
  requestAction(popSwitch, 'switch');

  minimizeBtn.addEventListener('click', () => {
    hooks.onGesture();
    setMinimized(!minimized);
    hooks.onMinimize(minimized);
  });

  toggleFrom(settingsBtn, () => toggleSettings(false));
  toggleFrom(popSettings, () => toggleSettings(true));
  toggleFrom(popDeadline, toggleDeadline);

  // About & support and GitHub live in the settings panel, once per view.
  for (const panel of panels) {
    for (const [target, node] of panel.links) {
      toggleFrom(node, () => {
        closeOverlays();
        hooks.onGesture();
        hooks.onOpen(target);
      });
    }
  }

  confirmBtn.addEventListener('click', confirm);
  compactConfirm.addEventListener('click', confirm);
  cancelBtn.addEventListener('click', closeConfirmation);
  compactCancel.addEventListener('click', closeConfirmation);

  for (const input of noiseInputs) {
    input.addEventListener('change', () => {
      hooks.onGesture();
      hooks.onSetting('brownNoise', input.checked);
    });
  }
  for (const input of metronomeInputs) {
    input.addEventListener('change', () => {
      hooks.onGesture();
      hooks.onSetting('metronome', input.checked);
    });
  }
  function setWidgetHost(host: HTMLElement): void {
    widgetHost = host;
  }

  const onPointerLeave = (): void => {
    const panelOpen =
      expandedSettingsPanel.classList.contains('visible') ||
      miniSettingsPanel.classList.contains('visible') ||
      deadlinePanel.classList.contains('visible');
    if (!root.classList.contains('confirming-compact') && !panelOpen) {
      root.classList.remove('controls-pinned');
    }
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') {
      return;
    }
    if (pending) {
      closeConfirmation();
      return;
    }
    closeOverlays();
  };

  root.addEventListener('pointerleave', onPointerLeave);
  root.addEventListener('keydown', onKeyDown);

  const onWidgetPointerDown = (): void => {
    hooks.onGesture();
  };
  root.addEventListener('pointerdown', onWidgetPointerDown, { passive: true });

  /**
   * Auto-close on blur.
   *
   * The widget lives inside a closed shadow root, so a click that lands on the
   * page background does not naturally "see" the widget. We listen on `document`
   * so we never miss a hit. If the pointer's composed path does not contain the
   * widget host, every floating panel is closed and, when the widget is not
   * already minimized, it is minimized (width/icon/aria return to the default
   * state) and the minimized flag is persisted — the same behaviour as the
   * original script's outside-click detection.
   */
  const onDocumentPointerDown = (event: PointerEvent): void => {
    if (widgetHost?.contains(event.target as Node)) {
      return;
    }
    closeOverlays();
    if (!root.classList.contains('minimized')) {
      setMinimized(true);
    }
  };
  function syncInputs(inputs: HTMLInputElement[], value: boolean): void {
    for (const input of inputs) {
      input.checked = value;
    }
  }

  document.addEventListener('pointerdown', onDocumentPointerDown, { passive: true });

  function labelButton(node: HTMLElement, label: string, isPop: boolean): void {
    const text = node.querySelector('.button-label');
    if (text) {
      text.textContent = label;
    }
    node.title = label;
    node.setAttribute('aria-label', label);
    if (isPop) {
      node.dataset.tooltip = label;
    }
  }

  function render(state: AppState, remaining: number, animate: boolean): void {
    lastState = state;
    syncInputs(noiseInputs, state.brownNoise);
    syncInputs(metronomeInputs, state.metronome);

    const now = Date.now();
    const visibleAnimate = animate && !minimized;

    updateDeadlineClock(deadlineClock, deadlineRemainingMs(now), visibleAnimate);
    updateFocusClock(focusClock, remaining, visibleAnimate);
    updateFocusClock(miniClock, remaining, animate && minimized);

    const breakMode = state.mode === 'break';
    const modeText = breakMode ? 'Recovery break' : 'Focus session';

    root.classList.toggle('break-mode', breakMode);
    dateLabel.textContent = DATE_FORMAT.format(new Date(now));
    modeLabel.textContent = modeText;
    miniLabel.textContent = modeText;
    guidance.textContent = breakMode ? 'Rest briefly, then return' : 'One lesson at a time';
    modeIconSlot.replaceChildren(icon(breakMode ? 'coffee' : 'book', 'mode-icon'));
    miniTimerIconSlot.replaceChildren(icon(breakMode ? 'coffee' : 'timer', 'mini-timer-icon'));

    replaceIcon(startBtn, state.running ? 'pause' : 'play');
    startBtn.classList.toggle('running', state.running);
    replaceIcon(popStart, state.running ? 'pause' : 'play');
    labelButton(startBtn, state.running ? 'Pause' : breakMode ? 'Start Break' : 'Start Focus', false);
    labelButton(popStart, state.running ? 'Pause' : breakMode ? 'Start Break' : 'Start Focus', true);

    const switchText = breakMode ? 'Return to Focus' : 'Start Break';
    replaceIcon(switchBtn, breakMode ? 'book' : 'coffee');
    replaceIcon(popSwitch, breakMode ? 'book' : 'coffee');
    labelButton(switchBtn, switchText, false);
    labelButton(popSwitch, switchText, true);

    const duration = durationMs(state);
    const elapsed = duration > 0 ? Math.min(duration, Math.max(0, remaining)) : 0;
    const percent = duration > 0 ? ((duration - elapsed) / duration) * 100 : 0;
    const left = 100 - percent;
    const palette: Array<[number, string]> = breakMode
      ? [[60, COLORS.breakTeal], [25, COLORS.breakBlue], [0, COLORS.focusAmber]]
      : [[70, COLORS.focusGreen], [40, COLORS.focusBlue], [15, COLORS.focusAmber], [0, COLORS.focusRed]];

    const color = palette.find(([threshold]) => left > threshold)?.[1] ?? COLORS.focusRed;

    progressFill.style.width = `${percent}%`;
    progressFill.style.backgroundColor = color;
    sessionCount.textContent = `${state.sessions} ${state.sessions === 1 ? 'focus session' : 'focus sessions'}`;
    progressStatus.textContent = breakMode
      ? state.running
        ? 'Recovering'
        : 'Break ready'
      : state.running
        ? 'Focused'
        : 'Ready';

    if (deadlinePanel.classList.contains('visible')) {
      updateDeadlineClock(deadlinePanelClock, deadlineRemainingMs(now), animate && minimized);
      deadlinePanelDate.textContent = DATE_FORMAT.format(new Date(now));
    }
  }

  return {
    root,
    render,
    setMinimized,
    closeOverlays,
    setWidgetHost,
    dispose(): void {
      root.removeEventListener('pointerleave', onPointerLeave);
      root.removeEventListener('keydown', onKeyDown);
      root.removeEventListener('pointerdown', onWidgetPointerDown);
      document.removeEventListener('pointerdown', onDocumentPointerDown);
    }
  };
}




