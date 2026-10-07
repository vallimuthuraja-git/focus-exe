# Releases: changelog, version, tag, push

These invariants apply to **every** version update in this repo, with no exceptions:

1. **No version bump without a changelog entry, in the same commit.** Any change to the
   `version` field in `package.json` must land together with a new
   `## [x.y.z] - YYYY-MM-DD` section at the top of `CHANGELOG.md` (Keep a Changelog format:
   `### Added` / `### Changed` / `### Fixed` / `### Security`, plus `### Tests` when the check
   counts change). The `## [Unreleased]` section stays empty above it, and the compare-link
   definitions at the bottom of the file are extended in the same edit. The release is also
   mirrored into the product page's `#changelog` section in `page/index.html` — `test/page.mjs`
   fails if `v<x.y.z>` is missing there — and the README's check total is refreshed when the
   suites change size.
2. **No release push without an annotated tag.** The release commit is tagged `vX.Y.Z`
   (message wording: `Focus Exe X.Y.Z: <one-line summary>`) and pushed together with the
   branch: `git push origin main --follow-tags`.
3. **Keep the version in sync everywhere it lives.** Bump with
   `npm version <patch|minor|major> --no-git-tag-version`, which updates `package.json` and
   both `version` fields in `package-lock.json`. Never hand-edit a version string anywhere
   else — `build.mjs` reads `package.json` for `__VERSION__` and `__RELEASE_BASE__`.
4. **Gate on the suites.** `npm test` and `npm run verify` must pass before the bump is
   committed or pushed.

For the full release procedure — choosing the SemVer level, writing the changelog entry,
commit and tag wording, packing the zips, attaching the GitHub release assets, verifying the
remote tag — invoke the `/release` skill (`.cline/skills/release/SKILL.md`).
