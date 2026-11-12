---
name: changelog
description: Manage CHANGELOG.md per Keep a Changelog format for Focus Exe.
condition: changelog | release notes | version history
---

# Changelog Management

## Format

All notable changes follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/).

### Sections

- `### Added` — new user-facing features
- `### Changed` — changes to existing functionality
- `### Fixed` — bug fixes
- `### Security` — security-related changes
- `### Deprecated` — soon-to-be removed features (rare)
- `### Removed` — removed features (rare)

### Rules

- User-facing changes only — never add `### Tests` or `### CI` sections
- Check counts go in the commit message, not the changelog
- One section per release tag, entries are one-line bullets

## Adding a Release

### Moving Unreleased → Released

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- User-facing feature description

### Changed
- Behavioral change description

### Fixed
- Bug fix description
```

Then empty `## [Unreleased]` and update bottom comparison links:

```markdown
[Unreleased]: https://github.com/vallimuthuraja-git/focus-exe/compare/vX.Y.Z...HEAD
[X.Y.Z]: https://github.com/vallimuthuraja-git/focus-exe/compare/vPREV...vX.Y.Z
```

## page/index.html

No static edit needed — it loads `CHANGELOG.md` from GitHub at runtime via `loadChangelog()` fetching `raw.githubusercontent.com/.../main/CHANGELOG.md`.

## README.md

Update any check totals referenced (e.g. `"three suites (N checks)"`) if test counts changed.

## Date Format

Use ISO date: `YYYY-MM-DD` (e.g. `2026-11-13`).