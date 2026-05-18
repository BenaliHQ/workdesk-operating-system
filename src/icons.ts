// WorkDesk icon set — Lucide-style stroke icons, 24×24 viewBox.
// Ported verbatim from _inputs/design-handoff/project/shared/icons.js.
// Use ICONS[name] for inner SVG path, or wsSvg(name, size) for a full <svg>.

import type { IconName } from './types';

export const ICONS: Record<IconName, string> = {
  /* zone glyphs */
  globe:    '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  check:    '<path d="m5 12 5 5L20 7"/>',
  signal:   '<path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="0.6" fill="currentColor" stroke="none"/>',
  person:   '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  layers:   '<path d="m12 2 10 5-10 5L2 7Z"/><path d="m2 12 10 5 10-5"/><path d="m2 17 10 5 10-5"/>',
  gear:     '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
  files:    '<path d="M4 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/><path d="M9 13h8M9 17h6"/>',

  /* tree glyphs */
  folder:   '<path d="M4 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/>',
  file:     '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>',
  chevron:  '<path d="m9 6 6 6-6 6"/>',
  chevDown: '<path d="m6 9 6 6 6-6"/>',

  /* object glyphs */
  building: '<path d="M3 21V7l9-4 9 4v14"/><path d="M9 21V11h6v10M3 21h18"/>',
  video:    '<path d="M3 7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="m17 9 4-2v10l-4-2"/>',
  badge:    '<path d="M8 12.5 11 15.5 16 9.5"/><circle cx="12" cy="12" r="9"/>',
  pencil:   '<path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16Z"/><path d="m13.5 6.5 4 4"/>',
  book:     '<path d="M4 19V5a2 2 0 0 1 2-2h14v18H6a2 2 0 0 1-2-2Zm0 0a2 2 0 0 1 2-2h14"/>',
  sun:      '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M5 5l1.4 1.4M17.6 17.6 19 19M2 12h2M20 12h2M5 19l1.4-1.4M17.6 6.4 19 5"/>',
  moon:     '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>',
  inbox:    '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"/>',
  list:     '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  clock:    '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  archive:  '<rect x="3" y="3" width="18" height="5" rx="1"/><path d="M5 8v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8M9 13h6"/>',
  code:     '<path d="m4 17 6-6-6-6M12 19h8"/>',
  zap:      '<path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z"/>',
  shield:   '<path d="M12 2 4 5v6a10 10 0 0 0 8 11 10 10 0 0 0 8-11V5l-8-3Z"/>',
  feather:  '<path d="M20 4a7 7 0 0 0-10 0L4 10v10h10l6-6a7 7 0 0 0 0-10Z"/><path d="M16 8 2 22M17 15H9"/>',

  /* chrome glyphs */
  search:   '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>',
  focus:    '<circle cx="12" cy="12" r="3"/><path d="M3 12a9 9 0 0 1 18 0 9 9 0 0 1-18 0Z"/>',
  mic:      '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  panelL:   '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
  panelR:   '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/>',
  link:     '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
  outline:  '<path d="M4 6h4M4 12h7M4 18h5M12 6h8M14 12h6M16 18h4"/>',
  collapse: '<path d="m4 9 8-5 8 5M4 15l8 5 8-5"/>',
  plus:     '<path d="M12 5v14M5 12h14"/>',
  sort:     '<path d="M3 6h13M3 12h9M3 18h5M17 8V4M17 4l-3 3M17 4l3 3"/>',
  more:     '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
  close:    '<path d="M6 6l12 12M18 6 6 18"/>',
  doubleR:  '<path d="m13 6 6 6-6 6M5 6l6 6-6 6"/>',
  doubleL:  '<path d="m11 6-6 6 6 6M19 6l-6 6 6 6"/>',
  newNote:  '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9"/><path d="M14 3v6h6M12 13v6M9 16h6"/>',
  folderPlus: '<path d="M4 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/><path d="M12 11v6M9 14h6"/>',
  sliders:  '<path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4"/>',
  help:     '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 3.5"/><path d="M12 17.5h.01"/>',
  warn:     '<path d="m12 3 10 18H2Z"/><path d="M12 10v4M12 18h.01"/>',
  upload:   '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  command:  '<path d="M9 6a3 3 0 1 0 0 6h12M15 18a3 3 0 1 0 0-6H3M15 6a3 3 0 1 1 0 6H3M9 18a3 3 0 1 1 0-6h12"/>',
  enter:    '<path d="M9 10h10V4M19 10l-9 9-7-7"/>',
  hash:     '<path d="M5 9h14M5 15h14M10 3 8 21M16 3l-2 18"/>',
  trash:    '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
  copy:     '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  expand:   '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
  contract: '<path d="M21 9h-6V3M3 15h6v6M14 10l7-7M10 14l-7 7"/>',
  send:     '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
};

export function wsSvg(name: IconName, size = 16, extraAttrs = ''): string {
  const inner = ICONS[name] || '';
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" ${extraAttrs}>${inner}</svg>`;
}

// Builds the SVG via createElementNS so callers can append the element
// directly without violating obsidianmd's no-innerHTML rule. The ICONS map
// is hardcoded — its values are tiny lists of `<path/>`, `<circle/>`, and
// `<rect/>` elements with stable attribute shapes — so a small regex-based
// parser handles them without dragging in DOMParser (which produces
// cross-document nodes that happy-dom rejects).
const SVG_NS = 'http://www.w3.org/2000/svg';
const TAG_RE = /<(\w+)\s+([^/]*?)\/>/g;
const ATTR_RE = /(\w[\w-]*)\s*=\s*"([^"]*)"/g;

export function wsSvgEl(name: IconName, size = 16): SVGElement {
  const svg = activeDocument.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.75');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  const inner = ICONS[name] ?? '';
  for (const match of inner.matchAll(TAG_RE)) {
    const child = activeDocument.createElementNS(SVG_NS, match[1]);
    for (const attr of match[2].matchAll(ATTR_RE)) {
      child.setAttribute(attr[1], attr[2]);
    }
    svg.appendChild(child);
  }
  return svg;
}
