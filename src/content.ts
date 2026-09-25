import { createAudioEngine } from './audio';
import { sendMessage } from './browser';
import { COMMAND, COMPLETE, HOST_ID } from './config';
import {
  createStore,
  durationMs,
  loadState,
  reconcile,
  remainingMs,
  type AppState
} from './state';
import { createWidget, WIDGET_STYLES, type ActionKind, type SettingKey } from './widget';

const TICK_MS = 1000;
const COMMANDS: readonly string[] = [COMMAND.toggle, COMMAND.show, COMMAND.hide];

interface WidgetSession {
  dispose(): void;
}

let session: WidgetSession | null = null;
let ready = false;
const queue: string[] = [];

function mountHost(): HTMLElement {
  document.getElementById(HOST_ID)?.remove();

  const host = document.createElement('div');
  host.id = HOST_ID;
  Object.assign(host.style, {
    position: 'fixed',
    left: '10px',
    bottom: '10px',
    zIndex: '2147483640',
    width: 'auto',
    height: 'auto',
    maxWidth: 'calc(100vw - 20px)',
    margin: '0',
    padding: '0',
    border: '0',
    outline: '0',
    background: 'transparent',
    pointerEvents: 'auto',
    contain: 'layout style'
  });
  document.body.appendChild(host);
  return host;
}

async function mount(): Promise<WidgetSession> {
  if (session) {
    return session;
  }
  if (window.top !== window.self || !document.body) {
    throw new Error('Unsupported frame or document.');
  }

  let state: AppState = reconcile(await loadState()).state;
  const audio = createAudioEngine();
  const store = createStore(() => state);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const host = mountHost();
  const shadow = host.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');

  style.textContent = WIDGET_STYLES;
  shadow.appendChild(style);

  let tick = 0;

  const widget = createWidget({
    onGesture: () => void audio.unlock(),
    onAction: runAction,
    onSetting: setSetting,
    onMinimize: minimized => {
      state = { ...state, minimized };
      store.save();
      render(false);
    }
  });

  shadow.appendChild(widget.root);
  widget.setMinimized(state.minimized);

  function render(animate: boolean): void {
    widget.render(state, remainingMs(state), animate && !reducedMotion);
  }

  function commit(): void {
    store.save();
    render(false);
    audio.sync(state);
  }

  function settleIfExpired(): void {
    const result = reconcile(state);
    if (!result.expired) {
      return;
    }
    state = result.state;
    store.flush();
    audio.sync(state);
    render(false);
    void sendMessage({ type: COMPLETE, mode: result.completedMode });
  }

  function setSetting(key: SettingKey, value: boolean): void {
    state = { ...state, [key]: value };
    commit();
  }

  function runAction(kind: ActionKind): void {
    switch (kind) {
      case 'toggle': {
        if (state.running) {
          state = { ...state, running: false, endAt: null, remaining: remainingMs(state) };
        } else {
          const left = state.remaining ?? durationMs(state);
          state = { ...state, running: true, endAt: Date.now() + left, remaining: null };
        }
        break;
      }
      case 'reset': {
        state = { ...state, running: false, endAt: null, remaining: null };
        break;
      }
      case 'switch': {
        state = {
          ...state,
          mode: state.mode === 'focus' ? 'break' : 'focus',
          running: false,
          endAt: null,
          remaining: null
        };
        break;
      }
    }
    commit();
  }

  function scheduleTick(): void {
    window.clearTimeout(tick);
    const delay = document.hidden ? 5000 : TICK_MS - (Date.now() % TICK_MS) + 8;
    tick = window.setTimeout(() => {
      settleIfExpired();
      render(true);
      scheduleTick();
    }, delay);
  }

  const onDocumentPointerDown = (event: PointerEvent): void => {
    if (host.contains(event.target as Node)) {
      return;
    }
    widget.closeOverlays();
    if (!state.minimized) {
      state = { ...state, minimized: true };
      store.save();
      widget.setMinimized(true);
      render(false);
    }
  };

  const onVisibilityChange = (): void => {
    if (document.hidden) {
      audio.sync(state);
      return;
    }
    settleIfExpired();
    render(false);
    scheduleTick();
    audio.sync(state);
  };

  const onPageHide = (): void => {
    window.clearTimeout(tick);
    store.flush();
  };

  document.addEventListener('pointerdown', onDocumentPointerDown, { passive: true, capture: true });
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('pagehide', onPageHide, { once: true });

  render(false);
  scheduleTick();

  return {
    dispose(): void {
      window.clearTimeout(tick);
      document.removeEventListener('pointerdown', onDocumentPointerDown, true);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      widget.dispose();
      store.flush();
      audio.dispose();
      host.remove();
    }
  };
}

function unmount(): void {
  session?.dispose();
  session = null;
}

async function handleCommand(type: string): Promise<void> {
  if (type === COMMAND.hide) {
    unmount();
    return;
  }
  if (type === COMMAND.show) {
    session = await mount();
    return;
  }
  if (session) {
    unmount();
    return;
  }
  session = await mount();
}

// Registered synchronously so a command sent right after injection is not lost.
const FLAG = '__focusExeInjected';
const scope = globalThis as typeof globalThis & { [FLAG]?: boolean };

if (scope[FLAG] !== true) {
  scope[FLAG] = true;

  chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
    if (sender?.id !== chrome.runtime.id) {
      return false;
    }
    const type = (message as { type?: unknown } | null)?.type;
    if (typeof type !== 'string' || !COMMANDS.includes(type)) {
      return false;
    }

    const run = ready ? handleCommand(type) : Promise.resolve(queue.push(type));
    run.catch(error => console.error('[Focus Exe] Command failed.', error));
    sendResponse({ ok: true });
    return false;
  });

  void mount()
    .then(created => {
      session = created;
      ready = true;
      while (queue.length > 0) {
        void handleCommand(queue.shift() as string);
      }
    })
    .catch(error => {
      console.error('[Focus Exe] Startup failed.', error);
      document.getElementById(HOST_ID)?.remove();
    });
}


