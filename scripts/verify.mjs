#!/usr/bin/env node
// WorkdeskOS Plugin — acceptance gate.
//
// Usage: node scripts/verify.mjs phase{0|1|2|3|4a.1|4a.2|4b|5a|5b|6a|6b}
//
// Phase 0 has REAL passing checks. Phases 1–6b are fail-closed throwing
// stubs — each later mega-session replaces its own stub with real assertions
// before re-running the gate. See M1/M2/M3 specs for the contract.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { StateSchema } from './state-schema.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const phase = process.argv[2] || '';

const checks = [];
let failed = 0;

function check(name, fn) {
  try {
    const detail = fn();
    checks.push({ name, ok: true, detail: detail ?? '' });
    console.log(`  ok  · ${name}${detail ? `  (${detail})` : ''}`);
  } catch (err) {
    failed++;
    const msg = err instanceof Error ? err.message : String(err);
    checks.push({ name, ok: false, detail: msg });
    console.log(`  FAIL · ${name}\n        ${msg}`);
  }
}

function readFile(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function sha256(rel) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(root, rel))).digest('hex');
}

function logRun(name) {
  const line = `## ${new Date().toISOString()}  verify ${name}\n`;
  fs.appendFileSync(path.join(root, 'STATE.log'), line);
}

function summary(name) {
  fs.appendFileSync(
    path.join(root, 'STATE.log'),
    checks.map((c) => `  - [${c.ok ? 'ok' : 'FAIL'}] ${c.name}${c.detail ? ` — ${c.detail}` : ''}`).join('\n') + '\n',
  );
  if (failed > 0) {
    console.log(`\n[verify] ${name} FAIL (${failed} of ${checks.length} checks)`);
    process.exit(1);
  } else {
    console.log(`\n[verify] ${name} PASS (${checks.length} of ${checks.length} checks)`);
    process.exit(0);
  }
}

// ────────── Phase 0 ──────────
function phase0() {
  logRun('phase0');

  // STATE.json zod-validates
  check('STATE.json validates against zod schema', () => {
    const raw = JSON.parse(readFile('STATE.json'));
    StateSchema.parse(raw);
    return 'schema=2';
  });

  // 16 deliverables exist
  const deliverables = [
    'scripts/preflight.sh',
    'manifest.json',
    'package.json',
    'tsconfig.json',
    'esbuild.config.mjs',
    '.gitignore',
    '.nvmrc',
    'README.md',
    'LICENSE',
    'styles/tokens.css',
    'styles/app.css',
    'styles/reduced-motion.css',
    'styles/fonts.css',
    'src/icons.ts',
    'src/types.d.ts',
    'fixtures/zones.yaml',
    'fixtures/object-icons.yaml',
    'src/main.ts',
    'src/settings.ts',
    'src/constants.ts',
    'STATE.json',
    'STATE.md',
    'STATE.log',
    'scripts/render-state-md.mjs',
    'scripts/state-schema.mjs',
    'scripts/copy-fonts.mjs',
    'scripts/verify.mjs',
    'scripts/run-all.sh',
    'scripts/install-check.sh',
    'tests/fixtures/sample-vault',
    'tests/stubs/obsidian.ts',
    '_inputs/design-handoff',
    '_inputs/workdesk-terminal.main.ts',
  ];
  for (const d of deliverables) {
    check(`deliverable: ${d}`, () => {
      if (!exists(d)) throw new Error(`missing: ${d}`);
      return '';
    });
  }

  // CSS SHA-256 matches the source
  check('styles/tokens.css matches _inputs source byte-for-byte', () => {
    const a = sha256('styles/tokens.css');
    const b = sha256('_inputs/design-handoff/project/shared/tokens.css');
    if (a !== b) throw new Error(`SHA mismatch a=${a.slice(0, 12)} b=${b.slice(0, 12)}`);
    return a.slice(0, 12) + '…';
  });
  check('styles/app.css matches _inputs source byte-for-byte', () => {
    const a = sha256('styles/app.css');
    const b = sha256('_inputs/design-handoff/project/shared/app.css');
    if (a !== b) throw new Error(`SHA mismatch a=${a.slice(0, 12)} b=${b.slice(0, 12)}`);
    return a.slice(0, 12) + '…';
  });

  // 47 icons minimum
  check('src/icons.ts ports ≥ 47 icons from shared/icons.js', () => {
    const txt = readFile('src/icons.ts');
    const re = /^\s+[a-zA-Z][a-zA-Z0-9]*:\s+'/gm;
    const matches = txt.match(re) ?? [];
    if (matches.length < 47) throw new Error(`only ${matches.length} icons in src/icons.ts`);
    // Also assert the source has the same key count to catch silent diff.
    const src = readFile('_inputs/design-handoff/project/shared/icons.js');
    const srcMatches = src.match(re) ?? [];
    if (matches.length !== srcMatches.length) {
      throw new Error(`port count (${matches.length}) != source count (${srcMatches.length})`);
    }
    return `${matches.length} icons`;
  });

  // manifest.json id + minAppVersion + isDesktopOnly
  check('manifest.json id + minAppVersion + isDesktopOnly', () => {
    const m = JSON.parse(readFile('manifest.json'));
    if (m.id !== 'workdeskos-plugin') throw new Error(`id = ${m.id}`);
    if (m.minAppVersion !== '1.11.4') throw new Error(`minAppVersion = ${m.minAppVersion}`);
    if (m.isDesktopOnly !== true) throw new Error('isDesktopOnly must be true');
    return `id=${m.id} minAppVersion=${m.minAppVersion}`;
  });

  // No ^ in package.json deps
  check('package.json deps are exact (no ^)', () => {
    const pkg = JSON.parse(readFile('package.json'));
    const offenders = [];
    for (const block of ['dependencies', 'devDependencies']) {
      for (const [n, v] of Object.entries(pkg[block] ?? {})) {
        if (typeof v === 'string' && (v.startsWith('^') || v.startsWith('~'))) {
          offenders.push(`${n}=${v}`);
        }
      }
    }
    if (offenders.length > 0) throw new Error(`ranged: ${offenders.join(', ')}`);
    return 'all exact';
  });

  // TypeScript strict compiles
  check('tsc --strict --noEmit', () => {
    const r = spawnSync('npx', ['--no-install', 'tsc', '-p', 'tsconfig.json', '--noEmit'], {
      cwd: root,
      encoding: 'utf8',
    });
    if (r.status !== 0) {
      throw new Error(`tsc exit ${r.status}: ${(r.stderr || r.stdout || '').slice(0, 400)}`);
    }
    return 'strict mode';
  });

  // pnpm build produces main.js + styles.css
  check('pnpm build → main.js + styles.css', () => {
    const r = spawnSync('pnpm', ['build'], { cwd: root, encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`pnpm build exit ${r.status}: ${(r.stderr || r.stdout || '').slice(0, 400)}`);
    if (!exists('main.js')) throw new Error('main.js not produced');
    if (!exists('styles.css')) throw new Error('styles.css not produced');
    const css = readFile('styles.css');
    if (!css.includes('--ws-')) throw new Error('styles.css does not include --ws-* tokens');
    return 'build ok';
  });

  // fonts/ ≥ 8 .woff2 with SHAs matching STATE
  check('fonts/ contains ≥ 8 .woff2 with SHAs in STATE.decisions.font_shas', () => {
    const dir = path.join(root, 'fonts');
    const fontFiles = fs.readdirSync(dir).filter((f) => f.endsWith('.woff2'));
    if (fontFiles.length < 8) throw new Error(`only ${fontFiles.length} .woff2 files`);
    const state = JSON.parse(readFile('STATE.json'));
    const shas = state.decisions.font_shas ?? {};
    for (const f of fontFiles) {
      const slot = f.replace('.woff2', '');
      if (!shas[slot]) throw new Error(`no recorded sha for ${slot}`);
      const actual = crypto.createHash('sha256').update(fs.readFileSync(path.join(dir, f))).digest('hex');
      if (actual !== shas[slot]) throw new Error(`sha mismatch for ${slot}`);
    }
    return `${fontFiles.length} fonts verified`;
  });

  // prompts/S*.md do NOT exist (M1 skips that legacy artifact)
  check('prompts/S*.md absent (mega-spec mode)', () => {
    if (fs.existsSync(path.join(root, 'prompts'))) {
      const files = fs.readdirSync(path.join(root, 'prompts')).filter((f) => /^S\d/i.test(f));
      if (files.length > 0) throw new Error(`prompts/ has ${files.length} S* files`);
    }
    return 'no prompts/S*.md';
  });

  summary('phase0');
}

// ────────── Phase 1 ──────────
function phase1() {
  logRun('phase1');

  check('TypeScript strict compiles', () => {
    const r = spawnSync('npx', ['--no-install', 'tsc', '-p', 'tsconfig.json', '--noEmit'], {
      cwd: root,
      encoding: 'utf8',
    });
    if (r.status !== 0) throw new Error(`tsc exit ${r.status}: ${(r.stderr || r.stdout || '').slice(0, 400)}`);
    return '';
  });

  check('pnpm build', () => {
    const r = spawnSync('pnpm', ['build'], { cwd: root, encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`pnpm build exit ${r.status}`);
    if (!exists('main.js')) throw new Error('main.js missing');
    return '';
  });

  check('vitest phase1 suite', () => {
    const r = spawnSync('npx', ['--no-install', 'vitest', 'run', 'tests/phase1.spec.ts'], { cwd: root, encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`vitest exit ${r.status}: ${(r.stdout || r.stderr || '').slice(-400)}`);
    return '';
  });

  summary('phase1');
}

// ────────── Phase 2 ──────────
function phase2() {
  logRun('phase2');

  check('TypeScript strict compiles', () => {
    const r = spawnSync('npx', ['--no-install', 'tsc', '-p', 'tsconfig.json', '--noEmit'], { cwd: root, encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`tsc exit ${r.status}: ${(r.stderr || r.stdout || '').slice(0, 400)}`);
    return '';
  });

  check('pnpm build', () => {
    const r = spawnSync('pnpm', ['build'], { cwd: root, encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`pnpm build exit ${r.status}`);
    return '';
  });

  check('vitest phase2 suite', () => {
    const r = spawnSync('npx', ['--no-install', 'vitest', 'run', 'tests/phase2.spec.ts'], { cwd: root, encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`vitest exit ${r.status}: ${(r.stdout || r.stderr || '').slice(-400)}`);
    return '';
  });

  summary('phase2');
}

// ────────── Phase 3 ──────────
function phase3() {
  logRun('phase3');

  check('TypeScript strict compiles', () => {
    const r = spawnSync('npx', ['--no-install', 'tsc', '-p', 'tsconfig.json', '--noEmit'], { cwd: root, encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`tsc exit ${r.status}: ${(r.stderr || r.stdout || '').slice(0, 400)}`);
    return '';
  });

  check('pnpm build', () => {
    const r = spawnSync('pnpm', ['build'], { cwd: root, encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`pnpm build exit ${r.status}`);
    return '';
  });

  check('vitest phase3 suite', () => {
    const r = spawnSync('npx', ['--no-install', 'vitest', 'run', 'tests/phase3.spec.ts'], { cwd: root, encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`vitest exit ${r.status}: ${(r.stdout || r.stderr || '').slice(-400)}`);
    return '';
  });

  summary('phase3');
}

// ────────── Fail-closed stubs for later phases ──────────
function unimplemented(p) {
  throw new Error(
    `phase ${p} not yet implemented; mega-session must replace this stub before running verify.mjs phase${p}`,
  );
}

const dispatch = {
  phase0,
  phase1,
  phase2,
  phase3,
  'phase4a.1': () => unimplemented('4a.1'),
  'phase4a.2': () => unimplemented('4a.2'),
  phase4b: () => unimplemented('4b'),
  phase5a: () => unimplemented('5a'),
  phase5b: () => unimplemented('5b'),
  phase6a: () => unimplemented('6a'),
  phase6b: () => unimplemented('6b'),
};

const fn = dispatch[phase];
if (!fn) {
  console.error(`Unknown phase: ${phase}. Expected one of: ${Object.keys(dispatch).join(', ')}`);
  process.exit(2);
}

try {
  fn();
} catch (err) {
  console.error(err.message ?? err);
  process.exit(2);
}
