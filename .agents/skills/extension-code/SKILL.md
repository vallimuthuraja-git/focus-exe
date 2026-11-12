---
name: extension-code
description: Understand the Manifest V3 extension architecture, file map, and core patterns for Focus Exe.
condition: code | extension | architecture | manifest | content script | background
---

# Extension Code Architecture

## Overview

Focus Exe is a Manifest V3 browser extension: a Pomodoro focus timer with deadline countdown, brown noise, and a 60 BPM metronome. The widget is in every tab and window of every browser on any site, synced through shared extension storage.

## File Map

```
src/config.ts        constants, limits, icon paths, message contract
src/browser.ts       promise wrappers over extension APIs (callback flavour = portable)
src/state.ts         state shape, sanitising, persistence (chrome.storage.local)
src/audio.ts         Web Audio: brown noise + look-ahead metronome scheduler
src/leadership.ts    single-audio cross-tab lease (one audible tab, silent followers)
src/clock.ts         mechanical split-flap digit reels
src/widget.ts        shadow-DOM shell, cards, controls, confirmations
src/settings.ts      settings panel: audio toggles + About/GitHub rows
src/settings.css     settings panel stylesheet
src/ui.ts            shared shadow-DOM builders (icon, button, lookup)
src/content.ts       content script: mounted on every top-level page, tick loop, state machine
src/background.ts    service worker: inject on summon, show completion notifications
src/manifest.ts      per-browser MV3 manifests
page/index.html      self-contained product page, bundled into every build
build.mjs            esbuild bundling, icon generation, page render, packaging
docs/                design notes: local-development workflow
test/                jsdom suites: page, worker, widget smoke
```

## Security Model

- **Least privilege**: Permissions are `storage`, `notifications`, `scripting` and `activeTab` — no `host_permissions` and no blanket `<all_urls>`. The content script is declared declaratively (`content_scripts.matches: ['<all_urls>']`) so the widget is present in every tab; `scripting` + `activeTab` remain as a fallback.
- **No remote code**: Everything ships in the package: no `eval`, no `new Function`, no CDN, no network calls, no `web_accessible_resources` exposed to pages.
- **Isolated by construction**: The UI lives in a closed shadow root, runs in the extension's isolated world and never touches page JavaScript. Nothing is written to `window`, so a page cannot read or drive the widget.
- **No injection sink**: The only `innerHTML` assigns one static template literal with no interpolation; every dynamic value is written with `textContent`.
- **Untrusted input is untrusted**: Everything read back from storage is re-validated and clamped (`sanitize`).
- **Message passing is sender-checked**: Both the service worker and content script ignore any message whose `sender.id` is not this extension.

## Build Targets

- chrome, edge, brave, opera, firefox, safari (Safari needs Xcode converter).
- Target compatibility: `chrome102`, `firefox115`, `safari16`.

## Key Invariants

- Widget uses closed shadow root (never page-accessible).
- Single-audio cross-tab lease (brown noise + metronome audible from exactly one tab).
- State lives in extension storage (`chrome.storage.local`), never page `localStorage`.
- All dynamic values written with `textContent` (no `innerHTML` interpolation).