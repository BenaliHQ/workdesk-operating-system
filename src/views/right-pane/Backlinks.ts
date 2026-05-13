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

  const label = document.createElement('div');
  label.className = 'rp-section-label';
  label.textContent = `BACKLINKS · ${entries.length}`;
  parent.appendChild(label);

  if (entries.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'rp-empty';
    empty.textContent = 'No backlinks yet.';
    parent.appendChild(empty);
    return parent;
  }

  for (const entry of entries) {
    const row = document.createElement('div');
    row.className = 'rp-link';
    row.dataset.path = entry.notePath;

    const glyph = document.createElement('span');
    glyph.className = 'rp-link-glyph';
    glyph.textContent = '↩';
    row.appendChild(glyph);

    const body = document.createElement('div');
    body.className = 'rp-link-body';

    const name = document.createElement('span');
    name.className = 'rp-link-name';
    name.textContent = entry.noteName;
    body.appendChild(name);

    const ctx = document.createElement('div');
    ctx.className = 'ctx';
    ctx.innerHTML = highlightMatch(entry.excerpt, entry.matchText);
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

function highlightMatch(excerpt: string, term: string): string {
  if (!term) return escapeHtml(excerpt);
  const idx = excerpt.toLowerCase().indexOf(term.toLowerCase());
  if (idx < 0) return escapeHtml(excerpt);
  const before = escapeHtml(excerpt.slice(0, idx));
  const match = escapeHtml(excerpt.slice(idx, idx + term.length));
  const after = escapeHtml(excerpt.slice(idx + term.length));
  return `${before}<em>${match}</em>${after}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
