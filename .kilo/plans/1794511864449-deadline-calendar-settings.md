# Close confirmation + clean teardown

## Goal

Clicking the top-right red badge close button must ask for confirmation using the existing confirmation UI. Confirming must tear down the widget session completely and release per-session resources: timers, audio, leadership lease, document/window listeners, storage debounce, widget listeners, and DOM.

## Resolved decisions

- Reuse the existing confirmation flow (`pending`, `confirming-expanded` / `confirming-compact`) rather than a new dialog.
- Add `'close'` to `ActionKind` and use the confirmation message `"Close Focus Exe?"`.
- On confirm, `content.ts` `runAction('close')` calls the existing `unmount()` (which calls `session.dispose()` and clears the module-level session reference). No `commit()` for close; `dispose()` already flushes state.
- Remove the now-unused `onClose` hook from `WidgetHooks` and the `createWidget` options; the badge close no longer tears down directly.
- Keep the content-script `chrome.runtime.onMessage` listener and the `injected` flag: they are needed to re-summon the widget after close. Release all per-session resources only.
- Add the missing `window.removeEventListener('pagehide', onPageHide)` in the session `dispose()`; the existing dispose already removes the document pointerdown/visibilitychange listeners, clears the tick, flushes the store, disposes audio/leadership, disposes the widget, and removes the host.

## Affected files

- `src/widget.ts` — `ActionKind`, `WidgetHooks`, `messageFor`, badge-close wiring.
- `src/content.ts` — `createWidget` options, `runAction` close case, session `dispose()`.
- `test/smoke.mjs` — update badge-close tests; add cancel/confirm and resource-cleanup checks.

No CSS changes are required; the confirmation UI and badge styling already exist.

## Implementation tasks

### 1. `src/widget.ts`

- `export type ActionKind = 'toggle' | 'reset' | 'switch' | 'close';`
- Remove `onClose(): void;` and its doc comment from `WidgetHooks`.
- In `messageFor`, add before the toggle fallback:
  ```ts
  if (kind === 'close') {
    return 'Close Focus Exe?';
  }
  ```
- Replace the `closeBtn` click handler (`hooks.onGesture(); hooks.onClose();`) with:
  ```ts
  requestAction(closeBtn, 'close');
  ```
  `requestAction` already calls `preventDefault`, `stopPropagation`, `hooks.onGesture()`, and `request(kind)`.

### 2. `src/content.ts`

- Remove `onClose: () => unmount()` from the `createWidget({ ... })` options.
- In `runAction`, add before `commit()`:
  ```ts
  case 'close': {
    unmount();
    return;
  }
  ```
- In the returned session `dispose()`, add:
  ```ts
  window.removeEventListener('pagehide', onPageHide);
  ```
  Keep the existing cleanup: `window.clearTimeout(tick)`, remove the two `pointerdown` listeners and the `visibilitychange` listener, `widget.dispose()`, `store.flush()`, `audio.dispose()`, `leadership.dispose()`, `host.remove()`.

### 3. Tests (`test/smoke.mjs`)

- Update the badge-close test: click `.badge-close-button`; assert the confirmation state (`confirming-compact` when minimized) and that the host still exists; click the cancel button; assert the confirmation is cleared and the host remains; click the badge close again; click the confirm button; assert `!app.host()` and the state was flushed.
- Add an expanded-view check: expand the widget (click `.minimize-button` when minimized), click the badge close, assert `confirming-expanded` and the message `"Close Focus Exe?"`, click `.cancel-button`, assert cleared, then confirm via `.confirm-button` and assert `!app.host()`.
- Add a resource-cleanup check: after teardown, wrap `app.window.chrome.storage.local.set` to count writes, dispatch `pagehide` and `visibilitychange` on the window/document, and assert no new storage write occurs. The teardown flush happens before the wrapper, so any write after that means a listener survived.
- Keep the existing remount/toggle/hide tests.

### 4. Validation

- `npm run typecheck`
- `npm test`
- Manual browser pass: click the red badge, cancel and confirm the widget stays; click again, confirm and verify the widget disappears, audio stops, the timer stops updating, and the widget can be summoned again via the extension toggle/show.

## Risks / edge cases

- The badge close is outside the `.shell`; the confirmation renders inside the shell or the mini confirmation. The existing `request()` handles both; verify the compact confirmation is used when minimized.
- `request()` calls `closeOverlays()` before showing the confirmation, so settings/deadline/calendar pickers (including the calendar's window resize and shadow-root listeners) are closed first — this is part of the cleanup.
- `unmount()` sets the module-level `session = null`; if the `pagehide` listener is not removed, it retains the session closure (tick, store, audio, leadership, widget, host) until the page unloads. The new `removeEventListener` fixes that.
- Do not remove the content-script `chrome.runtime.onMessage` listener or the `injected` flag: they are required for re-summoning the widget after close.
- The confirmation `confirm()` calls `hooks.onAction('close')` → `runAction('close')` → `unmount()`; no `commit()` is called for close.
- When minimized, the compact confirmation has no message text (same as the other compact confirmations); the expanded confirmation shows `"Close Focus Exe?"`.

## Out of scope

- Changing the confirmation copy/style for other actions.
- Removing the content-script message listener or changing the summon/remount architecture.
- Changing the audio, leadership, or storage architecture beyond adding the missing `pagehide` removal and verifying the existing teardown.