// .zone-empty and .empty-row.caught-up — empty-state primitives.

import { wsSvg } from '../icons';
import type { IconName } from '../types';

export interface ZoneEmptyOpts {
  icon: IconName;
  title: string;
  body: string;
  cta?: { label: string; onClick: () => void };
}

export function renderZoneEmpty(opts: ZoneEmptyOpts): HTMLElement {
  const el = document.createElement('div');
  el.className = 'zone-empty';

  const bigDot = document.createElement('div');
  bigDot.className = 'big-dot';
  bigDot.innerHTML = wsSvg(opts.icon, 24);
  el.appendChild(bigDot);

  const h2 = document.createElement('h2');
  h2.textContent = opts.title;
  el.appendChild(h2);

  const p = document.createElement('p');
  p.textContent = opts.body;
  el.appendChild(p);

  if (opts.cta) {
    const btn = document.createElement('button');
    btn.className = 'btn ghost';
    btn.type = 'button';
    btn.textContent = opts.cta.label;
    btn.addEventListener('click', opts.cta.onClick);
    el.appendChild(btn);
  }
  return el;
}

export function renderCaughtUpRow(label = 'All caught up'): HTMLElement {
  const row = document.createElement('div');
  row.className = 'empty-row caught-up';
  const check = document.createElement('span');
  check.className = 'check';
  check.innerHTML = wsSvg('check', 14);
  row.appendChild(check);
  const text = document.createElement('span');
  text.textContent = label;
  row.appendChild(text);
  return row;
}
