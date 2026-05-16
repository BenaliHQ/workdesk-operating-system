// .obj zone-card — 32×32 pastel dot + title + sub + count + shadow + hover-lift.

import { wsSvg } from '../icons';
import type { ZoneObject } from '../types';

export interface ZoneCardOpts {
  zoneId: string;
  obj: ZoneObject;
  onToggle?: (objId: string) => void;
}

export function renderZoneCard(opts: ZoneCardOpts): HTMLElement {
  const card = document.createElement('div');
  card.className = 'obj';
  card.dataset.objId = opts.obj.id;
  card.dataset.zone = opts.zoneId;
  if (!opts.obj.expanded) card.classList.add('collapsed');

  const row = document.createElement('div');
  row.className = 'obj-row';
  row.tabIndex = 0;
  row.setAttribute('role', 'button');

  const dot = document.createElement('span');
  dot.className = 'obj-dot';
  dot.innerHTML = wsSvg(opts.obj.icon, 16);
  row.appendChild(dot);

  const text = document.createElement('div');
  text.className = 'obj-text';
  const title = document.createElement('div');
  title.className = 'obj-title';
  title.textContent = opts.obj.title;
  const sub = document.createElement('div');
  sub.className = 'obj-sub';
  sub.textContent = opts.obj.sub;
  text.appendChild(title);
  text.appendChild(sub);
  row.appendChild(text);

  const meta = document.createElement('div');
  meta.className = 'obj-meta';
  if (opts.obj.empty === 'caught-up') {
    meta.classList.add('caught-up');
    meta.innerHTML = wsSvg('check', 12);
  } else {
    meta.textContent = String(opts.obj.count);
  }
  row.appendChild(meta);

  row.addEventListener('click', () => {
    // Mutate the model so a parent re-render reads the new state.
    // Without this, ZoneView.render() rebuilds the card from obj.expanded
    // (unchanged) and the visual toggle reverts immediately.
    opts.obj.expanded = !opts.obj.expanded;
    card.classList.toggle('collapsed', !opts.obj.expanded);
    opts.onToggle?.(opts.obj.id);
  });

  card.appendChild(row);
  return card;
}
