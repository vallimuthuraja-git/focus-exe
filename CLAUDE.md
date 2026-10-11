# Focus Exe — agent rules

Always-on, human-authored pointers for anyone (or any agent) working in this repository.
The full rule texts live in `docs/project-rules.md`; follow these invariants without
needing the whole document.

## Releases

- No version bump without a changelog entry, in the same commit.
- No release push without an annotated `vX.Y.Z` tag (`git push origin main --follow-tags`).
- Bump only with `npm version <patch|minor|major> --no-git-tag-version` — never hand-edit
  version strings.
- `npm test` and `npm run verify` must pass before a bump is committed or pushed.
- Mirror the release into `page/index.html` (`#changelog`) and refresh the README check
  total when the suites change size.

## Changelog

- `CHANGELOG.md`: Keep a Changelog + SemVer, newest first, ISO `## [x.y.z] - YYYY-MM-DD`.
- It stays at the **repository root** and is the single source of truth: consumers read it
  by stable reference (build-time JSON injection, or raw/jsDelivr/GitHub-API URL at
  runtime) — never by copying history into other files.
- **README and CHANGELOG stay separate**: the README links to the changelog at the bottom
  and never pastes history into it. An optional "latest release only" snippet must sit
  between `<!-- CHANGELOG-START -->` / `<!-- CHANGELOG-END -->` markers and be rewritten
  by tooling, never by hand.
- User-facing changes only — never refactors, test updates or internal dependency bumps.
- Subheadings: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`. No others
  (in particular no `### Tests`).
- Human-centric prose, what and why over how; no commit hashes, no vague phrases.
- Read `CHANGELOG.md` on demand only — when preparing a release, changing a public API, or
  modifying user-facing features.

## Development

- Build for local testing with `npm run hot`: it detects the browsers installed on this OS
  (Linux/Windows/macOS) and extracts only those bundles into stable `dist/hot/<browser>/`
  folders for one-time "Load unpacked" pointing; later builds hot-load. Full flow:
  `docs/hot-loading.md`.
- The suites run against the built bundles in `dist/`, not the TypeScript sources.
