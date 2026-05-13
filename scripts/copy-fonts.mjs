#!/usr/bin/env node
// Copies the eight variable-font .woff2 files from node_modules/@fontsource-variable/
// into fonts/. Records SHA-256 of each into STATE.json `decisions.font_shas`.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fontsDir = path.join(root, 'fonts');
fs.mkdirSync(fontsDir, { recursive: true });

// We want a fixed weight per .woff2 file. @fontsource-variable ships one
// per axis-range; we copy the "latin" full-range file and rename per
// weight slot. The browser still resolves correct weight from the
// font-weight axis inside the variable file.
const slots = [
  { family: '@fontsource-variable/dm-sans', weight: 400, out: 'dm-sans-400.woff2' },
  { family: '@fontsource-variable/dm-sans', weight: 500, out: 'dm-sans-500.woff2' },
  { family: '@fontsource-variable/dm-sans', weight: 600, out: 'dm-sans-600.woff2' },
  { family: '@fontsource-variable/manrope', weight: 500, out: 'manrope-500.woff2' },
  { family: '@fontsource-variable/manrope', weight: 600, out: 'manrope-600.woff2' },
  { family: '@fontsource-variable/manrope', weight: 700, out: 'manrope-700.woff2' },
  { family: '@fontsource-variable/geist-mono', weight: 400, out: 'geist-mono-400.woff2' },
  { family: '@fontsource-variable/geist-mono', weight: 500, out: 'geist-mono-500.woff2' },
];

const shas = {};

function pickWoff2(familyDir) {
  const filesRoot = path.join(familyDir, 'files');
  if (!fs.existsSync(filesRoot)) throw new Error(`files/ missing under ${familyDir}`);
  const candidates = fs
    .readdirSync(filesRoot)
    .filter((f) => f.endsWith('.woff2'))
    .map((f) => path.join(filesRoot, f))
    .sort();
  if (candidates.length === 0) throw new Error(`no .woff2 in ${filesRoot}`);
  // Prefer "latin-wght-normal" (the variable-axis full-range file).
  const variableAxis = candidates.find((p) => p.includes('latin-wght-normal'));
  return variableAxis ?? candidates[0];
}

for (const slot of slots) {
  const src = pickWoff2(path.join(root, 'node_modules', ...slot.family.split('/')));
  const dst = path.join(fontsDir, slot.out);
  fs.copyFileSync(src, dst);
  const sha = crypto.createHash('sha256').update(fs.readFileSync(dst)).digest('hex');
  shas[slot.out.replace('.woff2', '')] = sha;
  console.log(`[copy-fonts] ${slot.out} ← ${path.relative(root, src)}  sha=${sha.slice(0, 12)}…`);
}

// Update STATE.json if it exists.
const statePath = path.join(root, 'STATE.json');
if (fs.existsSync(statePath)) {
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  state.decisions.font_shas = shas;
  fs.writeFileSync(`${statePath}.tmp`, JSON.stringify(state, null, 2));
  fs.renameSync(`${statePath}.tmp`, statePath);
  console.log('[copy-fonts] recorded font shas in STATE.json');
}
