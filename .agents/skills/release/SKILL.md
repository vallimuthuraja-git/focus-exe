---
name: release
description: Bump version, update CHANGELOG.md and docs, run tests, tag vX.Y.Z, push, and publish GitHub release with platform zips.
condition: release | cut a release | publish v
---

# Release Workflow

Changelog rules: never bump a version without updating `CHANGELOG.md` in the same commit, user-facing changes only (no `### Tests` section), and never push a release without an annotated `vX.Y.Z` tag.

## 1. Pre-flight & SemVer
- Run `git status` to ensure a clean working tree.
- Run `git tag -l` and `git log <last-tag>..HEAD --oneline` to review changes since the last release.
- Choose SemVer level:
  - `patch`: Bug/CI fixes only.
  - `minor`: Backwards-compatible user-facing features.
  - `major`: Breaking changes to widget, storage schema, or message contract.

## 2. Test & Bump
- Run `npm test` (do not proceed if tests fail).
- Run `npm version <patch|minor|major> --no-git-tag-version` (updates `package.json` and `package-lock.json`; never hand-edit version strings).

## 3. Update Changelog & Docs
- Format per Keep a Changelog: user-facing changes only, group under `### Added`, `### Changed`, `### Fixed`, `### Security` (no `### Tests` section).
- **`CHANGELOG.md`**:
  - Move items from `## [Unreleased]` to `## [X.Y.Z] - YYYY-MM-DD` (today's ISO date), leaving `[Unreleased]` empty.
  - Group under `### Added`, `### Changed`, `### Fixed`, `### Security` (plus `Deprecated`/`Removed` if applicable). Put check counts in the commit message, not here.
  - Update bottom comparison links:
    ```markdown
    [Unreleased]: https://github.com/vallimuthuraja-git/focus-exe/compare/vX.Y.Z...HEAD
    [X.Y.Z]: https://github.com/vallimuthuraja-git/focus-exe/compare/vPREV...vX.Y.Z
    ```
- **`page/index.html`**: no static edit needed — it loads `CHANGELOG.md` from GitHub at runtime (`loadChangelog()` fetches `raw.githubusercontent.com/.../main/CHANGELOG.md`).
- **`README.md`**: Update the check total in `"three suites (N checks)"` if test counts changed.

## 4. Build, Verify & Commit
- Run `npm run verify` (type-checks and builds the 6 browser zips in `dist/` with the new version).
- Stage all modified release files, commit, and create an annotated tag:
  ```bash
  git add package.json package-lock.json CHANGELOG.md page/index.html README.md
  git commit -m "Release vX.Y.Z: <one-line summary>"
  git tag -a vX.Y.Z -m "Focus Exe X.Y.Z: <one-line summary>"
  ```

## 5. Publish & Post-Verify
- Push commit and tags: `git push origin main --follow-tags`
- Create GitHub release (if `gh` fails, instruct the user to upload `dist/focus-exe-X.Y.Z-*.zip` via GitHub UI):
  ```bash
  gh release create vX.Y.Z dist/focus-exe-X.Y.Z-*.zip \
    --title "Focus Exe X.Y.Z" \
    --notes "$(awk '/^## \[X\.Y\.Z\]/{f=1;next} /^## \[/{f=0} f' CHANGELOG.md)"
  ```
- Confirm `git ls-remote --tags origin vX.Y.Z` returns the tag and `## [Unreleased]` in `CHANGELOG.md` is empty.