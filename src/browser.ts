/**
 * Thin promise wrappers over the extension APIs we use.
 * `chrome.*` with callbacks is the only flavour supported by every target
 * (Chrome, Edge, Opera, Brave, Firefox, Safari), so it is the only one used.
 */

function fromCallback<T>(run: (done: (value: T) => void) => void): Promise<T | null> {
  return new Promise<T | null>(resolve => {
    try {
      run(value => resolve(value));
    } catch (error) {
      console.warn('[Focus Exe] Extension API call failed.', error);
      resolve(null);
    }
  });
}

export async function readStorage<T>(key: string): Promise<T | null> {
  const result = await fromCallback<Record<string, unknown>>(done => {
    chrome.storage.local.get(key, items => done(items));
  });
  const value = result?.[key];
  return typeof value === 'object' && value !== null ? (value as T) : null;
}

export async function writeStorage(key: string, value: unknown): Promise<boolean> {
  const error = await fromCallback(done => {
    chrome.storage.local.set({ [key]: value }, () => done(chrome.runtime.lastError));
  });
  return !error;
}

export async function sendMessage(message: unknown): Promise<void> {
  await fromCallback(done => {
    chrome.runtime.sendMessage(message, () => done(chrome.runtime.lastError));
  });
}

export function runtimeUrl(path: string): string {
  return chrome.runtime.getURL(path);
}
