---
name: release
description: Cut a Focus Exe release - bump the version, write the CHANGELOG.md entry, run the suites, tag vX.Y.Z, push with --follow-tags and attach the six platform zips. Use when bumping the version, cutting or publishing a release, tagging, or pushing a version update.
---

# Release

Cut a release for this repo. The always-on rule `.clinerules/releases.md` is authoritative:
**no version bump without a changelog entry in the same commit, and no release push without an
annotated `vX.Y.Z` tag.**

## 1. Prepare

- `git status` — start from a clean tree; do not release with unrelated uncommitted work mixed
  into the release commit.
- `git tag -l` and `git log <last-tag>..HEAD --oneline` — list everything since the last
  release. This list is what the changelog entry is written from.

## 2. Choose the SemVer level

- **patch** — fixes only (bug fixes, CI fixes; no new user-facing features).
- **minor** — new user-facing functionality, backwards compatible.
- **major** — breaking changes to the widget, the storage schema or the message contract.

## 3. Gate on the suites

- `npm test` (builds first via `pretest`, then the page/worker/smoke suites) and
  `npm run verify` (type-check + packaged build). Do not bump while either fails.

## 4. Bump the version

```bash
npm version <patch|minor|major> --no-git-tag-version
```

This updates `version` in **both** `package.json` and `package-lock.json` (top level and
`packages."".version`). Never hand-edit version strings anywhere else: `build.mjs` reads
`package.json` for `__VERSION__` and `__RELEASE_BASE__`.

## 5. Update CHANGELOG.md (same commit as the bump)

- Move everything under `## [Unreleased]` into a new `## [x.y.z] - YYYY-MM-DD` section directly
  below it (today's date, ISO `YYYY-MM-DD`), newest version first; leave `[Unreleased]` empty
  above the new section.
- Categorise with `### Added`, `### Changed`, `### Fixed`, `### Security` (add `### Tests` when
  the check counts changed). User-facing prose first, identifiers in backticks.
- Mirror the release onto the product page: prepend the new `vX.Y.Z` card (today's date,
  one-line bullets) to the `#changelog` section in `page/index.html`. `test/page.mjs` fails if
  the current `package.json` version is missing there.
- If the suites changed size, refresh the check total in `README.md` ("three suites (N checks)").
- Extend the link definitions at the bottom:

```markdown
[Unreleased]: https://github.com/vallimuthuraja-git/focus-exe/compare/vX.Y.Z...HEAD
[X.Y.Z]: https://github.com/vallimuthuraja-git/focus-exe/compare/vPREV...vX.Y.Z
```

## 6. Commit and tag

```bash
git add package.json package-lock.json CHANGELOG.md
git commit -m "Release vX.Y.Z: <one-line summary>"
git tag -a vX.Y.Z -m "Focus Exe X.Y.Z: <one-line summary>"
```

Tag messages follow the existing wording, e.g. `Focus Exe 1.0.1: fix the timer reading 0:00
after the first dismissal`.

## 7. Pack and push

```bash
npm run verify        # type-check + dist/ zips for all six browsers
git push origin main --follow-tags
gh release create vX.Y.Z dist/focus-exe-X.Y.Z-*.zip \
  --title "Focus Exe X.Y.Z" \
  --notes "$(awk '/^## \[X\.Y\.Z\]/{f=1;next} /^## \[/{f=0} f' CHANGELOG.md)"
```

If `gh` is unavailable, create the release in the GitHub UI and attach the six zips from
`dist/`.

## 8. Verify

- CI is green on the release commit.
- `git ls-remote --tags origin vX.Y.Z` shows the tag on the remote.
- The `## [Unreleased]` section in `CHANGELOG.md` is empty and ready for the next round.
