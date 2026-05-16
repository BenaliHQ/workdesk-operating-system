// Backlinks panel — lists every note that links to the active file.
//
// Renders into a .rp-body shell with .rp-section-label header and one
// .rp-link row per backlink. Context excerpts wrap the matched term in
// <em> per design's components.md § rp-body.

import type { App, TFile } from 'obsidian';

export interface BacklinkEntry {
  notePath: string;
  noteName: string;
  excerpt: string;
  matchText: string;
}

export function renderBacklinks(parent: HTMLElement, entries: BacklinkEntry[]): HTMLElement {
  parent.replaceChildren();
  parent.classList.add('rp-body');
  parent.dataset.pane = 'backlinks';

  const label = activeDocument.createDiv();
  label.className = 'rp-section-label';
  label.textContent = `BACKLINKS · ${entries.length}`;
  parent.appendChild(label);

  if (entries.length === 0) {
    const empty = activeDocument.createDiv();
    empty.className = 'rp-empty';
    empty.textContent = 'No backlinks yet.';
    parent.appendChild(empty);
    return parent;
  }

  for (const entry of entries) {
    const row = activeDocument.createDiv();
    row.className = 'rp-link';
    row.dataset.path = entry.notePath;

    const glyph = activeDocument.createSpan();
    glyph.className = 'rp-link-glyph';
    glyph.textContent = '↩';
    row.appendChild(glyph);

    const body = activeDocument.createDiv();
    body.className = 'rp-link-body';

    const name = activeDocument.createSpan();
    name.className = 'rp-link-name';
    name.textContent = entry.noteName;
    body.appendChild(name);

    const ctx = activeDocument.createDiv();
    ctx.className = 'ctx';
    appendHighlightedMatch(ctx, entry.excerpt, entry.matchText);
    body.appendChild(ctx);

    row.appendChild(body);
    parent.appendChild(row);
  }

  return parent;
}

export function collectBacklinks(app: App, file: TFile | null): BacklinkEntry[] {
  if (!file) return [];
  const out: BacklinkEntry[] = [];
  const metadata = app.metadataCache;
  const resolved = (metadata as unknown as { resolvedLinks?: Record<string, Record<string, number>> }).resolvedLinks;
  if (!resolved) return out;
  const target = file.path;
  for (const [source, links] of Object.entries(resolved)) {
    if (source === target) continue;
    if (links[target] && links[target] > 0) {
      const base = source.split('/').pop()?.replace(/\.md$/, '') ?? source;
      out.push({
        notePath: source,
        noteName: base,
        excerpt: `Links to ${file.basename}`,
        matchText: file.basename,
      });
    }
  }
  return out;
}

function appendHighlightedMatch(parent: HTMLElement, excerpt: string, term: string): void {
  if (!term) { parent.appendText(excerpt); return; }
  const idx = excerpt.toLowerCase().indexOf(term.toLowerCase());
  if (idx < 0) { parent.appendText(excerpt); return; }
  parent.appendText(excerpt.slice(0, idx));
  const em = activeDocument.createEl('em');
  em.textContent = excerpt.slice(idx, idx + term.length);
  parent.appendChild(em);
  parent.appendText(excerpt.slice(idx + term.length));
}
