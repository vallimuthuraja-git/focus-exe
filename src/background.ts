import { runtimeUrl } from './browser';
import { COMMAND, COMPLETE, PAGE_PATH, REPO_URL, type Mode } from './config';

const COPY: Record<Mode, { title: string; message: string }> = {
  focus: {
    title: 'Focus session complete',
    message: 'Take a short recovery break.'
  },
  break: {
    title: 'Break complete',
    message: 'Back to the next focus session.'
  }
};

function activeTabId(): Promise<number | null> {
  return new Promise(resolve => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const id = tabs?.[0]?.id;
      resolve(typeof id === 'number' ? id : null);
    });
  });
}

function sendToTab(tabId: number, type: string): Promise<boolean> {
  return new Promise(resolve => {
    chrome.tabs.sendMessage(tabId, { type }, () => {
      resolve(!chrome.runtime.lastError);
    });
  });
}

/**
 * The widget is declared as a content script that auto-runs in every top-level
 * page (see manifest `content_scripts`), so it is already mounted everywhere.
 * The toolbar click and shortcut therefore only need to toggle the active tab;
 * `sendToTab` carries that. The `executeScript` fallback covers pages where
 * declarative injection is blocked (e.g. the Chrome Web Store), where the
 * user gesture grants temporary `activeTab` access just in time.
 */
async function summon(tabId: number): Promise<void> {
  // A live listener means the script is already in this page: just toggle it.
  if (await sendToTab(tabId, COMMAND.toggle)) {
    return;
  }
  // Otherwise inject; the script mounts itself and listens for later commands.
  await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
}

async function toggleActiveTab(): Promise<void> {
  const tabId = await activeTabId();
  if (tabId === null) {
    return;
  }
  try {
    await summon(tabId);
  } catch (error) {
    console.warn('[Focus Exe] Could not open the widget on this page.', error);
  }
}

chrome.action.onClicked.addListener(tab => {
  if (typeof tab.id === 'number') {
    void summon(tab.id).catch(error => {
      console.warn('[Focus Exe] Injection blocked on this page.', error);
    });
  }
});

chrome.commands?.onCommand.addListener(command => {
  if (command === 'focus-exe-toggle') {
    void toggleActiveTab();
  }
});

let sequence = 0;

chrome.runtime.onMessage.addListener((message: unknown, sender) => {
  // Only messages from this extension's own content scripts are trusted.
  if (sender?.id !== chrome.runtime.id) {
    return false;
  }
  if (typeof message !== 'object' || message === null) {
    return false;
  }
  const payload = message as { type?: unknown; mode?: unknown };

  if (payload.type === COMMAND.about || payload.type === COMMAND.repo) {
    // The widget cannot open tabs itself, so it asks the worker to. The target
    // is a fixed URL chosen here, never one supplied by the message.
    const url = payload.type === COMMAND.repo ? REPO_URL : runtimeUrl(PAGE_PATH);
    chrome.tabs.create({ url }, () => void chrome.runtime.lastError);
    return false;
  }

  if (payload.type !== COMPLETE) {
    return false;
  }

  const mode: Mode = payload.mode === 'break' ? 'break' : 'focus';
  const copy = COPY[mode];

  chrome.notifications.create(
    `focus-exe-${mode}-${Date.now()}-${sequence++}`,
    {
      type: 'basic',
      iconUrl: runtimeUrl('icons/icon128.png'),
      title: copy.title,
      message: copy.message
    },
    () => void chrome.runtime.lastError
  );

  return false;
});
