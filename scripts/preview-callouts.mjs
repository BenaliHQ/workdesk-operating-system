#!/usr/bin/env node
// scripts/preview-callouts.mjs
//
// Renders a static HTML preview of the plugin's callout + wikilink styles
// using the freshly-built styles.css, screenshots it via headless Chrome,
// and writes the PNG to _inputs/callout-preview-<timestamp>.png.
//
// Pre-release visual gate (see CLAUDE.md § UI visual-verification gate):
// run this before tagging any release that touches callout or link styling
// so the operator confirms the actual rendered look before BRAT picks it up.
//
//   pnpm preview-callouts          # uses repo-root styles.css
//
// No npm deps — shells out to /Applications/Google Chrome.app for screenshots.

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const STYLES_CSS = resolve(REPO_ROOT, 'styles.css');
const OUT_DIR = resolve(REPO_ROOT, '_inputs');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

if (!existsSync(STYLES_CSS)) {
  console.error(`✗ styles.css not found at ${STYLES_CSS}. Run \`pnpm build\` first.`);
  process.exit(1);
}
if (!existsSync(CHROME)) {
  console.error(`✗ Google Chrome not found at ${CHROME}. Install Chrome or edit this script to point at another Chromium binary.`);
  process.exit(1);
}
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const stylesCss = readFileSync(STYLES_CSS, 'utf8');

const calloutTypes = [
  { type: 'note',    title: 'Note title',    icon: '✎' },
  { type: 'info',    title: 'Info title',    icon: 'i' },
  { type: 'success', title: 'Success title', icon: '✓' },
  { type: 'warning', title: 'Warning title', icon: '!' },
  { type: 'failure', title: 'Failure title', icon: '✕' },
  { type: 'question',title: 'Question title',icon: '?' },
];

const callouts = calloutTypes.map(({ type, title, icon }) => `
  <div class="callout" data-callout="${type}">
    <div class="callout-title">
      <div class="callout-icon"><span>${icon}</span></div>
      <div class="callout-title-inner">${title}</div>
    </div>
    <div class="callout-content"><p>Body line one. Lorem ipsum dolor sit amet.</p></div>
  </div>`).join('\n');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>WorkDesk plugin — visual surface preview</title>
<style>
${stylesCss}

/* Preview harness — minimal styling outside the plugin's CSS.
   The .surface element below sits INSIDE the container-scoped token block,
   so var(--background-primary), var(--text-normal), and the font tokens
   all resolve to the workdesk values when painted. */
html, body { margin: 0; padding: 0; }
.surface {
  min-height: 100vh;
  background: var(--background-primary);
  color: var(--text-normal);
  font-family: var(--ws-font-sans);
  font-size: var(--ws-fs-15);
  line-height: var(--ws-lh-15);
}
.preview-frame {
  max-width: 760px;
  margin: 0 auto;
  padding: 48px 24px 64px;
}
.section-label {
  font-family: var(--ws-font-display);
  font-size: var(--ws-fs-11);
  font-weight: 600;
  color: var(--text-faint);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin: 40px 0 14px;
}
.section-label:first-child { margin-top: 0; }
.callout-icon span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  font-weight: 600;
}
.preview-h1 {
  font-family: var(--ws-font-display);
  font-weight: 600;
  font-size: var(--ws-fs-28);
  line-height: var(--ws-lh-28);
  letter-spacing: -0.012em;
  margin: 0 0 12px;
  color: var(--text-normal);
}
.preview-h2 {
  font-family: var(--ws-font-display);
  font-weight: 600;
  font-size: var(--ws-fs-20);
  line-height: var(--ws-lh-20);
  letter-spacing: -0.008em;
  margin: 24px 0 8px;
  color: var(--text-normal);
}
.preview-body p {
  margin: 0 0 12px;
  color: var(--text-normal);
}
.preview-code {
  font-family: var(--ws-font-mono);
  font-size: 13px;
  background: var(--code-background);
  color: var(--code-normal);
  padding: 12px 14px;
  border-radius: 8px;
  border: 1px solid var(--background-modifier-border);
  margin: 12px 0;
  white-space: pre-wrap;
}
.wikilink-row {
  margin-top: 8px;
  font-size: var(--ws-fs-15);
  line-height: 1.7;
}
.swatch-row { display: flex; gap: 8px; flex-wrap: wrap; }
.swatch {
  width: 88px;
  padding: 10px 12px;
  border-radius: 8px;
  font-family: var(--ws-font-mono);
  font-size: 11px;
  border: 1px solid var(--background-modifier-border);
}
.sw-atlas    { background: var(--ws-zone-atlas-bg);    color: var(--ws-zone-atlas-fg); }
.sw-gtd      { background: var(--ws-zone-gtd-bg);      color: var(--ws-zone-gtd-fg); }
.sw-intel    { background: var(--ws-zone-intel-bg);    color: var(--ws-zone-intel-fg); }
.sw-personal { background: var(--ws-zone-personal-bg); color: var(--ws-zone-personal-fg); }
.sw-system   { background: var(--ws-zone-system-bg);   color: var(--ws-zone-system-fg); }
.sw-config   { background: var(--ws-zone-config-bg);   color: var(--ws-zone-config-fg); }
.sw-files    { background: var(--ws-zone-files-bg);    color: var(--ws-zone-files-fg); }
</style>
</head>
<body class="theme-light workdesk-os-active">
  <div class="workspace-leaf-content" data-type="markdown">
    <div class="surface">
      <div class="markdown-reading-view">
        <div class="markdown-rendered">
          <div class="preview-frame">

            <div class="section-label">Surface · typography</div>
            <h1 class="preview-h1">WorkDesk plugin visual surface</h1>
            <h2 class="preview-h2">Cream-amber palette, Manrope display, DM Sans body</h2>
            <div class="preview-body">
              <p>This is body text in DM Sans on the warm-tinted editor surface. The page background is <code>var(--background-primary)</code> — <code>oklch(99.6% 0.004 75)</code> — a cream-white that shares the 75-hue with every other surface token.</p>
              <p>The display font is Manrope; the mono font (used below) is Geist Mono. All three faces are inlined as base64 woff2 in the plugin bundle.</p>
              <div class="preview-code">// Geist Mono renders here
const surface = "cream-amber";
const fonts = { sans: "DM Sans", display: "Manrope", mono: "Geist Mono" };</div>
            </div>

            <div class="section-label">Zone palette swatches</div>
            <div class="swatch-row">
              <div class="swatch sw-atlas">atlas</div>
              <div class="swatch sw-gtd">gtd</div>
              <div class="swatch sw-intel">intel</div>
              <div class="swatch sw-personal">personal</div>
              <div class="swatch sw-system">system</div>
              <div class="swatch sw-config">config</div>
              <div class="swatch sw-files">files</div>
            </div>

            <div class="section-label">Callouts — six role colors</div>
            ${callouts}

            <div class="section-label">Wikilinks</div>
            <div class="wikilink-row">
              A reference to <a class="internal-link" href="#">an-internal-note</a>
              renders in atlas-blue with a dotted underline. Hover paints a
              tinted atlas background. An <a class="external-link" href="#">external link</a>
              keeps Obsidian defaults so the internal/external distinction reads at a glance.
            </div>

          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
`;

const stamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
const htmlPath = resolve(OUT_DIR, `callout-preview-${stamp}.html`);
const pngPath = resolve(OUT_DIR, `callout-preview-${stamp}.png`);

writeFileSync(htmlPath, html, 'utf8');

const args = [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--no-sandbox',
  `--screenshot=${pngPath}`,
  '--window-size=1280,1700',
  `file://${htmlPath}`,
];

try {
  execSync(`"${CHROME}" ${args.map((a) => `"${a}"`).join(' ')}`, {
    cwd: REPO_ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
} catch (err) {
  console.error('✗ Headless Chrome failed to capture screenshot.');
  console.error(err.stderr?.toString() || err.message);
  process.exit(1);
}

console.log(`✓ Preview HTML : ${htmlPath}`);
console.log(`✓ Screenshot   : ${pngPath}`);
console.log('');
console.log('Surface this screenshot to the operator before tagging a release.');
