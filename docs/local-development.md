<!-- DOC: human documentation. Do not read unless the user asks or the task requires it. -->

# Local Development

## The idea

The build system detects which browsers are actually installed on this OS — Linux, Windows 11 or
macOS — and builds only those targets into stable, version-less folders under `dist/<browser>/`.

## Commands

```bash
npm run build:local      # build installed browsers -> dist/<browser>/
npm run build            # all browsers -> dist/
npm run dev              # unminified build
npm run pack             # signed-ready .zip per browser
```

## Installed browsers detected

| Browser | Where | What to pick |
| --- | --- | --- |
| Chrome | `chrome://extensions` (developer mode) | *Load unpacked* → `dist/<browser>/` |
| Edge | `edge://extensions` | *Load unpacked* → `dist/<browser>/` |
| Brave | `brave://extensions` | *Load unpacked* → `dist/<browser>/` |
| Opera | ` opera://extensions` | *Load unpacked* → `dist/<browser>/` |
| Firefox | `about:debugging#/runtime/this-firefox` | *Load Temporary Add-on* → `dist/<browser>/manifest.json` |
| Safari (macOS, Xcode installed) | Xcode converter | `xcrun safari-web-extension-converter dist/<browser> --macos-only --no-open` |

## Workflow

1. Build the extension (as usual, all targets or installed only via `--local`).
2. Load the detected browser's folder once via its developer mode page.
3. On later builds, the browser picks up the newest code when reloaded — the folders are version-less and stable.

## Where it is implemented

- `build.mjs` — `--local`/`--detect` flag handling, per-OS browser detection (`BROWSER_LOCATIONS`, `installedBrowsers`).
- `build.mjs` — `createTargets()` returns per-browser targets; `--local` filters by installed browsers.
- `package.json` — `build:local` script.

## Rules

- **Only detected browsers are extracted.** The build never guesses; if nothing is found, fall back to all targets.
- **Detection never narrows the real build.** `npm run build` and `npm run pack` always produce every target, because a store upload must not depend on what happens to be installed on the build machine.
- **`dist/` is git-ignored**, so these folders are local-only and never ship.