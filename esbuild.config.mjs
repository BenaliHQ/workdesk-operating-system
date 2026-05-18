#!/usr/bin/env node
// Bundles src/main.ts → main.js (cjs, external obsidian) and
// concatenates styles/{fonts,tokens,app,reduced-motion}.css → styles.css.

import esbuild from 'esbuild';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Obsidian loads `styles.css` by inlining it into a <style> element, which
// means relative `url(...)` references in @font-face resolve against the
// document URL (`app://obsidian.md/...`) instead of the plugin folder, so
// the woff2 files 404. Inlining the fonts as base64 data URIs at build
// time sidesteps the path-resolution problem entirely. ~330KB stylesheet
// hit is acceptable for a desktop-only plugin.
function inlineFontUrls(css, baseDir) {
  return css.replace(/url\(['"]?(fonts\/[^'")]+\.woff2)['"]?\)/g, (match, relPath) => {
    const fontPath = resolve(baseDir, relPath);
    if (!existsSync(fontPath)) {
      console.warn(`[inline-fonts] missing ${relPath}; leaving url() unchanged`);
      return match;
    }
    const b64 = readFileSync(fontPath).toString('base64');
    return `url('data:font/woff2;base64,${b64}')`;
  });
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const dev = process.argv.includes('--dev');

// M4 — build-time CSS scoping. Strips destructive global selectors from
// styles/app.css and writes styles/app.scoped.generated.css. The bundle
// consumes the generated file instead of the source app.css.
execSync('node scripts/scope-app-css.mjs', { stdio: 'inherit', cwd: __dirname });

const cssOrder = [
  'styles/fonts.css',
  'styles/tokens.css',
  // Vendored vin terminal stylesheet (see src/vendor/workdesk-terminal/
  // NOTICE.md). Includes the upstream xterm.js structural rules
  // (.xterm-viewport / .xterm-screen / .xterm-helper-textarea positioning)
  // inlined at the top, plus all `.vin-terminal-*` styling. Bundled before
  // app.scoped.generated.css so any future app.css overrides win on cascade.
  'src/vendor/workdesk-terminal/styles.css',
  'styles/app.scoped.generated.css',
  'styles/reduced-motion.css',
  'styles/obsidian-scope.css',
];
const concatenated = cssOrder
  .map((p) => {
    const full = resolve(__dirname, p);
    if (!existsSync(full)) return `/* ${p} missing */`;
    return `/* ===== ${p} ===== */\n${readFileSync(full, 'utf8')}`;
  })
  .join('\n\n');
const inlined = inlineFontUrls(concatenated, __dirname);
writeFileSync(resolve(__dirname, 'styles.css'), inlined, 'utf8');

await esbuild.build({
  entryPoints: ['src/main.ts'],
  outfile: 'main.js',
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'ES2022',
  loader: { '.yaml': 'text' },
  external: [
    'obsidian',
    'electron',
    '@codemirror/*',
    '@lezer/*',
    'fs',
    'os',
    'path',
    'child_process',
    'node:fs',
    'node:os',
    'node:path',
    'node:child_process',
  ],
  sourcemap: dev,
  minify: !dev,
  logLevel: 'info',
});
