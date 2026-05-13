// CodeMirror 6 ViewPlugin that decorates [[wikilinks]] and #tags.
//
// In edit mode, app.css renders the brackets and # prefix as faint mono via
// pseudo-elements when the editor container has `.editor-body.edit-mode`.
// The decorations themselves attach .wikilink / .tag to the link text and
// tag content, matching the rendered-mode classes used by `.markdown-rendered`.

import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';

const wikilinkMark = Decoration.mark({ class: 'wikilink' });
const tagMark = Decoration.mark({ class: 'tag' });

const WIKILINK = /\[\[([^\[\]\n]+?)\]\]/g;
const TAG = /(^|[\s,;])#([A-Za-z][A-Za-z0-9/_-]*)/g;

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  for (const { from, to } of view.visibleRanges) {
    const text = view.state.doc.sliceString(from, to);
    for (const m of text.matchAll(WIKILINK)) {
      const start = from + (m.index ?? 0) + 2;       // skip "[["
      const end = start + m[1].length;
      builder.add(start, end, wikilinkMark);
    }
    for (const m of text.matchAll(TAG)) {
      const idx = m.index ?? 0;
      const lead = m[1].length;
      const start = from + idx + lead + 1;            // skip leading char(s) + "#"
      const end = start + m[2].length;
      builder.add(start, end, tagMark);
    }
  }
  return builder.finish();
}

export const wikilinkAndTagDecorations = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) { this.decorations = buildDecorations(view); }
    update(u: ViewUpdate): void {
      if (u.docChanged || u.viewportChanged) this.decorations = buildDecorations(u.view);
    }
  },
  { decorations: (v) => v.decorations },
);

// Plain-string decorator used by happy-dom tests. Returns the set of
// (class, start, end) ranges that the CodeMirror plugin would produce.
export interface DecorationRange { kind: 'wikilink' | 'tag'; start: number; end: number; text: string }

export function decorateText(text: string): DecorationRange[] {
  const out: DecorationRange[] = [];
  for (const m of text.matchAll(WIKILINK)) {
    const idx = m.index ?? 0;
    out.push({ kind: 'wikilink', start: idx + 2, end: idx + 2 + m[1].length, text: m[1] });
  }
  for (const m of text.matchAll(TAG)) {
    const idx = m.index ?? 0;
    const lead = m[1].length;
    out.push({ kind: 'tag', start: idx + lead + 1, end: idx + lead + 1 + m[2].length, text: m[2] });
  }
  return out.sort((a, b) => a.start - b.start);
}
