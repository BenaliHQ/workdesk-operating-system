// Editor toolbar — icon buttons in the editor chrome.
// 5 buttons per components.md: toggle-left, toggle-right, settings, theme toggle,
// command palette.

import { wsSvgEl } from '../icons';
import type { IconName } from '../types';

export type ToolbarSlot =
  | 'toggle-left'
  | 'toggle-right'
  | 'settings'
  | 'theme'
  | 'palette';

const SLOTS: Array<{ id: ToolbarSlot; icon: IconName; title: string }> = [
  { id: 'toggle-left', icon: 'panelL', title: 'Toggle left pane' },
  { id: 'toggle-right', icon: 'panelR', title: 'Toggle right pane' },
  { id: 'settings', icon: 'gear', title: 'Settings' },
  { id: 'theme', icon: 'sun', title: 'Toggle theme' },
  { id: 'palette', icon: 'command', title: 'Command palette' },
];

export interface ToolbarOpts {
  onAction: (slot: ToolbarSlot) => void;
}

export function renderEditorToolbar(opts: ToolbarOpts): HTMLElement {
  const el = activeDocument.createDiv();
  el.className = 'editor-toolbar';

  for (const slot of SLOTS) {
    const btn = activeDocument.createEl('button');
    btn.className = 'icon-btn';
    btn.type = 'button';
    btn.dataset.slot = slot.id;
    btn.title = slot.title;
    btn.setAttribute('aria-label', slot.title);
    btn.appendChild(wsSvgEl(slot.icon, 16));
    btn.addEventListener('click', () => opts.onAction(slot.id));
    el.appendChild(btn);
  }

  return el;
}

export const TOOLBAR_SLOT_IDS: readonly ToolbarSlot[] = SLOTS.map((s) => s.id);
