<!-- DOC: human documentation. Do not read unless the user asks or the task requires it. -->

# Hot-loading the extension during development

`npm run hot` exists so a fix can be tested in a real browser within seconds of a build,
without re-picking folders in the browser's extension page after every version bump.

## The idea

1. Build the extension (as usual, all targets).
2. **Detect which browsers are actually installed** on this OS — Linux, Windows 11 or
   macOS — by looking for their binaries in the standard locations
   (`/usr/bin/...`, `%LOCALAPPDATA%`/`%PROGRAMFILES%`, `/Applications/...`). Safari counts
   only when the Xcode converter is present (`xcrun --find safari-web-extension-converter`),
   because without it there is no way to load the bundle.
3. **Extract only the detected browsers' bundles** into `dist/hot/<browser>/` — folders
   with **stable, version-less names** that never change across releases. Browsers that are
   not installed are skipped; a stale `dist/hot/<browser>` folder left over from a browser
   that has since been uninstalled is deleted on the next build.
4. You point each browser at its folder **once** (Chrome/Edge/Brave/Opera: *Load unpacked*;
   Firefox: *Load Temporary Add-on* pointing at `manifest.json`). Every later
   `npm run hot` — and every `npm test`, whose `pretest` builds with `--hot` — wipes and
   refills those folders **in place**, so the browser picks up the newest code on reload.
   The folder path is the contract; the version inside the manifest changes freely.

Yes — that is exactly the hot-load loop: build → reload the browser → test.

## Rules

- **Only detected browsers are extracted.** The build never guesses; if nothing is found
  (e.g. a bare CI container), `dist/hot/` stays empty and the build still succeeds.
- **Detection never narrows the real build.** `npm run build` and `npm run pack` always
  produce every target (`chrome`, `edge`, `brave`, `opera`, `firefox`, `safari`) and the
  release zips, because a store upload must not depend on what happens to be installed on
  the build machine.
- **`dist/hot/` is a copy, not the source.** The per-browser `dist/<browser>/` folders
  remain the authoritative build output; `dist/hot/` is derived from them each time.
- **`dist/` is git-ignored**, so these folders are local-only and never ship.

## One-time setup per browser

| Browser | Where | What to pick |
| --- | --- | --- |
| Chrome | `chrome://extensions` (developer mode) | *Load unpacked* → `dist/hot/chrome` |
| Edge | `edge://extensions` | *Load unpacked* → `dist/hot/edge` |
| Brave | `brave://extensions` | *Load unpacked* → `dist/hot/brave` |
| Opera | ` opera://extensions` | *Load unpacked* → `dist/hot/opera` |
| Firefox | `about:debugging#/runtime/this-firefox` | *Load Temporary Add-on* → `dist/hot/firefox/manifest.json` |
| Safari (macOS, Xcode installed) | Xcode converter | `xcrun safari-web-extension-converter dist/hot/safari --macos-only --no-open` |

After that, the loop is just:

```bash
npm run hot     # or npm test — both refresh dist/hot/ for this machine
# reload the extension in the browser (chrome://extensions ⟳, or re-run the temporary add-on)
```

## Where it is implemented

- `build.mjs` — `BROWSER_LOCATIONS` (per-OS candidate paths), `installedBrowsers()`,
  and the `--hot` step that wipes/extracts/prunes `dist/hot/`.
- `test/run.mjs` — checks that every extracted `dist/hot/<browser>` folder mirrors its
  `dist/<browser>` bundle (manifest and entry scripts) and maps to a real build target.
- `package.json` — `hot` script; `pretest` builds with `--hot` so the folders are always
  current for the test gate.
