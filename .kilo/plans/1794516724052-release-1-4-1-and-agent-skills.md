# Release v1.4.1: Deadline Picker + Close Confirmation + Universal Agent Skills + CI Modernization

## Goal
Release v1.4.1 patch with deadline picker and close confirmation features, build six browser zips, update CHANGELOG and GitHub Pages, modernize CI to GitHub Pages Actions, and establish universal Agent Skills under `.agents/skills/` with a validator.

## Resolved Decisions

### Versioning
- **v1.4.1 patch** (user chose patch over minor for deadline picker + close confirmation).
- Bump `package.json` version from 1.4.0 → 1.4.1.
- CHANGELOG section: `[1.4.1] - 2026-11-13` with Added/Changed/Fixed entries.
- Tag `v1.4.1`, release with six browser zips.

### GitHub Pages Deployment
- **Migrate to GitHub Actions Pages deployment** using `actions/configure-pages@v6`, `actions/upload-pages-artifact@v5`, `actions/deploy-pages@v5`.
- Artifact source: `dist/page/` (written by `npm run page`).
- Legacy `gh-pages` branch will become obsolete (no longer maintained).

### AI Skills Organization
- **Universal Agent Skills spec**: `.agents/skills/<name>/SKILL.md` (flat, lowercase, hyphenated).
- **Six task-scoped skills**:
  1. `release` — bump version, CHANGELOG, tag, release
  2. `build-test` — typecheck, test, package, CI gates
  3. `changelog` — CHANGELOG format rules, Keep a Changelog, compare links
  4. `github-page` — product page build, `npm run page`, GitHub Pages deploy
  5. `extension-code` — MV3 architecture, file map, content-script/background separation
  6. `skill-authoring` — how to write new SKILL.md files
- **AGENTS.md** (new) — project summary, commands, invariants, file map, skill routing table.
- **Validator**: `scripts/validate-skills.mjs` checks frontmatter format (name, description) for every `.agents/skills/*/SKILL.md`.
- **Legacy removal**: `git rm -r .cline` after migrating its content to `.agents/skills/release/SKILL.md`.

### CI Modernization
- **Action versions bumped**:
  - `actions/checkout@v7` (from v4)
  - `actions/setup-node@v7` (from v4)
  - `actions/upload-artifact@v7` (from v4)
  - `actions/configure-pages@v6` (new)
  - `actions/upload-pages-artifact@v5` (new)
  - `actions/deploy-pages@v5` (new)
- **Split `publish-page` into two jobs**:
  1. `check` — type-check, test, package, upload artifacts
  2. `deploy-page` — build page, upload Pages artifact, deploy
- **Add `validate:skills`** step in `check` job (runs `node scripts/validate-skills.mjs`).
- **Remove `contents: write` permission** from `publish-page` job (not needed for Pages Actions).
- **Add `pages: write` and `id-token: write` permissions** to `deploy-page` job.

### Docs and Project Structure
- **Replace `docs/hot-loading.md` → `docs/local-development.md`**:
  - Describe current workflow: `npm run build:local` creates stable `dist/<browser>/` folders.
  - Remove all references to `dist/hot/`, `npm run hot`, `--hot` flag.
  - Explain browser detection (`--local` / `--detect` flag filters targets to installed browsers).
  - Add one-time setup per browser (Load unpacked, Temporary Add-on, Xcode converter).

- **Update `README.md`**:
  - Remove `npm run hot` references (lines 30-31, 48-54).
  - Remove stale test count `150` (line 61).
  - Update dead link `docs/agent-contract.md` → `AGENTS.md` (line 10).
  - Add "Agent Skills" section pointing to `.agents/skills/`.
  - Update roadmap: mention deadline picker, close confirmation in v1.4.1 (lines 130-132).
  - Update feature list: add "Editable deadline picker in settings", "Confirmation on close".

- **Update `page/index.html`**:
  - Hero section: mention deadline picker.
  - Features list: add "Editable deadline picker", "Close confirmation".
  - FAQ: add "Can I change my deadline?" / "Does closing the widget stop the timer?".
  - Roadmap: move deadline picker to "Released".

- **Update `build.mjs`**:
  - Remove unused `relative` import (line 5).
  - Remove stale comments about `dist/hot/` (lines 231-240).
  - Write `dist/page/.nojekyll` (already done in line 360, but add explicit comment).

### Release Workflow
Two commits before release:
1. `feat: deadline picker + close confirmation` — commit all feature code, tests, config.
2. `chore: standardize agent skills + CI + docs` — commit `.agents/`, `AGENTS.md`, CI, docs, README, CHANGELOG, page updates.
3. Release commit: `npm version patch --no-git-tag-version` (bumps package.json, package-lock.json).
4. Tag: `git tag v1.4.1`, push main + tag.
5. Create GitHub release with six zips.

## Affected Files

### Feature Code (already staged)
- `src/calendar.ts` — new file (deadline calendar picker)
- `src/config.ts` — deadline date handling
- `src/content.ts` — deadline picker wiring, close confirmation teardown
- `src/settings.ts` — deadline picker UI, settings panel updates
- `src/state.ts` — deadline state handling
- `src/widget.ts` — close confirmation UI, `ActionKind` update
- `test/smoke.mjs` — deadline picker tests, close confirmation tests
- `package-lock.json` — version bump

### AI Skills (new)
- `.agents/skills/release/SKILL.md`
- `.agents/skills/build-test/SKILL.md`
- `.agents/skills/changelog/SKILL.md`
- `.agents/skills/github-page/SKILL.md`
- `.agents/skills/extension-code/SKILL.md`
- `.agents/skills/skill-authoring/SKILL.md`
- `AGENTS.md` — project overview, commands, file map, skill routing
- `scripts/validate-skills.mjs` — frontmatter validator

### CI and Docs
- `.github/workflows/ci.yml` — GitHub Pages Actions, updated versions
- `docs/hot-loading.md` → `docs/local-development.md` (delete + create)
- `README.md` — remove hot, update features, add skills section
- `CHANGELOG.md` — add `[1.4.1]` section, update compare links
- `page/index.html` — deadline picker, close confirmation, roadmap updates
- `build.mjs` — cleanup imports, remove stale comments, ensure `.nojekyll`

### Legacy Removal
- `.cline/skills/release/SKILL.md` — `git rm -r .cline` after migration

## Implementation Tasks

### 1. Commit Feature Code
```bash
git add src/ test/ package-lock.json
git commit -m "feat: deadline picker + close confirmation"
```

### 2. Update package.json and CHANGELOG
```bash
npm version patch --no-git-tag-version  # 1.4.0 → 1.4.1
# Update CHANGELOG.md with [1.4.1] section
# Update package.json description if needed
```

### 3. Create AI Skills
```bash
mkdir -p .agents/skills/{release,build-test,changelog,github-page,extension-code,skill-authoring}
# Create each SKILL.md with frontmatter (name, description) and task instructions
# Create AGENTS.md with project summary, commands, file map, skill routing
# Create scripts/validate-skills.mjs
```

### 4. Update CI Workflow
```yaml
# .github/workflows/ci.yml
# - Bump action versions
# - Split publish-page into check + deploy-page
# - Add validate:skills step
# - Use GitHub Pages Actions (configure-pages, upload-pages-artifact, deploy-pages)
```

### 5. Update Docs
```bash
# Delete docs/hot-loading.md
rm docs/hot-loading.md
# Create docs/local-development.md
# Update README.md
# Update page/index.html
```

### 6. Clean Up build.mjs
```bash
# Remove unused imports (relative)
# Remove stale comments about dist/hot/
# Ensure dist/page/.nojekyll is written
```

### 7. Remove Legacy Skills
```bash
git rm -r .cline
```

### 8. Commit Standardization
```bash
git add .agents/ AGENTS.md .github/workflows/ci.yml docs/ README.md CHANGELOG.md page/index.html build.mjs
git commit -m "chore: standardize agent skills + CI + docs"
```

### 9. Build and Validate
```bash
npm run typecheck
npm test
npm run pack
node scripts/validate-skills.mjs
```

### 10. Create Release
```bash
git tag v1.4.1
git push origin main --tags
# Create GitHub release with six zips
```

## Validation Checklist

- [ ] `npm run typecheck` passes
- [ ] `npm test` passes (all suites)
- [ ] `npm run pack` creates six zips
- [ ] `node scripts/validate-skills.mjs` validates all skills
- [ ] `npm run page` renders `dist/page/index.html` with v1.4.1
- [ ] CI workflow validates on PR
- [ ] GitHub Pages deploys via Actions (no `gh-pages` branch)
- [ ] Release v1.4.1 created with six zips
- [ ] CHANGELOG shows v1.4.1 changes
- [ ] README reflects v1.4.1 features
- [ ] No references to `dist/hot/`, `npm run hot`, `--hot` flag
- [ ] All Agent Skills validated by `scripts/validate-skills.mjs`

## Risks / Edge Cases

### CI Migration Risk
- `gh-pages` branch exists; Pages Actions may conflict if branch-based deployment is still configured.
- **Mitigation**: Verify GitHub Pages settings after deploy (Settings → Pages → Source: GitHub Actions).

### Skill Migration Risk
- `.cline/skills/release/SKILL.md` may be referenced in old docs or commits.
- **Mitigation**: `git log` check for references, update any docs pointing to `.cline/`.

### Docs Link Risk
- `docs/agent-contract.md` is referenced in README but doesn't exist (dead link).
- **Mitigation**: Update README to point to `AGENTS.md` instead.

### Version Bump Risk
- `package-lock.json` must be in sync with `package.json`.
- **Mitigation**: `npm version patch --no-git-tag-version` updates both.

### Build.mjs Cleanup Risk
- Removing `relative` import may break if used elsewhere.
- **Mitigation**: Check all `relative()` usages in `build.mjs` before removing import.

## Out of Scope

- Changing the confirmation copy/style for other actions.
- Removing the content-script message listener or changing summon/remount architecture.
- Changing the audio, leadership, or storage architecture.
- Adding new features beyond deadline picker + close confirmation.
- Updating external store listings (Chrome Web Store, etc.).
- Deprecating the legacy `gh-pages` branch (manual cleanup after deploy).

## Commands Summary

```bash
# Feature commit
git add src/ test/ package-lock.json
git commit -m "feat: deadline picker + close confirmation"

# Version bump
npm version patch --no-git-tag-version

# Skills creation
mkdir -p .agents/skills/{release,build-test,changelog,github-page,extension-code,skill-authoring}
# ... create SKILL.md files, AGENTS.md, validator

# CI update
# ... edit .github/workflows/ci.yml

# Docs update
rm docs/hot-loading.md
# ... create docs/local-development.md, update README.md, page/index.html

# Build cleanup
# ... edit build.mjs

# Legacy removal
git rm -r .cline

# Standardization commit
git add .agents/ AGENTS.md .github/workflows/ci.yml docs/ README.md CHANGELOG.md page/index.html build.mjs
git commit -m "chore: standardize agent skills + CI + docs"

# Validation
npm run typecheck
npm test
npm run pack
node scripts/validate-skills.mjs
npm run page

# Release
git tag v1.4.1
git push origin main --tags
# Create GitHub release with six zips

# Verify
# Check CI status, GitHub Pages deploy, release assets
```