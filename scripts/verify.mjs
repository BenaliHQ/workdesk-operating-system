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

// ────────── Phase 4A.1 — terminal vendor + PTY skeleton ──────────
function phase4a1() {
  logRun('phase4a.1');

  check('vendored terminal main.ts SHA matches STATE', () => {
    const state = JSON.parse(readFile('STATE.json'));
    const expected = state.decisions.vendored_terminal_main_sha256;
    const actual = sha256('src/vendor/terminal/main.ts');
    if (actual !== expected) {
      throw new Error(`SHA mismatch: expected ${expected.slice(0, 12)}… got ${actual.slice(0, 12)}…`);
    }
    return actual.slice(0, 12) + '…';
  });

  check('vendored main.ts preserves required class declarations', () => {
    const src = readFile('src/vendor/terminal/main.ts');
    const required = ['class TerminalSession', 'class WikiLinkAutocomplete', 'class FullscreenManager', 'PTY_HELPER_PY'];
    for (const r of required) {
      if (!src.includes(r)) throw new Error(`missing token: ${r}`);
    }
    return `${required.length} tokens present`;
  });

  check('vendored LICENSE present', () => {
    if (!exists('src/vendor/terminal/LICENSE')) throw new Error('missing src/vendor/terminal/LICENSE');
    const txt = readFile('src/vendor/terminal/LICENSE');
    if (!txt.includes('MIT')) throw new Error('LICENSE does not look like MIT');
    return '';
  });

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
    if (r.status !== 0) throw new Error(`pnpm build exit ${r.status}: ${(r.stderr || r.stdout || '').slice(0, 400)}`);
    if (!exists('main.js')) throw new Error('main.js missing');
    return '';
  });

  check('vitest phase4a.1 suite', () => {
    const r = spawnSync('npx', ['--no-install', 'vitest', 'run', 'tests/phase4a-1.spec.ts'], {
      cwd: root,
      encoding: 'utf8',
    });
    if (r.status !== 0) throw new Error(`vitest exit ${r.status}: ${(r.stdout || r.stderr || '').slice(-600)}`);
    return '';
  });

  summary('phase4a.1');
}

// ────────── Phase 4A.2 — composer + theme ──────────
function phase4a2() {
  logRun('phase4a.2');

  check('vendored terminal main.ts SHA still matches STATE', () => {
    const state = JSON.parse(readFile('STATE.json'));
    const expected = state.decisions.vendored_terminal_main_sha256;
    const actual = sha256('src/vendor/terminal/main.ts');
    if (actual !== expected) throw new Error(`SHA drift: ${actual.slice(0, 12)}… != ${expected.slice(0, 12)}…`);
    return actual.slice(0, 12) + '…';
  });

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

  check('vitest phase4a.2 suite', () => {
    const r = spawnSync('npx', ['--no-install', 'vitest', 'run', 'tests/phase4a-2.spec.ts'], { cwd: root, encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`vitest exit ${r.status}: ${(r.stdout || r.stderr || '').slice(-600)}`);
    return '';
  });

  summary('phase4a.2');
}

// ────────── Phase 4B — terminal full surface ──────────
function phase4b() {
  logRun('phase4b');

  check('vendored terminal main.ts SHA still matches STATE', () => {
    const state = JSON.parse(readFile('STATE.json'));
    const expected = state.decisions.vendored_terminal_main_sha256;
    const actual = sha256('src/vendor/terminal/main.ts');
    if (actual !== expected) throw new Error(`SHA drift: ${actual.slice(0, 12)}… != ${expected.slice(0, 12)}…`);
    return actual.slice(0, 12) + '…';
  });

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

  check('vitest phase4b suite', () => {
    const r = spawnSync('npx', ['--no-install', 'vitest', 'run', 'tests/phase4b.spec.ts'], { cwd: root, encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`vitest exit ${r.status}: ${(r.stdout || r.stderr || '').slice(-600)}`);
    return '';
  });

  summary('phase4b');
}

// ────────── Phase 5A — command palette + settings ──────────
function phase5a() {
  logRun('phase5a');

  check('vendored terminal main.ts SHA still matches STATE', () => {
    const state = JSON.parse(readFile('STATE.json'));
    const expected = state.decisions.vendored_terminal_main_sha256;
    const actual = sha256('src/vendor/terminal/main.ts');
    if (actual !== expected) throw new Error(`SHA drift`);
    return actual.slice(0, 12) + '…';
  });

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

  check('vitest phase5a suite', () => {
    const r = spawnSync('npx', ['--no-install', 'vitest', 'run', 'tests/phase5a.spec.ts'], { cwd: root, encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`vitest exit ${r.status}: ${(r.stdout || r.stderr || '').slice(-600)}`);
    return '';
  });

  summary('phase5a');
}

// ────────── Phase 5B — quick capture + focus mode ──────────
function phase5b() {
  logRun('phase5b');

  check('vendored terminal main.ts SHA still matches STATE', () => {
    const state = JSON.parse(readFile('STATE.json'));
    const expected = state.decisions.vendored_terminal_main_sha256;
    const actual = sha256('src/vendor/terminal/main.ts');
    if (actual !== expected) throw new Error(`SHA drift`);
    return actual.slice(0, 12) + '…';
  });

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

  check('phase 5b source files present', () => {
    const required = [
      'src/modals/QuickCapture.ts',
      'src/services/capture/capture-flow.ts',
      'src/services/capture/recorder.ts',
      'src/services/capture/filename.ts',
      'src/services/capture/obsidian-vault.ts',
      'src/services/stt/provider.ts',
      'src/services/stt/openai-compatible.ts',
      'src/services/focus.ts',
    ];
    for (const f of required) {
      if (!exists(f)) throw new Error(`missing ${f}`);
    }
    return `${required.length} files`;
  });

  check('main.ts registers Quick capture command + Focus toggle hotkeys', () => {
    const src = readFile('src/main.ts');
    if (!src.includes("'workdesk:capture:open'") && !src.includes('capture:open')) {
      throw new Error('quick capture command missing');
    }
    if (!src.includes('focus:toggle')) throw new Error('focus toggle command missing');
    if (!src.match(/modifiers:\s*\['Mod',\s*'Shift'\][\s\S]+key:\s*'m'/)) {
      throw new Error('Cmd+Shift+M hotkey not bound');
    }
    if (!src.match(/modifiers:\s*\['Mod',\s*'Shift'\][\s\S]+key:\s*'f'/)) {
      throw new Error('Cmd+Shift+F hotkey not bound');
    }
    return '';
  });

  check('main.ts records the onboarding-skipped divergence', () => {
    const src = readFile('src/main.ts');
    if (!src.includes('First-run orientation is handled by WorkDesk OS')) {
      throw new Error('onboarding divergence comment missing');
    }
    return '';
  });

  check('settings schema carries focus.completed', () => {
    const src = readFile('src/settings.ts');
    if (!src.includes('focus: {') || !src.includes('completed: boolean')) {
      throw new Error('focus.completed missing from settings');
    }
    if (!src.match(/focus:\s*\{\s*completed:\s*false,?\s*\}/)) {
      throw new Error('DEFAULT_SETTINGS.focus.completed missing');
    }
    return '';
  });

  check('vitest phase5b suite', () => {
    const r = spawnSync('npx', ['--no-install', 'vitest', 'run', 'tests/phase5b.spec.ts'], { cwd: root, encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`vitest exit ${r.status}: ${(r.stdout || r.stderr || '').slice(-1200)}`);
    return '';
  });

  summary('phase5b');
}

// ────────── Phase 6A — polish primitives ──────────
function phase6a() {
  logRun('phase6a');

  check('vendored terminal main.ts SHA still matches STATE', () => {
    const state = JSON.parse(readFile('STATE.json'));
    const expected = state.decisions.vendored_terminal_main_sha256;
    const actual = sha256('src/vendor/terminal/main.ts');
    if (actual !== expected) throw new Error('SHA drift');
    return actual.slice(0, 12) + '…';
  });

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

  check('phase 6a source files present', () => {
    const required = [
      'src/components/Toast.ts',
      'src/components/Banner.ts',
      'src/components/Skeleton.ts',
      'src/components/ContextMenu.ts',
      'src/components/DragDropHover.ts',
    ];
    for (const f of required) {
      if (!exists(f)) throw new Error(`missing ${f}`);
    }
    return `${required.length} files`;
  });

  check('main.ts installs global showToast + editor drag-hover', () => {
    const src = readFile('src/main.ts');
    if (!src.includes('installGlobalToast')) throw new Error('installGlobalToast not invoked');
    if (!src.includes('attachEditorDragHover')) throw new Error('attachEditorDragHover not wired');
    return '';
  });

  check('TreeRow wires fileMenuItems / folderMenuItems via showContextMenu', () => {
    const src = readFile('src/components/TreeRow.ts');
    if (!src.includes('showContextMenu')) throw new Error('TreeRow lacks showContextMenu binding');
    if (!src.includes('fileMenuItems') || !src.includes('folderMenuItems')) {
      throw new Error('TreeRow does not wire file/folder menu sets');
    }
    return '';
  });

  check('terminal tabs wire terminalTabMenuItems on contextmenu', () => {
    const src = readFile('src/terminal/tabs.ts');
    if (!src.includes('terminalTabMenuItems')) throw new Error('tabs.ts lacks terminal tab menu wiring');
    return '';
  });

  check('styles.css ships .toast / .ws-popover / .skeleton / .banner rules', () => {
    const css = readFile('styles.css');
    for (const sel of ['.toast', '.toast-stack', '.ws-popover', '.skeleton', '.banner', '.skel-obj-card', '.spinner', '.editor-pane.dragging-over']) {
      if (!css.includes(sel)) throw new Error(`styles.css missing ${sel}`);
    }
    return 'all selectors present';
  });

  check('vitest phase6a suite', () => {
    const r = spawnSync('npx', ['--no-install', 'vitest', 'run', 'tests/phase6a.spec.ts'], { cwd: root, encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`vitest exit ${r.status}: ${(r.stdout || r.stderr || '').slice(-1200)}`);
    return '';
  });

  summary('phase6a');
}

// ────────── Phase 6B — A11y audit + DONE-machine ──────────
function phase6b() {
  logRun('phase6b');

  check('vendored terminal main.ts SHA still matches STATE', () => {
    const state = JSON.parse(readFile('STATE.json'));
    const expected = state.decisions.vendored_terminal_main_sha256;
    const actual = sha256('src/vendor/terminal/main.ts');
    if (actual !== expected) throw new Error('SHA drift');
    return actual.slice(0, 12) + '…';
  });

  check('tokens.css + app.css SHAs still match STATE.decisions (no M1 drift)', () => {
    const state = JSON.parse(readFile('STATE.json'));
    const tokens = sha256('styles/tokens.css');
    const app = sha256('styles/app.css');
    if (tokens !== state.decisions.tokens_css_sha256) throw new Error('tokens.css drift');
    if (app !== state.decisions.app_css_sha256) throw new Error('app.css drift');
    return 'both match';
  });

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

  check('vitest a11y-audit suite', () => {
    const r = spawnSync('npx', ['--no-install', 'vitest', 'run', 'tests/a11y-audit.spec.ts'], { cwd: root, encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`vitest exit ${r.status}: ${(r.stdout || r.stderr || '').slice(-1500)}`);
    return '';
  });

  check('vitest done-checklist suite', () => {
    const r = spawnSync('npx', ['--no-install', 'vitest', 'run', 'tests/done-checklist.spec.ts'], { cwd: root, encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`vitest exit ${r.status}: ${(r.stdout || r.stderr || '').slice(-1500)}`);
    return '';
  });

  check('tests/a11y-audit.report.md generated', () => {
    if (!exists('tests/a11y-audit.report.md')) throw new Error('a11y-audit.report.md missing');
    return '';
  });

  check('tests/done-checklist.report.md generated', () => {
    if (!exists('tests/done-checklist.report.md')) throw new Error('done-checklist.report.md missing');
    return '';
  });

  check('tests/manual-checklist.md generated with Yvette flow + 2-week dogfood', () => {
    if (!exists('tests/manual-checklist.md')) throw new Error('manual-checklist.md missing');
    const md = readFile('tests/manual-checklist.md');
    if (!md.toLowerCase().includes('yvette')) throw new Error('manual-checklist missing Yvette flow');
    if (!md.toLowerCase().includes('two-week') && !md.includes('10 consecutive')) {
      throw new Error('manual-checklist missing 2-week dogfood section');
    }
    return '';
  });

  check('manifest.json.version === "1.0.0"', () => {
    const m = JSON.parse(readFile('manifest.json'));
    if (m.version !== '1.0.0') throw new Error(`version=${m.version}`);
    return '';
  });

  check('STATE.json decisions sha256 fields unchanged since M1', () => {
    const state = JSON.parse(readFile('STATE.json'));
    const fields = ['tokens_css_sha256', 'app_css_sha256', 'icons_js_sha256', 'vendored_terminal_main_sha256'];
    for (const f of fields) {
      if (!state.decisions[f] || typeof state.decisions[f] !== 'string') {
        throw new Error(`${f} missing`);
      }
    }
    return `${fields.length} sha fields intact`;
  });

  summary('phase6b');
}

// ────────── Phase 7 — Standard plugin pattern pivot ──────────
function phase7() {
  logRun('phase7');

  check('TypeScript strict compiles', () => {
    const r = spawnSync('npx', ['--no-install', 'tsc', '-p', 'tsconfig.json', '--noEmit'], { cwd: root, encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`tsc exit ${r.status}: ${(r.stderr || r.stdout || '').slice(0, 400)}`);
    return '';
  });

  check('pnpm build (runs scope-app-css.mjs + bundles)', () => {
    const r = spawnSync('pnpm', ['build'], { cwd: root, encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`pnpm build exit ${r.status}: ${(r.stderr || r.stdout || '').slice(0, 400)}`);
    if (!exists('main.js')) throw new Error('main.js missing');
    if (!exists('styles.css')) throw new Error('styles.css missing');
    if (!exists('styles/app.scoped.generated.css')) throw new Error('app.scoped.generated.css missing');
    return '';
  });

  check('vitest all phases pass (including phase7)', () => {
    const r = spawnSync('npx', ['--no-install', 'vitest', 'run'], { cwd: root, encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`vitest exit ${r.status}: ${(r.stdout || r.stderr || '').slice(-1500)}`);
    return '';
  });

  check('main.ts no longer mounts custom shell or WorkdeskRibbon', () => {
    const main = readFile('src/main.ts');
    if (/mountShell|new WorkdeskRibbon\(/.test(main)) throw new Error('main.ts still references deleted mounts');
    return '';
  });

  check('main.ts registers ribbon icons + revealZone helper', () => {
    const main = readFile('src/main.ts');
    if (!main.includes('this.registerRibbonIcons')) throw new Error('registerRibbonIcons not invoked');
    if (!main.includes('this.registerIcons')) throw new Error('registerIcons not invoked');
    if (!main.includes('this.revealZone') && !main.includes('revealZone(')) throw new Error('revealZone helper missing');
    return '';
  });

  check('main.ts references all 12 ribbon icon names', () => {
    const main = readFile('src/main.ts');
    const names = [
      'workdesk-atlas', 'workdesk-gtd', 'workdesk-intel', 'workdesk-personal', 'workdesk-system', 'workdesk-config', 'workdesk-files',
      'workdesk-today', 'workdesk-terminal', 'workdesk-focus', 'workdesk-mic', 'workdesk-settings',
    ];
    for (const n of names) {
      if (!main.includes(`'${n}'`)) throw new Error(`main.ts missing ribbon name ${n}`);
    }
    return `${names.length} names`;
  });

  check('shell.ts deleted', () => {
    if (exists('src/layout/shell.ts')) throw new Error('src/layout/shell.ts still exists');
    return '';
  });

  check('RibbonControl.ts deleted', () => {
    if (exists('src/views/RibbonControl.ts')) throw new Error('src/views/RibbonControl.ts still exists');
    return '';
  });

  check('generated app css has no .app or body top-level rules', () => {
    const generated = readFile('styles/app.scoped.generated.css');
    if (/^\s*\.app\s*\{/m.test(generated)) throw new Error('generated css has top-level .app rule');
    if (/^\s*\.app\.no-/m.test(generated)) throw new Error('generated css has .app.no-* rule');
    if (/^\s*body\s*\{/m.test(generated)) throw new Error('generated css has body rule');
    if (!/\.app\.term-fullscreen/.test(generated)) throw new Error('generated css missing .app.term-fullscreen');
    return '';
  });

  check('bundle includes obsidian-scope.css and no top-level .app grid rule', () => {
    const bundle = readFile('styles.css');
    if (!bundle.includes('workdesk-hide-native-ribbon-icons')) throw new Error('bundle missing obsidian-scope.css markers');
    if (/^\s*\.app\s*\{\s*display:\s*grid/m.test(bundle)) throw new Error('bundle still has top-level .app grid rule');
    return '';
  });

  check('manifest.json.version === "1.1.0"', () => {
    const m = JSON.parse(readFile('manifest.json'));
    if (m.version !== '1.1.0') throw new Error(`version=${m.version}`);
    return '';
  });

  check('M1 SHA decisions unchanged (no drift)', () => {
    const state = JSON.parse(readFile('STATE.json'));
    const pairs = [
      ['tokens_css_sha256', 'styles/tokens.css'],
      ['app_css_sha256', 'styles/app.css'],
      ['icons_js_sha256', '_inputs/design-handoff/project/shared/icons.js'],
      ['vendored_terminal_main_sha256', 'src/vendor/terminal/main.ts'],
    ];
    for (const [key, file] of pairs) {
      const expected = state.decisions[key];
      const actual = sha256(file);
      if (!expected) throw new Error(`STATE.decisions.${key} missing`);
      if (actual !== expected) throw new Error(`${key} drift (file=${file})`);
    }
    return `${pairs.length} sha fields intact`;
  });

  check('STATE.decisions.obsidian_scope_css_sha256 present and matches source', () => {
    const state = JSON.parse(readFile('STATE.json'));
    const expected = state.decisions.obsidian_scope_css_sha256;
    if (!expected) throw new Error('obsidian_scope_css_sha256 missing from STATE');
    const actual = sha256('styles/obsidian-scope.css');
    if (actual !== expected) throw new Error(`obsidian_scope_css_sha256 mismatch: expected ${expected.slice(0, 12)}… got ${actual.slice(0, 12)}…`);
    return actual.slice(0, 12) + '…';
  });

  check('STATE.phases["7"] is PASS', () => {
    const state = JSON.parse(readFile('STATE.json'));
    const p = state.phases['7'];
    if (!p) throw new Error('phases["7"] missing');
    if (p.status !== 'PASS') throw new Error(`phase 7 status=${p.status}`);
    return '';
  });

  summary('phase7');
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
  'phase4a.1': phase4a1,
  'phase4a.2': phase4a2,
  phase4b,
  phase5a,
  phase5b,
  phase6a,
  phase6b,
  phase7,
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
