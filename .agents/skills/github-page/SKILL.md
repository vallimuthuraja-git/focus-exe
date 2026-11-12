---
name: github-page
description: Build and deploy the GitHub Pages product page for Focus Exe.
condition: github page | pages | deploy site | product page
---

# GitHub Pages Workflow

## Product Page

The public site is a **single, self-contained product page** at `page/index.html` — no frameworks, no external fonts/images, no network requests.

### Build

```bash
npm run page   # renders page -> dist/page/
```

### Build-time Placeholders

`build.mjs` substitutes:
- `__VERSION__` — from `package.json`
- `__RELEASE_BASE__` — `${repoUrl}/releases/download/v${version}`
- `__REPO_URL__` — from `package.json` repository URL

### Donation & Support

The donation and support links are the one thing that must be filled in at the bottom of `page/index.html` (before that, links point at the platforms' home pages and show a setup note, so the page can never 404).

## GitHub Pages Deployment (Actions)

- **CI now uses GitHub Actions deployment** (`actions/configure-pages@v6`, `actions/upload-pages-artifact@v5`, `actions/deploy-pages@v5`).
- Source of artifact: `dist/page/` (the rendered product page).
- Deploy job condition: `github.ref == 'refs/heads/main'`.
- Permissions: `pages: write`, `id-token: write`.

## Legacy

The old `gh-pages` branch-based deployment is **obsolete** and will be retired.

## Verification

- Confirm `npm run page` produces `dist/page/index.html` with correct version.
- Confirm `dist/page/.nojekyll` exists.
- Check live site matches vX.Y.Z.