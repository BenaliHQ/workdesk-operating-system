// Outline panel — reads the active file's headings live.
//
// One .rp-outline-row per heading, indent class derived from heading level
// (h1, h2, h3, h4).

import type { App, TFile } from 'obsidian';

export interface OutlineEntry {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
  line: number;
}

export function parseHeadings(markdown: string): OutlineEntry[] {
  const out: OutlineEntry[] = [];
  const lines = markdown.split(/\r?\n/);
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (/^```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (m && m[1] && m[2]) {
      const level = m[1].length as OutlineEntry['level'];
      out.push({ level, text: m[2], line: i });
    }
  }
  return out;
}

export function renderOutline(parent: HTMLElement, entries: OutlineEntry[]): HTMLElement {
  parent.replaceChildren();
  parent.classList.add('rp-body');
  parent.dataset.pane = 'outline';

  const label = document.createElement('div');
  label.className = 'rp-section-label';
  label.textContent = `OUTLINE · ${entries.length}`;
  parent.appendChild(label);

  if (entries.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'rp-empty';
    empty.textContent = 'No headings.';
    parent.appendChild(empty);
    return parent;
  }

  for (const entry of entries) {
    const row = document.createElement('div');
    row.className = `rp-outline-row h${entry.level}`;
    row.dataset.line = String(entry.line);
    row.textContent = entry.text;
    parent.appendChild(row);
  }
  return parent;
}

export async function loadOutline(app: App, file: TFile | null): Promise<OutlineEntry[]> {
  if (!file) return [];
  const text = await app.vault.cachedRead(file);
  return parseHeadings(text);
}
