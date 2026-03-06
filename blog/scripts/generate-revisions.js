#!/usr/bin/env node
/**
 * generate-revisions.js
 *
 * Prebuild script. For every post in blog/src/content/posts/, runs
 * `git log --follow` to extract the commit history and writes a JSON
 * sidecar to blog/src/data/revisions/{slug}.json.
 *
 * Output schema per revision entry:
 *   { hash, date (ISO 8601), subject }
 *
 * Revisions are ordered newest-first. The generating script runs from
 * the repo root so git paths are relative to the repo root.
 */

import { execSync } from 'node:child_process';
import { readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = fileURLToPath(new URL('.', import.meta.url)); // blog/scripts/
const repoRoot = join(scriptDir, '..', '..'); // blog/scripts/ → blog/ → unratified/
const postsDir = join(scriptDir, '..', 'src', 'content', 'posts');
const outputDir = join(scriptDir, '..', 'src', 'data', 'revisions');

mkdirSync(outputDir, { recursive: true });

const postFiles = readdirSync(postsDir).filter(
  f => f.endsWith('.md') && !f.startsWith('_')
);

for (const filename of postFiles) {
  const slug = basename(filename, '.md');
  const repoRelativePath = `blog/src/content/posts/${filename}`;

  let rawLog = '';
  try {
    rawLog = execSync(
      `git log --follow --format="%H|%aI|%s" -- "${repoRelativePath}"`,
      { cwd: repoRoot, encoding: 'utf8' }
    ).trim();
  } catch {
    // File not yet tracked or git unavailable — write empty history
  }

  const revisions = rawLog
    ? rawLog.split('\n').filter(Boolean).map(line => {
        const separatorIndex = line.indexOf('|');
        const secondSeparator = line.indexOf('|', separatorIndex + 1);
        const hash = line.slice(0, separatorIndex);
        const date = line.slice(separatorIndex + 1, secondSeparator);
        const subject = line.slice(secondSeparator + 1);
        return { hash, date, subject };
      })
    : [];

  writeFileSync(
    join(outputDir, `${slug}.json`),
    JSON.stringify(revisions, null, 2)
  );
}

console.log(`[revisions] Generated ${postFiles.length} revision files → src/data/revisions/`);
