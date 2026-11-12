---
name: skill-authoring
description: How to write new Agent Skill files for Focus Exe.
condition: write skill | create skill | new skill | skill authoring
---

# Skill Authoring Guide

## File Location

All skills live in `.agents/skills/<name>/SKILL.md` (flat, lowercase, hyphenated).

## Frontmatter (Required)

Every `SKILL.md` must begin with YAML frontmatter:

```yaml
---
name: <lowercase-hyphenated-name>
description: One-sentence summary of what this skill does.
condition: trigger phrase | alternative trigger | another trigger
---
```

- `name`: Matches the directory name exactly.
- `description`: One sentence, used for skill discovery.
- `condition`: Pipe-separated triggers that map user requests to this skill.

## Body Structure

Use markdown with these sections:

1. **Purpose/Overview** — what the skill covers
2. **Commands/Procedures** — step-by-step workflows with code blocks
3. **File References** — paths to relevant source files
4. **Rules/Invariants** — constraints that must never be violated
5. **Troubleshooting** — common issues and fixes

## Validation

`scripts/validate-skills.mjs` validates all skills. It checks:
- Frontmatter exists and has `name`, `description`, `condition`
- `name` matches the directory name
- No duplicate skill names

Run: `node scripts/validate-skills.mjs`

## Adding a New Skill

1. Create directory: `.agents/skills/<name>/`
2. Create `SKILL.md` with valid frontmatter
3. Run `node scripts/validate-skills.mjs` to verify
4. Update `AGENTS.md` skill routing table

## Example

```markdown
---
name: my-skill
description: Does something useful for Focus Exe.
condition: my skill | do the thing
---

# My Skill

## Purpose
...

## Commands
```bash
npm run something
```

## Files
- `src/something.ts`
```