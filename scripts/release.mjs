#!/usr/bin/env node
// scripts/release.mjs
//
// One-shot release flow:
//   pnpm release <patch|minor|major>
//
// 1. Verify clean working tree (fix commits must land separately first).
// 2. Verify CHANGELOG.md `[Unreleased]` section has content.
// 3. Bump manifest.json version.
// 4. Append new entry to versions.json (mapping → manifest.minAppVersion).
// 5. Rename CHANGELOG `[Unreleased]` to `[<new>] — <today>`; add fresh
//    `[Unreleased]` placeholder above it.
// 6. Run `pnpm build` as a sanity check (refuses to release a broken build).
// 7. Stage manifest.json + versions.json + CHANGELOG.md, commit
//    `chore: release v<new>`, tag `<new>`, push branch + tag.
// 8. CI workflow `.github/workflows/release.yml` takes over from the tag push
//    and creates the GitHub Release with built assets attached. BRAT in
//    operator vaults polls /releases/latest and pulls automatically.

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = resolve(REPO_ROOT, 'manifest.json');
const VERSIONS = resolve(REPO_ROOT, 'versions.json');
const CHANGELOG = resolve(REPO_ROOT, 'CHANGELOG.md');

function sh(cmd, opts = {}) {
  return execSync(cmd, { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['inherit', 'pipe', 'pipe'], ...opts });
}

function fail(msg) {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

function bumpVersion(current, kind) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(current);
  if (!m) fail(`Cannot parse current version: ${current}`);
  const [major, minor, patch] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (kind === 'patch') return `${major}.${minor}.${patch + 1}`;
  if (kind === 'minor') return `${major}.${minor + 1}.0`;
  if (kind === 'major') return `${major + 1}.0.0`;
  fail(`Unknown bump kind: ${kind} (expected patch | minor | major)`);
}

const kind = process.argv[2];
if (!kind || !['patch', 'minor', 'major'].includes(kind)) {
  fail('Usage: pnpm release <patch|minor|major>');
}

// ── Step 1: clean working tree ───────────────────────────────────────────
const dirty = sh('git status --porcelain').trim();
if (dirty) {
  fail(`Working tree is not clean. Commit or stash your fix(es) first.\n${dirty}`);
}

// Make sure we're on main and up to date
const branch = sh('git rev-parse --abbrev-ref HEAD').trim();
if (branch !== 'main') fail(`Releases must be cut from main. Current branch: ${branch}`);
sh('git fetch origin main');
const localHead = sh('git rev-parse HEAD').trim();
const remoteHead = sh('git rev-parse origin/main').trim();
if (localHead !== remoteHead) {
  fail(`Local main is not in sync with origin/main. Pull or push first.`);
}

// ── Step 2: read manifest, compute new version ───────────────────────────
const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const currentVersion = manifest.version;
const newVersion = bumpVersion(currentVersion, kind);
const today = new Date().toISOString().slice(0, 10);

console.log(`\n→ Releasing v${currentVersion} → v${newVersion} (${kind})\n`);

// ── Step 3: verify CHANGELOG [Unreleased] has content ────────────────────
const changelog = readFileSync(CHANGELOG, 'utf8');
const unreleasedRe = /## \[Unreleased\]\s*\n([\s\S]*?)(?=\n## \[)/;
const match = unreleasedRe.exec(changelog);
if (!match) fail(`Could not find [Unreleased] section in CHANGELOG.md.`);
const unreleasedBody = match[1].trim();
if (!unreleasedBody) {
  fail(`CHANGELOG.md [Unreleased] section is empty. Document what's in this release before cutting.`);
}

// ── Step 4: write manifest.json ──────────────────────────────────────────
manifest.version = newVersion;
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');

// ── Step 5: write versions.json ──────────────────────────────────────────
const versions = JSON.parse(readFileSync(VERSIONS, 'utf8'));
versions[newVersion] = manifest.minAppVersion;
writeFileSync(VERSIONS, JSON.stringify(versions, null, 2) + '\n');

// ── Step 6: rewrite CHANGELOG.md ─────────────────────────────────────────
const newChangelog = changelog.replace(
  '## [Unreleased]\n',
  `## [Unreleased]\n\n## [${newVersion}] — ${today}\n`,
);
writeFileSync(CHANGELOG, newChangelog);

console.log('✓ Bumped manifest.json, versions.json, CHANGELOG.md\n');

// ── Step 7: build (sanity check) ─────────────────────────────────────────
console.log('→ Building plugin…\n');
try {
  execSync('pnpm build', { cwd: REPO_ROOT, stdio: 'inherit' });
} catch {
  fail('Build failed — release aborted. The version bump files have been modified but not committed. Revert with `git checkout -- manifest.json versions.json CHANGELOG.md`.');
}

// ── Step 8: commit, tag, push ────────────────────────────────────────────
sh('git add manifest.json versions.json CHANGELOG.md');
sh(`git commit -m "chore: release v${newVersion}"`, { stdio: 'inherit' });
// Tag with `v` prefix to stay in sequence with the established convention
// (v1.0.0 through v1.6.3). Tags 1.6.4 through 1.7.0 dropped the prefix —
// fixed here so future releases match the original convention.
sh(`git tag v${newVersion}`);

console.log(`\n→ Pushing main + tag v${newVersion}…\n`);
execSync('git push origin main', { cwd: REPO_ROOT, stdio: 'inherit' });
execSync(`git push origin v${newVersion}`, { cwd: REPO_ROOT, stdio: 'inherit' });

console.log(`\n✓ Released v${newVersion}.`);
console.log(`  CI is now building + publishing the GitHub Release.`);
console.log(`  Watch: https://github.com/BenaliHQ/workdesk-operating-system/actions`);
console.log(`  Once green, BRAT will pull on next Obsidian startup`);
console.log(`  (or run "BRAT: Check for updates" from the Command Palette).\n`);
