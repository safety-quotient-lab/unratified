#!/usr/bin/env node
/**
 * bsky-update-handle.mjs
 *
 * Update Bluesky handle to a custom domain (e.g. unratified.org).
 *
 * Prerequisites:
 *   1. Add DNS TXT record at your domain:
 *      Name:  _atproto
 *      Value: did=did:plc:dj5bft77jjjfbk7xkvon5bpk
 *      TTL:   Auto (or 60s)
 *   2. Wait for DNS propagation (~1–5 min on Cloudflare)
 *   3. Run this script
 *
 * Usage:
 *   node scripts/bsky-update-handle.mjs [--dry-run]
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
  const dryRun = process.argv.includes('--dry-run');
  const NEW_HANDLE = 'unratified.org';

  const env = loadEnv();
  const agent = new AtpAgent({ service: 'https://bsky.social' });
  await agent.login({ identifier: env.BSKY_HANDLE, password: env.BSKY_PASSWORD });

  console.log(`Authenticated as : ${env.BSKY_HANDLE}`);
  console.log(`Target handle    : ${NEW_HANDLE}`);
  console.log(`DID              : did:plc:dj5bft77jjjfbk7xkvon5bpk\n`);

  // Verify DNS TXT record is visible before attempting handle update
  console.log('Verifying DNS TXT record...');
  try {
    const res = await fetch(
      `https://dns.google/resolve?name=_atproto.${NEW_HANDLE}&type=TXT`
    );
    const data = await res.json();
    const answers = data.Answer || [];
    const match = answers.find((a) => a.data?.includes('did=did:plc:dj5bft77jjjfbk7xkvon5bpk'));
    if (match) {
      console.log(`✓ DNS TXT found: ${match.data}`);
    } else {
      console.log('✗ DNS TXT not found yet. Answers:', JSON.stringify(answers, null, 2));
      console.log('\nAdd this TXT record in Cloudflare DNS, then re-run:');
      console.log('  Name:  _atproto');
      console.log('  Value: did=did:plc:dj5bft77jjjfbk7xkvon5bpk');
      console.log('  TTL:   Auto');
      if (!dryRun) {
        console.log('\nAborting — DNS not propagated yet.');
        process.exit(1);
      }
    }
  } catch (err) {
    console.log(`  DNS check failed: ${err.message} — proceeding anyway`);
  }

  if (dryRun) {
    console.log('\n[dry-run] would update handle to unratified.org');
    return;
  }

  console.log('\nUpdating handle...');
  await agent.com.atproto.identity.updateHandle({ handle: NEW_HANDLE });
  console.log(`✓ Handle updated to @${NEW_HANDLE}`);
  console.log('\nUpdate BSKY_HANDLE in .dev.vars to: unratified.org');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
