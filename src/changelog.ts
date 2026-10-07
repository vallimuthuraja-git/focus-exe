/**
 * Structured changelog for the Focus Exe product page.
 *
 * `CHANGELOG.md` stays the human-readable canonical record (Keep a Changelog
 * format). This module exposes a stable JSON schema so the product page can
 * parse the release history at runtime instead of having it hand-typed into
 * HTML. The build pipeline (`build.mjs`) emits this as
 * `dist/<browser>/page/changelog.json` (and `dist/page/changelog.json`).
 *
 * ## [Unreleased] sections are skipped: they represent work that has not been
 * tagged yet and must not appear on the product page.
 */

export type ChangeKind = 'Added' | 'Changed' | 'Fixed' | 'Security' | 'Tests';

export interface Release {
  version: string;
  date: string;
  changes: Record<ChangeKind, string[]>;
}

/** The stable top-level schema of the emitted changelog JSON. */
export interface Changelog {
  project: string;
  format: string;
  /** SemVer of the newest tagged release, mirroring package.json. */
  latestVersion: string;
  releases: Release[];
}

const KIND_RE =
  /^### (Added|Changed|Fixed|Security|Tests)$/;

/**
 * Parse a Keep a Changelog `CHANGELOG.md` into a stable JSON structure.
 *
 * - Releases appear newest-first (the CHANGELOG is ordered that way).
 * - A `## [Unreleased]` header (and anything preceding the first tagged
 *   release) is skipped, since it is not yet a released version.
 * - A release is only included if it has a `## [x.y.z] - date` header followed
 *   by at least one `### <Kind>` section, so a malformed file fails loudly
 *   rather than emitting a dangling entry.
 */
export function parseChangelog(source: string): Changelog {
  const lines = source.split(/\r?\n/);
  const releases: Release[] = [];
  let current: Release | null = null;
  let currentKind: ChangeKind | null = null;
  let kindLines: string[] = [];

  /** Write the pending kind's bullets into the current release's changes. */
  const flushKind = (): void => {
    if (current && currentKind !== null) {
      current.changes[currentKind] = kindLines;
    }
    currentKind = null;
    kindLines = [];
  };

  /** Close the current release: flush its pending kind, then record it. */
  const flushRelease = (): void => {
    flushKind();
    if (
      current &&
      Object.values(current.changes).some((items) => items.length > 0)
    ) {
      // A release must carry at least one known kind; otherwise it is
      // incomplete and we drop it instead of shipping a partial entry.
      releases.push(current);
    }
    current = null;
    currentKind = null;
    kindLines = [];
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    const header = line.match(/^##\s+\[(\d+\.\d+\.\d+)\]\s*-\s*(\d{4}-\d{2}-\d{2})/);
    if (header) {
      flushRelease();
      current = {
        version: header[1],
        date: header[2],
        changes: {
          Added: [],
          Changed: [],
          Fixed: [],
          Security: [],
          Tests: [],
        },
      };
      continue;
    }

    if (current === null) {
      // Before the first tagged release (e.g. the intro header or `[Unreleased]`)
      // we are not collecting anything.
      continue;
    }

    const kind = line.match(KIND_RE);
    if (kind) {
      flushKind();
      currentKind = kind[1] as ChangeKind;
      continue;
    }

    if (currentKind !== null && line.startsWith('- ')) {
      // Start a new bullet; continuation lines are appended below.
      kindLines.push(line.slice(2));
    } else if (
      currentKind !== null &&
      /^\s+\S/.test(line) &&
      kindLines.length > 0
    ) {
      // Indented continuation of the previous bullet (Markdown wraps long
      // bullets across lines). Join it with a single space.
      kindLines[kindLines.length - 1] += ` ${line.trim()}`;
    } else if (currentKind !== null && line.trim() !== '') {
      // Non-blank, non-bullet content ends the current kind's bullet list.
      flushKind();
    }
    // Blank lines between a `### Kind` header and its bullets are ignored so
    // the kind stays active across the spacer.
  }
  flushRelease();

  // Drop [Unreleased] in the listing: it is not a release.
  const releasesOnly = releases.filter((r) => r.version !== 'Unreleased');

  if (releasesOnly.length === 0) {
    throw new Error('CHANGELOG.md contains no released versions.');
  }

  return {
    project: 'focus-exe',
    format: 'keep-a-changelog/v1',
    latestVersion: releasesOnly[0].version,
    releases: releasesOnly,
  };
}
