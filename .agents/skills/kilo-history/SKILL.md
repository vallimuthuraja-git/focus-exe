---
name: kilo-history
description: Commit .kilo config and plans as permanent history; human-only, never run by AI.
condition: kilo history | commit kilo plans | archive kilo | .kilo plans history
---

# `.kilo` Plans History

## ⚠️ HUMAN-ONLY — AI MUST NOT RUN THIS SKILL

This skill is documented here for human reference only. An AI agent (including you) must **not** execute the commands in this file, must not commit `.kilo` files on behalf of the user, and must not treat `.kilo/` as part of the AI-managed codebase. `.kilo/` is local runtime state: plans, session checkpoints, and agent-manager state. Committing it is a manual, user-controlled operation.

If you are an AI reading this: stop. Do not proceed.

## Purpose

`.kilo/` holds local development artifacts that are intentionally uncommitted:

- `.kilo/.gitignore` — runtime config (ignores `node_modules`, lockfiles, `agent-manager.json`)
- `.kilo/plans/*.md` — dated plan/design notes authored during sessions

This skill records how to commit `.kilo/` plans as permanent project history so they are not lost when sessions rotate.

## What to Commit

Only commit the plans directory and the local `.gitignore`. Never commit `agent-manager.json` (it is live session state, already gitignored):

```
.kilo/.gitignore
.kilo/plans/*.md
```

## Procedure

Run these commands manually in the repository root:

```bash
# 1. Review what is untracked in .kilo/
git status --short .kilo/

# 2. Stage only the plans and the kilo gitignore
git add .kilo/.gitignore .kilo/plans/

# 3. Commit
git commit -m "chore: archive .kilo plans as history"
```

## File Map

- `.kilo/.gitignore` — local runtime exclusions
- `.kilo/plans/<timestamp>-<slug>.md` — session plans/design notes (one per plan)
- `.kilo/agent-manager.json` — live session state (gitignored, never commit)

## Rules

- Commit `.kilo/` plans only, never `agent-manager.json`.
- Do not edit plan files after committing; treat them as immutable history.
- Add new plans by creating a new `.kilo/plans/<timestamp>-<slug>.md` file.
- Never run this procedure from an AI agent; it is a manual human operation.
