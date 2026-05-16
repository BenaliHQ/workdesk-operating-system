// Column splitters between zone-pane / editor and editor / right-pane.
//
// Per handoff/components.md § .splitter:
//   - 6 px hit zones
//   - pane clamp 240–560 px, rpane clamp 280–600 px, editor min 360 px
//   - double-click to reset to default 340 px
//   - drag adjusts --ws-pane-w / --ws-rpane-w on .app (local to instance)

import { PANE_CLAMPS, WorkdeskSettings } from '../settings';

export type Side = 'left' | 'right';

export interface SplitterOpts {
  appEl: HTMLElement;
  side: Side;
  initialWidth: number;
  onCommit: (width: number) => void;
}

export function clampWidth(side: Side, width: number, totalWidth = Number.POSITIVE_INFINITY): number {
  const { min, max } = side === 'left' ? PANE_CLAMPS.paneWidth : PANE_CLAMPS.rpaneWidth;
  const editorMin = PANE_CLAMPS.editorMin;
  let w = Math.max(min, Math.min(max, Math.round(width)));
  // Editor minimum is a soft constraint applied only when total is known.
  if (Number.isFinite(totalWidth)) {
    const otherSide = side === 'left' ? PANE_CLAMPS.rpaneWidth.min : PANE_CLAMPS.paneWidth.min;
    const cap = totalWidth - editorMin - otherSide;
    if (cap > 0 && w > cap) w = cap;
  }
  return w;
}

const DEFAULT_PANE_WIDTH = 340;

export function makeSplitter(opts: SplitterOpts): HTMLElement {
  const el = activeDocument.createDiv();
  el.className = `splitter splitter-${opts.side}`;
  el.dataset.side = opts.side;
  el.setAttribute('role', 'separator');
  el.setAttribute('aria-orientation', 'vertical');
  el.tabIndex = 0;

  let dragging = false;
  let startX = 0;
  let startW = opts.initialWidth;

  const cssVar = opts.side === 'left' ? '--ws-pane-w' : '--ws-rpane-w';

  el.addEventListener('mousedown', (ev: MouseEvent) => {
    dragging = true;
    startX = ev.clientX;
    startW = parseFloat(getComputedStyle(opts.appEl).getPropertyValue(cssVar)) || opts.initialWidth;
    el.classList.add('dragging');
    ev.preventDefault();
  });

  const move = (ev: MouseEvent) => {
    if (!dragging) return;
    const dx = opts.side === 'left' ? ev.clientX - startX : startX - ev.clientX;
    const total = opts.appEl.getBoundingClientRect().width;
    const next = clampWidth(opts.side, startW + dx, total);
    opts.appEl.style.setProperty(cssVar, `${next}px`);
  };

  const up = () => {
    if (!dragging) return;
    dragging = false;
    el.classList.remove('dragging');
    const final = parseFloat(getComputedStyle(opts.appEl).getPropertyValue(cssVar)) || opts.initialWidth;
    opts.onCommit(clampWidth(opts.side, final));
  };

  activeDocument.addEventListener('mousemove', move);
  activeDocument.addEventListener('mouseup', up);

  el.addEventListener('dblclick', () => {
    const reset = clampWidth(opts.side, DEFAULT_PANE_WIDTH);
    opts.appEl.style.setProperty(cssVar, `${reset}px`);
    opts.onCommit(reset);
  });

  return el;
}

export function applyInitialWidths(appEl: HTMLElement, settings: Pick<WorkdeskSettings, 'panes'>): void {
  appEl.style.setProperty('--ws-pane-w', `${clampWidth('left', settings.panes.paneWidth)}px`);
  appEl.style.setProperty('--ws-rpane-w', `${clampWidth('right', settings.panes.rpaneWidth)}px`);
}
