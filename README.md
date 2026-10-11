# Focus Exe

A Manifest V3 browser extension: a Pomodoro focus timer with a deadline countdown, brown noise
and a 60 BPM neuro-metronome. The widget is in every tab and window of every browser on any
site, synced through shared extension storage.

> **v1.4.0** — released 2026-10-12. Full user-facing history: [CHANGELOG.md](CHANGELOG.md).
> Developer rules (releases, changelog, context discipline): [AGENTS.md](AGENTS.md).
> Design & workflow notes: [docs/hot-loading.md](docs/hot-loading.md),
> [docs/agent-contract.md](docs/agent-contract.md).

**Contents:** [Build](#build) · [Load locally](#load-it-locally) · [Hot-load](#hot-load-after-every-build) · [Test](#test) · [Config](#configuration) · [Product page](#product-page) · [Security](#security-notes) · [Roadmap](#roadmap) · [Changelog](#changelog)

## Features

- 25/5 focus and recovery modes, mechanical flip-clock digits, deadline countdown, session
  indicator with progress bar, session counter
- Brown noise and a 60 BPM look-ahead metronome that pauses with the tab
- Confirmation dialogs on every state change, minimise/expand, desktop notification when a
  session or break ends
- Single-tab audio lease: brown noise + metronome audible from exactly one tab, silent in
  every other tab
- Closed-shadow-root, isolated-world UI; never touches page JavaScript

## Build

```bash
npm install
npm run build        # all browsers into dist/
npm run dev          # unminified with inline sourcemaps
npm run hot          # build + extract only installed browsers to dist/hot/<browser>/
npm run pack         # signed-ready .zip per browser
npm run verify       # type-check + packaged build
npm test             # build, then run the suites in test/
npm run page         # render product page -> dist/page/
node build.mjs --target=firefox   # one browser only
```

`dist/<browser>/` is what you load, `dist/focus-exe-<version>-<browser>.zip` is what you upload.
Targets: chrome, edge, brave, opera, firefox, safari (Safari needs the Xcode converter).

## Load it locally

- **Chrome / Edge / Brave / Opera** — `chrome://extensions` → Developer mode → *Load unpacked* → `dist/<browser>/`
- **Firefox** — `about:debugging#/runtime/this-firefox` → *Load Temporary Add-on* → `dist/firefox/manifest.json`
- **Safari** — `xcrun safari-web-extension-converter dist/safari --macos-only --no-open`, then enable in Safari → Settings → Extensions

## Hot-load after every build

`npm run hot` builds, detects which browsers are installed on this OS, and extracts only those
bundles into stable, version-less folders under `dist/hot/<browser>/`. `npm test` also builds
with `--hot`. Point each browser at its folder once; every later `npm run hot` wipes and
refills those folders in place, so the browser picks up the newest code without re-picking the
folder. Full details: [docs/hot-loading.md](docs/hot-loading.md).

## Test

`npm test` builds (with `--hot`, refreshing the stable hot-load folders), then verifies the
build artifacts, that the manifest declares the all-URL content script (3 checks), that every
`dist/hot/` folder mirrors its built bundle (3 checks per detected browser), and runs three
suites (150 checks) in `test/`: `test/page.mjs`, `test/worker.mjs`, `test/smoke.mjs`. The
suites load the **built** bundles from `dist/chrome/`, so they check what actually ships.
`npm run verify` type-checks and packages but does not run the suites; `npm test` is the full
gate. CI runs both.

## Configuration

Everything tunable lives in `src/config.ts`: the deadline, focus/break lengths, metronome BPM,
volumes, widget widths and roll animation. The extension version follows `package.json`.

> `DEADLINE` is a build-time constant, not user-editable in v1. Move it by editing
> `src/config.ts` and rebuilding.

## Product page

The public site is a single, self-contained product page at `page/index.html` — no frameworks,
no external fonts/images, no network requests. It is bundled into every build at
`dist/<browser>/page/` so it works offline inside the extension, and it is what GitHub Pages
serves. Build-time placeholders substituted by `build.mjs`: `__VERSION__`,
`__RELEASE_BASE__`, `__REPO_URL__`. The donation and support links are the one thing you must
fill in at the bottom of `page/index.html` (before that, links point at the platforms' home
pages and show a setup note, so the page can never 404). CI renders the site with `npm run
page` on every push to `main`.

## Layout

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
build.mjs            esbuild bundling, icon generation, page render, packaging,
                     per-OS browser detection for dist/hot/ extraction
docs/                design notes: hot-loading workflow, project rules reference
test/                jsdom suites: page, worker, widget smoke
```

## Security notes

- **Least privilege.** Permissions are `storage`, `notifications`, `scripting` and
  `activeTab` — no `host_permissions` and no blanket `<all_urls>`. The content script is
  declared declaratively (`content_scripts.matches: ['<all_urls>']`) so the widget is present
  in every tab; `scripting` + `activeTab` remain as a fallback.
- **No remote code.** Everything ships in the package: no `eval`, no `new Function`, no CDN,
  no network calls, no `web_accessible_resources` exposed to pages.
- **Isolated by construction.** The UI lives in a closed shadow root, runs in the extension's
  isolated world and never touches page JavaScript. Nothing is written to `window`, so a page
  cannot read or drive the widget.
- **No injection sink.** The only `innerHTML` assigns one static template literal with no
  interpolation; every dynamic value is written with `textContent`.
- **Untrusted input is untrusted.** Everything read back from storage is re-validated and
  clamped (`sanitize`).
- **Message passing is sender-checked.** Both the service worker and content script ignore
  any message whose `sender.id` is not this extension.
- **Least exposure over convenience.** Timer state lives in extension storage, not in the
  page's `localStorage`.

## Roadmap

v1 is deliberately small. Likely v2 additions: editable focus/break lengths and deadline in
settings, per-tab vs global session stats, session history chart, custom sound packs, and an
optional "auto-open on this site" list.

## Changelog

Full version history in [CHANGELOG.md](CHANGELOG.md) — Keep a Changelog format, one section per
release tag, user-facing changes only.
