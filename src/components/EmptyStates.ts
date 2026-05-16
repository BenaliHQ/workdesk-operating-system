// .zone-empty and .empty-row.caught-up — empty-state primitives.

import { wsSvgEl } from '../icons';
import type { IconName } from '../types';

export interface ZoneEmptyOpts {
  icon: IconName;
  title: string;
  body: string;
  cta?: { label: string; onClick: () => void };
}

export function renderZoneEmpty(opts: ZoneEmptyOpts): HTMLElement {
  const el = createDiv();
  el.className = 'zone-empty';

  const bigDot = createDiv();
  bigDot.className = 'big-dot';
  bigDot.appendChild(wsSvgEl(opts.icon, 24));
  el.appendChild(bigDot);

  const h2 = createEl('h2');
  h2.textContent = opts.title;
  el.appendChild(h2);

  const p = createEl('p');
  p.textContent = opts.body;
  el.appendChild(p);

  if (opts.cta) {
    const btn = createEl('button');
    btn.className = 'btn ghost';
    btn.type = 'button';
    btn.textContent = opts.cta.label;
    btn.addEventListener('click', opts.cta.onClick);
    el.appendChild(btn);
  }
  return el;
}

export function renderCaughtUpRow(label = 'All caught up'): HTMLElement {
  const row = createDiv();
  row.className = 'empty-row caught-up';
  const check = createSpan();
  check.className = 'check';
  check.appendChild(wsSvgEl('check', 14));
  row.appendChild(check);
  const text = createSpan();
  text.textContent = label;
  row.appendChild(text);
  return row;
}
