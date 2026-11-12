# AGENTS.md — Project Map for Focus Exe

## Project

Focus Exe — Manifest V3 browser extension: Pomodoro timer, deadline countdown, brown noise, 60 BPM metronome. Widget present in every tab via content script, synced through shared extension storage.

## Commands

```bash
npm install
npm run typecheck        # tsc --noEmit
npm test                 # build (pretest), run all suites
npm run dev             # unminified build
npm run build            # all browsers -> dist/
npm run build:local      # installed browsers only -> dist/<browser>/
npm run pack             # .zip per browser
npm run verify           # typecheck + pack
npm run page             # render product page -> dist/page/
```

## Invariants

- Widget uses closed shadow root; never page-accessible; never writes to `window`.
- No remote code: no eval, no new Function, no CDN, no network calls.
- No injection sink: only static template literal via innerHTML; dynamic values via textContent.
- State in chrome.storage.local; never page localStorage.
- Message passing sender-checked (sender.id must equal extension id).

## Versioning

- Bump via `npm version <patch|minor|major> --no-git-tag-version`.
- Update `CHANGELOG.md` in same commit; user-facing only; Keep a Changelog groups.

## File Map

```
src/config.ts        constants, limits, icon paths, message contract
src/browser.ts       promise wrappers over extension APIs
src/state.ts         state shape, sanitising, persistence
src/audio.ts         Web Audio: brown noise + look-ahead metronome
src/leadership.ts    single-audio cross-tab lease
src/clock.ts         mechanical split-flap digit reels
src/widget.ts        shadow-DOM shell, cards, controls, confirmations
src/settings.ts      settings panel: audio toggles + About/GitHub rows
src/settings.css     settings panel stylesheet
src/ui.ts            shared shadow-DOM builders
src/content.ts       content script: mounted on every top-level page, tick loop, state machine
src/background.ts    service worker: inject on summon, show completion notifications
src/manifest.ts      per-browser MV3 manifests
page/index.html      self-contained product page, bundled into every build
build.mjs            esbuild bundling, icon generation, page render, packaging
docs/                design notes: local-development workflow
test/                jsdom suites: page, worker, widget smoke
AGENTS.md            this file
```

## Skill Routing

| User Intent | Skill |
| --- | --- |
| release, cut a release, publish v | `.agents/skills/release/SKILL.md` |
| build, test, check, typecheck, package | `.agents/skills/build-test/SKILL.md` |
| changelog, release notes, version history | `.agents/skills/changelog/SKILL.md` |
| github page, pages, deploy site, product page | `.agents/skills/github-page/SKILL.md` |
| code, extension, architecture, manifest | `.agents/skills/extension-code/SKILL.md` |
| write skill, create skill, new skill | `.agents/skills/skill-authoring/SKILL.md` |
| commit .kilo plans as history (human-only, AI must not run) | `.agents/skills/kilo-history/SKILL.md` |

## Validation

Run `node scripts/validate-skills.mjs` after adding or changing any skill in `.agents/skills/`.