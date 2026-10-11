# Changelog Management

**Context on demand:** read this rule only when preparing a release, changing a public API,
or modifying user-facing features — the same moments you would open `CHANGELOG.md` itself.
For everything else, `CHANGELOG.md` stays untouched (and is itself read on demand, not by
default).

## Standard

Maintain `CHANGELOG.md` at the repository root using the **Keep a Changelog** standard and
**Semantic Versioning (SemVer)**. Always order entries chronologically with the newest
version at the top.

## When to update

- **Update ONLY for user-facing changes:** new features, bug fixes, breaking changes,
  deprecations, and security patches.
- **Do NOT update for internal changes:** refactors, typo fixes, test updates, internal
  dependency bumps, or performance updates with no behavioural shift.

This repo has no deprecation or removal workflow, so `### Deprecated` and `### Removed` are
reserved sections: use them only if one of those situations actually arises.

## Formatting structure

Group entries under the latest version headers using ISO 8601 dates
(`## [Version] - YYYY-MM-DD`). Use exactly these subheadings:

- `### Added` — new features.
- `### Changed` — changes in existing functionality.
- `### Deprecated` — soon-to-be-removed features.
- `### Removed` — now-removed features.
- `### Fixed` — bug fixes.
- `### Security` — vulnerability fixes.

No other subheadings. In particular **no `### Tests` section**: test counts and suite
changes are internal and belong in the commit message, never in the changelog. (The
historical `### Tests` sections kept so far are frozen release history — leave them as
they are; new entries must not add more.)

Between releases, keep everything under `## [Unreleased]`, empty otherwise. The product
page parser (`src/changelog.ts`) skips `[Unreleased]` and ignores any subheading outside
the list above, so an empty or draft section never ships.

## Writing constraints

- **Human-centric:** write in clear, concise language. State the *what* and the *why*,
  not just the *how*.
- **No git dumps:** never copy-paste raw commit hashes or messages.
- **No vague phrases:** do not write "miscellaneous fixes". Explicitly state what
  changed.
- Identifiers (file names, commands, settings keys) go in backticks; prose first.
