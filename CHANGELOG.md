# Changelog

All notable changes to Focus Exe are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow
[Semantic Versioning](https://semver.org/). One section per release tag, newest first. Every
version bump updates this file in the same commit that lands the bump — the invariant lives in
`.clinerules/releases.md`, and the `/release` skill holds the full checklist.

## [1.2.0] - 2026-10-06

### Added

- Auto-close on blur: the widget now minimizes back to its default state whenever the user
  clicks anywhere outside the application's UI boundary while it is expanded. The expanded
  width, minimize/expand icon, and accessibility attributes all return to the default state,
  and the minimized flag is persisted. Clicking the dedicated "Expand" button restores the
  expanded state.
- The pre-released widget-on-every-tab change shipped: the content script is declared in the
  manifest with `content_scripts` and `matches: ['<all_urls>']`, so the widget is present in
  every top-level tab without a blanket host permission. The toolbar toggle and
  `Alt+Shift+F` shortcut still toggle it on the current page only.

### Changed

- The content-script match pattern (`content_scripts` with `<all_urls>`) ships as the new
  default: the widget is present in every top-level tab of every browser, not just the one
  the user summoned it on. The strict on-demand `activeTab` model is relaxed — no blanket
  `<all_urls>` *permission* is requested, only the content-script match pattern.
- The audio toggle state (`brownNoise`/`metronome`) is synced on every render, so the
  minimized and expanded views stay in sync with stored settings.

### Fixed

- The `syncInputs` helper was referenced in `render()` but missing from the widget module;
  it is now defined so the audio toggle inputs stay in sync on every render.

### Tests

- 146/146 checks: `test/run.mjs` verifies the built `manifest.json` declares the all-URL
  content script and keeps `<all_urls>` out of `permissions` (3 manifest checks), plus the
  three suites (page 31, worker 20, smoke 92).

## [1.1.2] - 2026-09-27

### Added

- A changelog section on the product page (`#changelog`, in the nav): the release history from
  v1.0.0 condensed into one card per version, linked to the full `CHANGELOG.md` in the
  repository. `test/page.mjs` fails if the current `package.json` version is missing from it, so
  a release can no longer ship with a stale page.
- The release process, written down: `.clinerules/releases.md` (the always-on rule — no version
  bump without a changelog entry in the same commit, no release push without an annotated tag)
  and the `/release` skill (`.cline/skills/release/SKILL.md`) with the full checklist.

### Changed

- Brown noise and the 60 BPM metronome keep playing while the tab is in the background instead of
  pausing: the metronome queues up to 75 s of beats on the audio clock while the tab is hidden
  (hidden tabs get their timers clamped to once a minute), never schedules a beat in the past,
  and fades the queued backlog out on stop or mode switch so the tail is never an audible click.
  A suspended `AudioContext` resumes and re-applies the sounds the moment the browser allows it,
  and any page gesture unlocks it.
- Reopening the widget pushes the running session into the brand-new audio engine, so a reopened
  panel is no longer silent.
- `package-lock.json`'s two `version` fields are kept in sync with `package.json` again (they
  had drifted to 1.0.0).
- The product page's *How it works* copy no longer claims the audio pauses when the tab is
  hidden.

### Tests

- 141/141 checks (page 31, worker 20, smoke 90).

## [1.1.1] - 2026-09-27

### Fixed

- The countdown digits always run their 540 ms mechanical roll again. Two
  `prefers-reduced-motion` gates added during the userscript conversion — `render()` passing
  `animate && !reducedMotion`, plus a 1 ms `@media (prefers-reduced-motion: reduce)` override —
  collapsed the roll to a snap whenever the desktop ran with animations disabled (e.g. GNOME
  `org.gnome.desktop.interface enable-animations = false`). The roll is now unconditional in
  both places; reduced-motion still applies to the pop-button, progress-bar and settings-panel
  transitions. Measured in a real Chrome build before/after: 0.001 s with no visible travel →
  the full 540 ms roll with the reel moving one digit cell.

### Changed

- Release build: version bump plus the six platform zips (chrome, edge, brave, opera, firefox,
  safari) attached to the GitHub release.

## [1.1.0] - 2026-09-27

### Added

- *About & support* and *GitHub* rows inside the settings panel; each opens in a new tab via
  the service worker (the widget cannot create tabs itself, and the worker maps the target to a
  URL it chooses — no URL is ever taken from the message). Both rows are reachable whether the
  widget is expanded or minimised, because the panel is built once per view.

### Changed

- The ⓘ *About Focus Exe* button in the widget header — the one control the compact bar could
  not reach — moved into the settings panel, joined by the GitHub row. Each link row is a
  full-width button mirroring the toggle-row layout, so the whole strip is one target.
- The panel is titled *Settings* rather than *Audio settings*, and accessible names begin with
  the visible row text (WCAG 2.5.3).
- Settings code split out of the widget: `src/ui.ts` (shared shadow-DOM builders),
  `src/settings.ts` (the panel), `src/settings.css` (panel styles). `src/widget.ts` keeps the
  shell, cards, controls and confirmations.
- The repo URL is injected from `package.json` by `build.mjs` — a single source of truth with
  the product page — and the panel is driven by data (TOGGLES/LINKS) rather than a hand-built
  fragment.
- `ActionKind` loses `'about'` in favour of a dedicated `onOpen(target)` hook.

### Fixed

- The page deploy job is granted `contents: write`: the default `GITHUB_TOKEN` is read-only, so
  the push to `gh-pages` failed with *"Permission to vallimuthuraja-git/focus-exe.git denied to
  github-actions[bot]"*.

### Tests

- 131/131 checks (page 30, worker 20, smoke 81), up from 110.

## [1.0.1] - 2026-09-27

### Fixed

- The timer no longer reads `0:00` on any re-summon, and Start no longer builds a zero-length
  session that settles immediately and fires a bogus "Focus session complete" notification.
  `sanitize()` used `Number.isFinite(Number(x))` to detect a stored number, but `Number(null)`,
  `Number('')` and `Number([])` are all `0`, so the app's own `remaining: null` (written on
  every settle, reset and start) passed the guard and became `0`. `reconcile()` also settled a
  stored `running:true/endAt:null` record — exactly the corruption `sanitize()` exists to
  reject. `finiteOrNull()` now accepts only a real finite number for `endAt` and `remaining`,
  and `clampNumber` no longer coerces either, so non-numeric input falls back instead of
  silently becoming `0`.

### Added

- The test suites are now tracked in the repo: the 109 checks that "passed" before lived only
  in `/tmp` and were never committed — the gap that let this ship. `npm test` builds first
  (`pretest`) and carries regression cases for all four symptoms, confirmed failing before the
  fix and passing after.
- `test/page.mjs` no longer hard-codes v1.0.0: the release-asset checks derive `repoUrl` and
  `version` from `package.json` exactly as `build.mjs` does, and a new check asserts every
  download sits under the current release.
- MIT `LICENSE` file — `package.json` already declared MIT and the product page footer
  advertised it, but there was no licence text, so GitHub reported "no licence" and the repo
  was legally all-rights-reserved.
- CI: type-check, test, package, artifact upload, and deploy of the product page to `gh-pages`
  on `main`.
- Documentation for the test suites, and a note that `DEADLINE` is a build-time constant that
  counts down to 0 and stays there once it passes.

### Tests

- 110/110 checks (page 30, worker 17, smoke 63) against the built bundles.

## [1.0.0] - 2026-09-27

First release: the pre-exam focus userscript converted into a production Manifest V3
extension.

### Added

- Summoned on demand from the toolbar or `Alt+Shift+F` on any site; injected with `activeTab` +
  `scripting` and torn down on dismiss, so no blanket host permission is requested and the
  widget has no access until you summon it yourself.
- 25/5 focus and recovery modes with persisted state in `chrome.storage.local`, mechanical
  split-flap digit clocks, deadline countdown, session counter with progress bar,
  confirmations, minimise/expand, and a desktop notification when a session or break ends
  (emitted only by a sender-validated service worker that only ever writes fixed copy).
- Web Audio brown noise plus a look-ahead 60 BPM metronome scheduler that pauses with the tab.
- Security posture: closed shadow root, static-only `innerHTML`, sanitised storage reads, no
  network calls, no remote code, and the timer state kept in extension storage rather than the
  page's `localStorage`.
- esbuild pipeline emitting chrome, edge, brave, opera, firefox and safari builds with
  generated icons and per-browser zips.
- A self-contained product page (hero, features, how it works, per-browser install steps,
  privacy, roadmap, support, FAQ) bundled at `dist/<browser>/page/` in every build, plus a
  widget info button that asks the service worker to open it in a new tab. No frameworks,
  fonts, images or network requests: icons are inline SVG, the favicon a data URI, and
  `__VERSION__`, `__RELEASE_BASE__` and `__REPO_URL__` are substituted at build time
  (`npm run page` renders a standalone copy to `dist/page/index.html` for static hosting).
- Support links (Buy Me a Coffee, GitHub Sponsors, UPI, PayPal) with a safe fallback: until a
  handle is configured they point at the platform's home page and show a setup note, so a
  missing handle can never produce a dead link.

### Changed

- Removed every trace of the original site binding: the legacy Skilljar host-id cleanup list,
  the reference userscript (still in history at `400c7fe`), and platform names in the project
  description.
- Dropped the unused limit table; notifications now carry unique ids.
- The advertised download size was corrected to ~32 KB, then ~33 KB, to match the rebuilt zips.

### Fixed

- Product page layout and touch UI, found in a real-browser audit at 11 viewport widths
  (320–1920 px): grid items no longer stretch their track (`.grid > * { min-width: 0 }`),
  `scroll-padding-top` keeps anchored sections clear of the sticky header, the skip link no
  longer widens the scrollable area, the nav becomes a swipeable strip below 900 px instead of
  disappearing, tap targets reach 44 px on touch (35 px otherwise), the button lift only
  applies under `@media (hover: hover)` so it cannot stick after a tap, the support card's
  UPI/PayPal pair stops wrapping into stacked bars, the UPI button label matches what it does
  (*Pay with UPI*, with the id shown beside it for copying), an unconfigured PayPal shows a
  setup note instead of failing silently, and `og:`/`twitter:` share metadata was added.

[1.2.0]: https://github.com/vallimuthuraja-git/focus-exe/compare/v1.1.2...v1.2.0

[Unreleased]: https://github.com/vallimuthuraja-git/focus-exe/compare/v1.2.0...HEAD
[1.1.2]: https://github.com/vallimuthuraja-git/focus-exe/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/vallimuthuraja-git/focus-exe/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/vallimuthuraja-git/focus-exe/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/vallimuthuraja-git/focus-exe/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/vallimuthuraja-git/focus-exe/releases/tag/v1.0.0

