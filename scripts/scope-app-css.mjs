#!/usr/bin/env node
// Build-time CSS scoper for M4 (standard plugin pattern pivot).
//
// Reads styles/app.css (SHA-locked source) and writes
// styles/app.scoped.generated.css with destructive global selectors stripped:
//
//   - `body { ... }`, `html { ... }`, `* ...` rules are dropped.
//   - `.app { ... }`, `.app .x`, `.app.no-left`, `.app.no-right` rules are
//     dropped (these are the layout selectors that fight Obsidian's chrome).
//   - `.app.term-fullscreen` rules are KEPT — the terminal fullscreen overlay
//     in src/terminal/fullscreen.ts depends on them and is preserved byte-exact
//     for M4.
//   - All other rules (plugin-owned classes like .pane, .obj, .tree-row,
//     .terminal-body, etc.) survive untouched.
//   - @keyframes and @font-face blocks emit verbatim.
//   - @media and @supports blocks recurse: same drop predicate applies to each
//     nested rule. Block dropped entirely if nothing survives inside.
//
// Hand-rolled tokenizer — no external deps. Phase 0's verify step rejects ^/~
// in deps, and the source has flat enough structure that a small block-aware
// parser is sufficient.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SRC = path.join(root, 'styles/app.css');
const OUT = path.join(root, 'styles/app.scoped.generated.css');

const css = fs.readFileSync(SRC, 'utf8');

/**
 * Decide whether a single selector (already trimmed, no commas) should be
 * dropped. Returns true to drop, false to keep.
 */
function shouldDropSelector(sel) {
  const s = sel.trim();
  if (!s) return true;

  // body / html / universal — drop.
  if (/^body\b/.test(s)) return true;
  if (/^html\b/.test(s)) return true;
  if (/^\*(\s|$)/.test(s)) return true;

  // .app.term-fullscreen — whitelist. Keep these rules so the terminal
  // fullscreen overlay continues to work.
  if (/^\.app\.term-fullscreen(\b|\.|\s|:)/.test(s)) return false;

  // .app ... (any descendant or modifier) — drop.
  // Matches: `.app`, `.app .x`, `.app.no-left`, `.app.no-right`,
  //          `.app.no-left.no-right`, `.app:focus`, etc.
  if (/^\.app(\s|\.|:|$|,)/.test(s)) return true;

  return false;
}

/**
 * Parse a top-level CSS string into a sequence of tokens:
 *   { kind: 'rule', selector, body }      — regular rule
 *   { kind: 'at-block', name, prelude, body, raw } — @media/@supports/@keyframes/@font-face
 *   { kind: 'at-statement', raw }         — @import, @charset, etc. (terminated by ;)
 *   { kind: 'comment', raw }              — /* ... *\/
 *
 * `body` is the inner content between the matching braces (without the braces).
 * Brace matching is balanced; nested blocks inside @media are preserved.
 */
function tokenize(input) {
  const tokens = [];
  let i = 0;
  const n = input.length;

  while (i < n) {
    // Skip whitespace
    while (i < n && /\s/.test(input[i])) i++;
    if (i >= n) break;

    // Comment
    if (input[i] === '/' && input[i + 1] === '*') {
      const end = input.indexOf('*/', i + 2);
      if (end === -1) {
        tokens.push({ kind: 'comment', raw: input.slice(i) });
        i = n;
        break;
      }
      tokens.push({ kind: 'comment', raw: input.slice(i, end + 2) });
      i = end + 2;
      continue;
    }

    // At-rule
    if (input[i] === '@') {
      // Read name + prelude until '{' or ';'
      let j = i;
      while (j < n && input[j] !== '{' && input[j] !== ';') j++;
      const head = input.slice(i, j);
      const nameMatch = head.match(/^@([a-zA-Z-]+)/);
      const name = nameMatch ? nameMatch[1] : '';
      const prelude = head.slice(1 + name.length).trim();

      if (j >= n) {
        tokens.push({ kind: 'at-statement', raw: input.slice(i) });
        i = n;
        break;
      }

      if (input[j] === ';') {
        tokens.push({ kind: 'at-statement', raw: input.slice(i, j + 1) });
        i = j + 1;
        continue;
      }

      // input[j] === '{' — block at-rule. Find matching '}'.
      const bodyStart = j + 1;
      let depth = 1;
      let k = bodyStart;
      while (k < n && depth > 0) {
        const ch = input[k];
        if (ch === '{') depth++;
        else if (ch === '}') depth--;
        if (depth > 0) k++;
      }
      const body = input.slice(bodyStart, k);
      tokens.push({
        kind: 'at-block',
        name,
        prelude,
        body,
        raw: input.slice(i, k + 1),
      });
      i = k + 1;
      continue;
    }

    // Regular rule: selector { body }
    // Read until '{' (skipping strings, comments inside).
    let j = i;
    while (j < n && input[j] !== '{') {
      if (input[j] === '/' && input[j + 1] === '*') {
        const end = input.indexOf('*/', j + 2);
        if (end === -1) { j = n; break; }
        j = end + 2;
        continue;
      }
      j++;
    }
    if (j >= n) break;
    const selector = input.slice(i, j).trim();
    const bodyStart = j + 1;
    let depth = 1;
    let k = bodyStart;
    while (k < n && depth > 0) {
      const ch = input[k];
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      if (depth > 0) k++;
    }
    const body = input.slice(bodyStart, k);
    tokens.push({ kind: 'rule', selector, body });
    i = k + 1;
  }

  return tokens;
}

/**
 * For a rule's selector list, keep only the selectors that survive the drop
 * predicate. Returns the joined survivors, or '' if none survive.
 */
function filterSelectorList(selectorList) {
  const parts = selectorList.split(',').map((s) => s.trim()).filter(Boolean);
  const survivors = parts.filter((sel) => !shouldDropSelector(sel));
  return survivors.join(', ');
}

/**
 * Emit a token to the output stream. Handles rules, at-blocks (with recursion
 * for @media/@supports), at-statements, and comments.
 */
function emit(token) {
  if (token.kind === 'comment') return token.raw;
  if (token.kind === 'at-statement') return token.raw;
  if (token.kind === 'rule') {
    const survivingSelector = filterSelectorList(token.selector);
    if (!survivingSelector) return '';
    return `${survivingSelector} {${token.body}}`;
  }
  // at-block
  if (token.kind === 'at-block') {
    if (token.name === 'keyframes' || token.name === 'font-face') {
      // Emit verbatim — these don't have layout selectors.
      return token.raw;
    }
    if (token.name === 'media' || token.name === 'supports') {
      // Recurse into the body, apply same drop predicate.
      const innerTokens = tokenize(token.body);
      const innerOut = innerTokens.map(emit).filter(Boolean).join('\n');
      if (!innerOut.trim()) return ''; // nothing survived — drop the whole block
      return `@${token.name} ${token.prelude} {\n${innerOut}\n}`;
    }
    // Unknown at-block — emit verbatim to be safe.
    return token.raw;
  }
  return '';
}

const tokens = tokenize(css);
const out = tokens.map(emit).filter(Boolean).join('\n\n');

const header = `/* GENERATED — do not edit. Source: styles/app.css.
 * Produced by scripts/scope-app-css.mjs at build time.
 * Destructive layout selectors (body, html, .app, .app.no-*) are stripped.
 * .app.term-fullscreen rules are preserved for the terminal fullscreen overlay.
 */\n\n`;

fs.writeFileSync(OUT, header + out + '\n', 'utf8');
console.log(`[scope-app-css] wrote ${path.relative(root, OUT)} (${out.length} bytes)`);
