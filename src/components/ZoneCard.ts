// .obj zone-card — minimal row: initial letter + title + count.
// No preview text. No + buttons. Creation flows through right-click only,
// surfaced by the host (ZoneView) via the onContextMenu callback.

import { wsSvgEl } from '../icons';
import type { ZoneObject } from '../types';

export interface ZoneCardOpts {
  zoneId: string;
  obj: ZoneObject;
  onToggle?: (objId: string) => void;
  /** Right-click handler. Host opens the create menu (New note / New folder)
   *  targeting this object's folder. */
  onContextMenu?: (evt: MouseEvent) => void;
}

export function renderZoneCard(opts: ZoneCardOpts): HTMLElement {
  const card = createDiv();
  card.className = 'obj';
  card.dataset.objId = opts.obj.id;
  card.dataset.zone = opts.zoneId;
  if (!opts.obj.expanded) card.classList.add('collapsed');

  const row = createDiv();
  row.className = 'obj-row';
  row.tabIndex = 0;
  row.setAttribute('role', 'button');

  // Folder-style row: a rotating chevron + a folder glyph (file-explorer feel),
  // replacing the old initial-letter chip.
  const chev = createSpan();
  chev.className = 'obj-chev';
  chev.appendChild(wsSvgEl('chevron', 14));
  row.appendChild(chev);

  const folder = createSpan();
  folder.className = 'obj-folder';
  folder.appendChild(wsSvgEl('folder', 18));
  row.appendChild(folder);

  const text = createDiv();
  text.className = 'obj-text';
  const title = createDiv();
  title.className = 'obj-title';
  title.textContent = opts.obj.title;
  text.appendChild(title);
  row.appendChild(text);

  const meta = createDiv();
  meta.className = 'obj-meta';
  if (opts.obj.empty === 'caught-up') {
    meta.classList.add('caught-up');
    meta.appendChild(wsSvgEl('check', 12));
  } else {
    meta.textContent = String(opts.obj.count);
  }
  row.appendChild(meta);

  row.addEventListener('click', () => {
    opts.obj.expanded = !opts.obj.expanded;
    card.classList.toggle('collapsed', !opts.obj.expanded);
    opts.onToggle?.(opts.obj.id);
  });

  if (opts.onContextMenu) {
    row.addEventListener('contextmenu', (evt) => opts.onContextMenu?.(evt));
  }

  card.appendChild(row);
  return card;
}
