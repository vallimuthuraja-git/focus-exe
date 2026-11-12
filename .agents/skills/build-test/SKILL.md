---
name: build-test
description: Build, typecheck, test, package, and run CI gates for Focus Exe.
condition: build | test | check | typecheck | package | verify
---

# Build & Test Workflow

## Commands

```bash
npm install              # install dependencies
npm run typecheck        # TypeScript --noEmit
npm run dev              # unminified build with inline sourcemaps
npm run build            # all browsers into dist/
npm run build:local      # build only installed browsers (stable dist/<browser>/)
npm run pack             # signed-ready .zip per browser
npm run verify           # typecheck + packaged build
npm run page             # render product page -> dist/page/
npm test                 # build (pretest), then run all test suites
node build.mjs --target=firefox   # one browser only
```

## Output Locations

- `dist/<browser>/` — authoritative build output (load unpacked here)
- `dist/focus-exe-<version>-<browser>.zip` — store-upload archives
- `dist/page/` — rendered product page for GitHub Pages
- `dist/.nojekyll` — Jekyll bypass marker for GitHub Pages

## Test Gates

`npm test` runs:
1. `pretest` — `node build.mjs` (builds all targets, writes dist/)
2. `test/run.mjs` — checks build artifacts, manifest content-script declaration, dist/<browser>/ mirrors
3. `test/page.mjs` — product page HTML validation
4. `test/worker.mjs` — service worker behavior
5. `test/smoke.mjs` — widget UI interactions (jsdom)

Suites load the **built** bundles from `dist/chrome/`, not source files.

## CI Workflow

- `.github/workflows/ci.yml` runs on push to `main` and pull requests
- Jobs: `check` (typecheck, test, package, upload artifacts, validate skills) + `deploy-page` (build page, upload Pages artifact, deploy)
- Action versions: checkout@v7, setup-node@v7, upload-artifact@v7, configure-pages@v6, upload-pages-artifact@v5, deploy-pages@v5

## Browser Detection (Local Builds)

`npm run build:local` detects installed browsers on Linux/Windows/macOS and builds only those targets into stable `dist/<browser>/` folders. Point each browser at its folder once; later builds overwrite in place.

## Troubleshooting

- **Typecheck fails**: check `tsconfig.json` strict settings, missing types in `node_modules/@types`
- **Build fails**: check `build.mjs` esbuild entry points, target compatibility (`chrome102`, `firefox115`, `safari16`)
- **Test fails**: check `test/run.mjs` for artifact checks, ensure `npm test` runs `pretest` first
- **Zip missing**: run `npm run pack` (requires `zip` binary on PATH)