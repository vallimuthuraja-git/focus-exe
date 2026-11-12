#!/usr/bin/env node
/**
 * Validate all Agent Skills in .agents/skills/
 * Checks frontmatter format: name, description, condition
 * Ensures name matches directory name
 */

import { readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const skillsDir = join(root, '.agents', 'skills');

async function validate() {
  const entries = await readdir(skillsDir);
  const errors = [];

  for (const entry of entries) {
    const skillDir = join(skillsDir, entry);
    const skillFile = join(skillDir, 'SKILL.md');
    const dirStat = await stat(skillDir);

    if (!dirStat.isDirectory()) continue;

    let content;
    try {
      content = await readFile(skillFile, 'utf8');
    } catch {
      errors.push(`${entry}: missing SKILL.md`);
      continue;
    }

    // Parse frontmatter
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) {
      errors.push(`${entry}: missing frontmatter (--- ... ---)`);
      continue;
    }

    const fm = fmMatch[1];
    const nameMatch = fm.match(/^name:\s*(.+)$/m);
    const descMatch = fm.match(/^description:\s*(.+)$/m);
    const condMatch = fm.match(/^condition:\s*(.+)$/m);

    if (!nameMatch) errors.push(`${entry}: missing 'name' in frontmatter`);
    if (!descMatch) errors.push(`${entry}: missing 'description' in frontmatter`);
    if (!condMatch) errors.push(`${entry}: missing 'condition' in frontmatter`);

    if (nameMatch && nameMatch[1].trim() !== entry) {
      errors.push(`${entry}: frontmatter name "${nameMatch[1].trim()}" does not match directory "${entry}"`);
    }
  }

  if (errors.length > 0) {
    console.error('❌ Validation failed:');
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  console.log(`✅ All ${entries.length} skills validated`);
}

validate().catch(err => {
  console.error('Validation error:', err);
  process.exit(1);
});