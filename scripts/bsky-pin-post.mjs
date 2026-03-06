#!/usr/bin/env node
/**
 * bsky-pin-post.mjs
 * Usage: node scripts/bsky-pin-post.mjs <at-uri>
 * Pins the given post URI to the authenticated profile.
 */
import { AtpAgent } from '@atproto/api';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function loadEnv() {
  const envPath = resolve(new URL('.', import.meta.url).pathname, '..', '.dev.vars');
  const content = readFileSync(envPath, 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    const match = line.match(/^([^=]+)=(.+)$/);
    if (match) env[match[1].trim()] = match[2].trim();
  }
  return env;
}

async function main() {
  const uri = process.argv[2];
  if (!uri) {
    console.error('Usage: node scripts/bsky-pin-post.mjs <at-uri>');
    process.exit(1);
  }

  const env = loadEnv();
  const agent = new AtpAgent({ service: 'https://bsky.social' });
  await agent.login({ identifier: env.BSKY_HANDLE, password: env.BSKY_PASSWORD });
  console.log(`Authenticated as ${env.BSKY_HANDLE}`);

  // Fetch existing preferences, replace any existing pinned post pref
  const existing = await agent.app.bsky.actor.getPreferences();
  const prefs = (existing.data.preferences || []).filter(
    (p) => p.$type !== 'app.bsky.actor.defs#pinnedPostPref'
  );
  prefs.push({ $type: 'app.bsky.actor.defs#pinnedPostPref', pinned: [uri] });
  await agent.app.bsky.actor.putPreferences({ preferences: prefs });

  console.log(`Pinned: ${uri}`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
