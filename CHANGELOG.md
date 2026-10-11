# Changelog

All notable changes to Focus Exe are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.4.0] - 2026-10-12

### Added

- Badge-style close button on widget (visible on hover/touch)
- Changelog now loads from GitHub at runtime — no rebuild needed for updates

### Changed

- Local builds (`npm run build:local`) now create stable folders in `dist/<browser>/` — no separate `dist/hot/` needed
- Page served from `dist/page/` (GitHub Pages); extension packages no longer include page assets

### Removed

- `dist/hot/` folder and `--hot` flag
- Build-time changelog parsing (was `src/changelog.ts`)

## [1.3.1] - 2026-10-12

### Changed

- Changelog fetches from GitHub at runtime (raw.githubusercontent.com)
- Removed build-time changelog injection

## [1.3.0] - 2026-10-07

### Added

- Bullseye icon for focus session counter
- Single-audio cross-tab lease: brown noise and metronome play from only one tab

### Changed

- "About & support" now opens GitHub repository
- Product page renders changelog from embedded JSON (now replaced by runtime fetch)

### Fixed

- Reopening widget no longer silent or duplicating audio

## [1.2.0] - 2026-10-06

### Added

- Auto-minimize on outside click (persists state)
- Widget now present in every tab via content script (no host permission)

### Changed

- Audio toggle state syncs across minimized/expanded views

### Fixed

- Audio toggles stay in sync on every render

## [1.1.2] - 2026-09-27

### Added

- Changelog section on product page with version check in tests
- Documented release process and `/release` skill

### Changed

- Brown noise and metronome continue in background tabs
- Reopened widget restores audio session
- Package-lock version sync fixed
- Product page copy updated for background audio behavior

## [1.1.1] - 2026-09-27

### Fixed

- Countdown digit roll animation works with reduced-motion settings

### Added

- Release builds with six platform zips attached to GitHub releases

## [1.1.0] - 2026-09-27

### Added

- About & support and GitHub links in settings panel (both views)

### Changed

- Settings panel restructured: audio toggles + links, full-width button rows
- Settings code split: `ui.ts`, `settings.ts`, `settings.css`
- Repo URL injected from package.json (single source of truth)

### Fixed

- GitHub Pages deploy permissions

## [1.0.1] - 2026-09-27

### Fixed

- Timer no longer reads 0:00 on re-summon
- Start no longer creates zero-length sessions with bogus notifications

### Added

- Test suites committed (109 checks)
- Tests derive version from package.json
- MIT LICENSE file
- CI pipeline: type-check, test, package, artifact upload, page deploy

## [1.0.0] - 2026-09-27

First release: pre-exam focus userscript → Manifest V3 extension.

### Added

- Summon on demand (toolbar or `Alt+Shift+F`), injected via `activeTab` + `scripting`
- 25/5 focus & recovery modes, persisted state, split-flap clocks, deadline countdown
- Session counter, progress bar, confirmations, minimize/expand, notifications
- Web Audio brown noise + 60 BPM metronome
- Security: closed shadow root, no network calls, no remote code, extension storage
- 6-browser builds (Chrome, Edge, Brave, Opera, Firefox, Safari) with zips
- Self-contained product page (hero, features, install steps, privacy, roadmap, support, FAQ)
- Support links (Coffee, Sponsors, UPI, PayPal) with safe fallbacks

---

[Unreleased]: https://github.com/vallimuthuraja-git/focus-exe/compare/v1.4.0...HEAD
[1.4.0]: https://github.com/vallimuthuraja-git/focus-exe/compare/v1.3.1...v1.4.0
[1.3.1]: https://github.com/vallimuthuraja-git/focus-exe/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/vallimuthuraja-git/focus-exe/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/vallimuthuraja-git/focus-exe/compare/v1.1.2...v1.2.0
[1.1.2]: https://github.com/vallimuthuraja-git/focus-exe/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/vallimuthuraja-git/focus-exe/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/vallimuthuraja-git/focus-exe/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/vallimuthuraja-git/focus-exe/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/vallimuthuraja-git/focus-exe/releases/tag/v1.0.0