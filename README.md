# Focus Exe

A Manifest V3 browser extension: a Pomodoro focus timer with a deadline countdown, brown noise
and a 60 BPM neuro-metronome. The widget is present in every tab and window of every browser, on
any site, and stays in sync through shared extension storage.

## Using it

| Action | Result |
| --- | --- |
| Click the extension icon | Toggle the widget on the current page (show / hide) |
| `Alt+Shift+F` | Same, without leaving the keyboard (rebindable in your browser's shortcut settings) |
| Open settings | Audio toggles, plus *About & support* and *GitHub* (both open in a new tab) |
| Click anywhere on the page | Widget collapses to its compact bar |

Features: 25/5 focus and recovery modes, mechanical flip-clock digits, a countdown to the
deadline, session counter with progress bar, brown noise + metronome toggles, confirmations on
every state change, minimize/expand, audio from exactly one tab no matter how many are open
(closing the widget stops it, reopening it brings it back), and a desktop
notification when a session or break ends.

## Build

```bash
npm install
npm run build        # all browsers into dist/
npm run dev          # unminified with inline sourcemaps
npm run pack         # also writes a signed-ready .zip per browser
npm run verify       # type-check + packaged build
npm test             # build, then run the suites in test/
npm run page         # multi-page site only -> dist/site/
node build.mjs --target=firefox        # one browser only
```

`dist/<browser>/` is what you load, `dist/focus-exe-<version>-<browser>.zip` is what you upload.
Targets: `chrome`, `edge`, `brave`, `opera`, `firefox`, `safari` (Safari is built MV3 and needs
the Xcode converter, see below).

### Load it locally

- **Chrome / Edge / Brave / Opera** — `chrome://extensions` → enable *Developer mode* →
  *Load unpacked* → pick `dist/chrome` (or the matching folder).
- **Firefox** — `about:debugging#/runtime/this-firefox` → *Load Temporary Add-on* → pick
  `dist/firefox/manifest.json`. Temporary add-ons are removed on restart; for a permanent
  install, sign the zip with `web-ext sign`.
- **Safari** — `xcrun safari-web-extension-converter dist/safari --macos-only --no-open`,
  then enable the generated app extension in *Safari → Settings → Extensions*.

### Publish

- Chrome Web Store / Edge Add-ons: upload the zip from `npm run pack`.
- Firefox: `npx web-ext sign --source-dir dist/firefox` (needs an AMO API key), then upload
  the signed zip to addons.mozilla.org.
- Safari: ship through the App Store, the Xcode converter produces the Xcode project.

## Test

`npm test` builds, then `test/run.mjs` verifies the build artifacts and that the manifest declares
the all-URL content script (3 checks), and runs three suites (146 checks) in `test/`:

| Suite | Covers |
| --- | --- |
| `test/page.mjs` | the product page: no build placeholders, no external requests, no inline handlers, support-link resolution |
| `test/worker.mjs` | the service worker: inject-or-toggle, sender checks, fixed notification copy |
| `test/smoke.mjs` | the widget end to end in jsdom: mount, confirm, run, pause, settle, minimise, teardown, hostile storage |

The suites load the **built** bundles from `dist/chrome/`, not the TypeScript
sources, so they check what actually ships. `npm run verify` type-checks and
packages but does not run them; `npm test` is the full gate. CI runs both.

## Configuration

Everything tunable lives in `src/config.ts`: the deadline date, focus/break lengths, metronome
BPM, volumes, widget widths and roll animation. The extension version follows `package.json`.

> `DEADLINE` is a build-time constant and is not user-editable in v1. Once it passes, the widget
> counts down to `0` and stays there, because that is what the deadline you compiled means. Change
> the date in `src/config.ts` and rebuild to move it; an editable deadline is on the v2 list.

## Product page

The public site is a **multi-page** static site in `pages/`: Home (`index.html`),
About (`about.html`), Projects (`projects.html`) and Contact (`contact.html`),
sharing one stylesheet (`pages/assets/css/main.css`) and one script
(`pages/assets/js/main.js`). It is mobile-first, uses Lucide-style inline SVG
icons throughout, and is deployed to GitHub Pages.

`page/index.html` is a separate, **single self-contained** file — no frameworks,
no external fonts, no images, no network requests — that is bundled into every
build at `dist/<browser>/page/` so it works offline inside the extension
(`chrome-extension://<id>/page/index.html`). The test suite enforces that it
stays self-contained (no external resources), which is why the public site lives
in `pages/` and the extension page stays in `page/`.

Build-time placeholders are substituted by `build.mjs` in both:

| Placeholder | Replaced with |
| --- | --- |
| `__VERSION__` | `package.json` version |
| `__RELEASE_BASE__` | `<repo>/releases/download/v<version>` |
| `__REPO_URL__` | `package.json` repository URL |
| release history | `CHANGELOG.md` parsed to inline JSON (Projects page) |

The donation and support links are the one thing you must fill in: edit the
`SUPPORT` object in `pages/assets/js/main.js` (Buy Me a Coffee handle, GitHub
username, UPI id, PayPal link) and run `npm run build`. Until a handle is set,
the button keeps pointing at the platform's home page and shows a small setup
note, so the page can never 404.

Deploying the site: `npm run page` renders the multi-page site to `dist/site/`
(with its `assets/`), ready for GitHub Pages, Netlify, Cloudflare Pages or any
static host. CI publishes `dist/site/` to the `gh-pages` branch on every push
to `main`.

## Layout

```
src/config.ts     constants, limits, icon paths, message contract
src/browser.ts    promise wrappers over the extension APIs (callback flavour = portable)
src/state.ts      state shape, sanitising, persistence (chrome.storage.local)
src/audio.ts      Web Audio: brown noise + look-ahead metronome scheduler
src/leadership.ts single-audio cross-tab lease (one audible tab, silent followers)
src/clock.ts      mechanical split-flap digit reels
src/widget.ts     shadow-DOM shell, cards, controls, confirmations
src/widget.css    widget stylesheet
src/settings.ts   settings panel: audio toggles + About/GitHub rows
src/settings.css  settings panel stylesheet
src/ui.ts         shared shadow-DOM builders (icon, button, lookup)
src/content.ts    content script: mounted on every top-level page, tick loop, state machine
src/background.ts service worker: inject on summon, show completion notifications
src/manifest.ts   per-browser MV3 manifests
page/index.html   self-contained product page (bundled into every build)
pages/            multi-page public site (Home, About, Projects, Contact)
pages/assets/css  shared stylesheet (main.css)
pages/assets/js   shared interactivity (main.js)
build.mjs         esbuild bundling, icon generation, page + site render, packaging
test/             jsdom suites: page, worker, widget smoke
```

## Security notes

- **Least privilege.** Permissions are `storage`, `notifications`, `scripting` and `activeTab` —
  no `host_permissions` and no blanket `<all_urls>` permission. The content script is declared
  declaratively (`content_scripts.matches: ['<all_urls>']`) so the widget is present in every tab;
  `scripting` + `activeTab` remain as a fallback for pages where declarative injection is blocked.
  The widget runs in a
  closed shadow root in the extension's isolated world and never touches page JavaScript, so a
  site can neither read nor drive it.
- **No remote code.** Everything ships in the package: no `eval`, no `new Function`, no CDN, no
  network calls at all, and no `web_accessible_resources` exposed to pages.
- **Isolated by construction.** The UI lives in a closed shadow root, runs in the extension's
  isolated world and never touches page JavaScript. Nothing is written to `window`, so a page
  cannot read or drive the widget.
- **No page data, no injection sink.** The only `innerHTML` in the codebase assigns one static
  template literal with no interpolation; every dynamic value is written with `textContent`.
- **Untrusted input is treated as untrusted.** Everything read back from storage is re-validated
  and clamped (`sanitize`), so a tampered or corrupted record cannot break or hang the widget.
- **Message passing is sender-checked.** Both the service worker and the content script ignore
  any message whose `sender.id` is not this extension, and the worker only emits fixed
  notification copy, so no page or other extension can inject text into a notification.
- **Least exposure over convenience.** The timer state lives in extension storage, not in the
  page's `localStorage`, so the site can neither read it nor correlate it.

## Roadmap

v1 is deliberately small. Likely v2 additions: editable focus/break lengths and deadline in the
settings panel, per-tab vs global session stats, a session history chart, custom sound packs,
and an optional "auto-open on this site" list for people who want the widget everywhere without
summoning it.

## Changelog

The full version history lives in [CHANGELOG.md](CHANGELOG.md) — Keep a Changelog format, one
section per release tag from v1.0.0 on. Every version bump updates it in the same commit; the
invariant is in `.clinerules/releases.md` and the `/release` skill holds the complete release
checklist.
