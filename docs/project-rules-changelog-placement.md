# Changelog & README discipline

**Context on demand:** read this rule only when preparing a release, editing `CHANGELOG.md`,
touching the README's changelog section, or wiring the product page's release history —
not as part of every task.

Two practices, one rule. Both exist so the changelog stays a single, trustworthy source of
truth that automation can parse without fighting a bloated README.

## 1. Where the changelog lives and how it is consumed

- **`CHANGELOG.md` stays at the repository root** (`/CHANGELOG.md`). That is the location
  GitHub renders on the repository homepage, that automation and release tooling expect,
  and that this repo's parser (`src/changelog.ts`) and `test/page.mjs` already assume.
  Never move it into a subfolder.
- **Consumers fetch it, never duplicate it.** Anything that displays the history — the
  product page, the GitHub Pages site, a wiki, a second repository — must read the file
  through a stable absolute reference, not through relative paths that break when files
  move. For this repo the reference is resolved at **build time**, which is equivalent to
  the CDN-fetch pattern but requires no network:
  - `build.mjs` parses root `CHANGELOG.md` and injects it as inline JSON
    (`__CHANGELOG_JSON__`) into `page/index.html` and `pages/`, plus
    `dist/page/changelog.json` for the site.
  - If a consumer ever runs outside this build (a separate site repo, a private repo, or a
    page that must always show `main`), fetch it over the network instead of copying it:
    - public file, simplest: `https://raw.githubusercontent.com/<user>/<repo>/main/CHANGELOG.md`
    - public file, CDN-cached: `https://cdn.jsdelivr.net/gh/<user>/<repo>@main/CHANGELOG.md`
    - private file or cache-bypassing reads: GitHub API
      `https://api.github.com/repos/<user>/<repo>/contents/CHANGELOG.md` with header
      `Accept: application/vnd.github.v3.raw`.
  - Never hand-copy changelog text into HTML, the README, or any other file: a copy goes
    stale the moment the next release lands.
- **Per-project changelogs (monorepo):** if this repository ever hosts several projects,
  each project folder carries its own `CHANGELOG.md` (`/apps/<project>/CHANGELOG.md`) and
  consumers fetch that exact sub-folder path — still by stable URL, never by a relative
  `../../` path.

## 2. README and CHANGELOG stay separate — link, don't paste

- **README.md** = what the project is, how to build/install/use it. It must never contain
  the full changelog history, only a single clean link to it.
- The link belongs at the bottom, in the `## Changelog` section, pointing at
  `[CHANGELOG.md](CHANGELOG.md)` — one line, no history.
- **Optional latest-release snippet:** if recent changes must be visible without a click,
  show *only* the newest version inside an automated block, never typed by hand:

  ```markdown
  <!-- CHANGELOG-START -->
  ## Latest Changes (vX.Y.Z)
  * one-line bullets
  <!-- CHANGELOG-END -->
  ```

  The block is rewritten by tooling (a CI script or action) that reads the top section of
  `CHANGELOG.md` and rewrites only what is between the markers. If this repo adds such a
  snippet, the writer script must be part of the build/test flow, not a manual step — a
  stale "Latest Changes" block is worse than none.
- **Checklist:** root `README.md` (summary, setup, link), root `CHANGELOG.md` (complete
  history, parsed by the site), `LICENSE`. Nothing else duplicates history.

## Invariants for this repo

- Root `CHANGELOG.md` is the only hand-edited history; the product page and site consume
  it through the build-time JSON injection (or a raw/API URL if fetched at runtime).
- README keeps the link-only section at the bottom; no version bullets are added to it
  outside an automated `CHANGELOG-START/END` block.
- All other changelog rules (Keep a Changelog, SemVer, user-facing-only scope, exact
  subheadings, writing constraints) live in the changelog-management rule and are read
  on demand alongside this one.
