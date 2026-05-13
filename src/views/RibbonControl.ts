// Custom WorkDesk ribbon — child of Obsidian's host ribbon column.
//
// Renders 12 slots in this order, per handoff/components.md § Ribbon order:
//   [atlas] [gtd] [intel] [personal] [system] [config] [files]
//   ────── divider ──────
//   [search] [today] [terminal] [focus] … spacer … [mic]
//
// Selection state (active zone) is internal to the plugin.

import type { Plugin } from 'obsidian';
import { wsSvg } from '../icons';
import type { IconName, ZoneId } from '../types';

const ZONE_SLOTS: ReadonlyArray<{ id: ZoneId; icon: IconName }> = [
  { id: 'atlas', icon: 'globe' },
  { id: 'gtd', icon: 'check' },
  { id: 'intel', icon: 'signal' },
  { id: 'personal', icon: 'person' },
  { id: 'system', icon: 'layers' },
  { id: 'config', icon: 'gear' },
  { id: 'files', icon: 'files' },
];

const UTILITY_ICONS: ReadonlyArray<{ id: string; icon: IconName; title: string }> = [
  { id: 'search', icon: 'search', title: 'Search' },
  { id: 'today', icon: 'calendar', title: "Today's daily note" },
  { id: 'terminal', icon: 'code', title: 'Toggle terminal' },
  { id: 'focus', icon: 'focus', title: 'Toggle focus mode' },
];

export interface RibbonState {
  activeZone: ZoneId;
  focusOn: boolean;
}

export type RibbonHandler = (slot: string) => void;

export class WorkdeskRibbon {
  private el: HTMLElement | null = null;
  private state: RibbonState = { activeZone: 'atlas', focusOn: false };
  private onSelect: RibbonHandler = () => {};

  constructor(private plugin: Plugin) {}

  mount(host: HTMLElement = document.body): HTMLElement {
    const el = document.createElement('div');
    el.className = 'ws-ribbon ribbon';
    el.setAttribute('role', 'navigation');
    el.setAttribute('aria-label', 'WorkDesk zones and tools');

    for (const slot of ZONE_SLOTS) {
      el.appendChild(this.renderZoneSlot(slot.id, slot.icon));
    }

    const divider = document.createElement('div');
    divider.className = 'ribbon-divider';
    el.appendChild(divider);

    for (const tool of UTILITY_ICONS) {
      el.appendChild(this.renderIconButton(tool.id, tool.icon, tool.title));
    }

    const spacer = document.createElement('div');
    spacer.className = 'ribbon-spacer';
    el.appendChild(spacer);

    el.appendChild(this.renderIconButton('mic', 'mic', 'Quick capture', 'mic'));

    host.appendChild(el);
    this.el = el;
    return el;
  }

  unmount(): void {
    this.el?.remove();
    this.el = null;
  }

  onSlot(handler: RibbonHandler): void {
    this.onSelect = handler;
  }

  setActiveZone(zone: ZoneId): void {
    this.state.activeZone = zone;
    if (!this.el) return;
    this.el.querySelectorAll('.zone-slot').forEach((slot) => {
      const el = slot as HTMLElement;
      if (el.dataset.zone === zone) el.classList.add('active');
      else el.classList.remove('active');
    });
  }

  setFocus(on: boolean): void {
    this.state.focusOn = on;
    if (!this.el) return;
    const focus = this.el.querySelector('.ribbon-icon[data-slot="focus"]');
    if (focus) focus.classList.toggle('focus-active', on);
  }

  getSlots(): HTMLElement[] {
    if (!this.el) return [];
    return Array.from(this.el.querySelectorAll<HTMLElement>('.zone-slot, .ribbon-icon'));
  }

  private renderZoneSlot(zone: ZoneId, icon: IconName): HTMLElement {
    const btn = document.createElement('button');
    btn.className = 'zone-slot';
    btn.dataset.zone = zone;
    btn.setAttribute('aria-label', zone);
    btn.type = 'button';
    if (zone === this.state.activeZone) btn.classList.add('active');

    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.innerHTML = wsSvg(icon, 16);
    btn.appendChild(dot);

    btn.addEventListener('click', () => this.onSelect(zone));
    return btn;
  }

  private renderIconButton(slot: string, icon: IconName, title: string, extraClass = ''): HTMLElement {
    const btn = document.createElement('button');
    btn.className = ['ribbon-icon', extraClass].filter(Boolean).join(' ');
    btn.dataset.slot = slot;
    btn.title = title;
    btn.setAttribute('aria-label', title);
    btn.type = 'button';
    btn.innerHTML = wsSvg(icon, 18);
    btn.addEventListener('click', () => this.onSelect(slot));
    return btn;
  }
}

export const RIBBON_SLOT_IDS: ReadonlyArray<string> = [
  ...ZONE_SLOTS.map((s) => s.id),
  ...UTILITY_ICONS.map((t) => t.id),
  'mic',
];
