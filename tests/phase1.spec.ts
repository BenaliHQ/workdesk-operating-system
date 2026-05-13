import { describe, it, expect, beforeEach } from 'vitest';
import { Plugin } from '../tests/stubs/obsidian';
import { WorkdeskRibbon, RIBBON_SLOT_IDS } from '../src/views/RibbonControl';
import { clampWidth } from '../src/layout/splitters';

describe('phase 1 · ribbon', () => {
  let host: HTMLElement;
  let plugin: Plugin;

  beforeEach(() => {
    document.body.innerHTML = '';
    host = document.createElement('div');
    document.body.appendChild(host);
    plugin = new Plugin();
  });

  it('renders 12 ribbon slots in spec order', () => {
    const r = new WorkdeskRibbon(plugin);
    r.mount(host);
    const slots = host.querySelectorAll('.zone-slot, .ribbon-icon');
    expect(slots.length).toBe(12);
  });

  it('zone slots appear before utility icons before mic', () => {
    const r = new WorkdeskRibbon(plugin);
    r.mount(host);
    const ordered = Array.from(host.querySelectorAll<HTMLElement>('.zone-slot, .ribbon-icon'))
      .map((el) => el.dataset.zone ?? el.dataset.slot);
    expect(ordered).toEqual([
      'atlas', 'gtd', 'intel', 'personal', 'system', 'config', 'files',
      'search', 'today', 'terminal', 'focus',
      'mic',
    ]);
  });

  it('exposes RIBBON_SLOT_IDS with 12 entries matching DOM order', () => {
    expect(RIBBON_SLOT_IDS.length).toBe(12);
    expect(RIBBON_SLOT_IDS[0]).toBe('atlas');
    expect(RIBBON_SLOT_IDS[RIBBON_SLOT_IDS.length - 1]).toBe('mic');
  });

  it('setActiveZone toggles .active on the right slot only', () => {
    const r = new WorkdeskRibbon(plugin);
    r.mount(host);
    r.setActiveZone('gtd');
    const actives = host.querySelectorAll('.zone-slot.active');
    expect(actives.length).toBe(1);
    expect((actives[0] as HTMLElement).dataset.zone).toBe('gtd');
  });

  it('onSlot fires with slot id on click', () => {
    const r = new WorkdeskRibbon(plugin);
    r.mount(host);
    const calls: string[] = [];
    r.onSlot((id) => calls.push(id));
    (host.querySelector('[data-zone="intel"]') as HTMLElement).click();
    (host.querySelector('[data-slot="mic"]') as HTMLElement).click();
    expect(calls).toEqual(['intel', 'mic']);
  });
});

describe('phase 1 · splitter clamps', () => {
  it('clamps left pane to [240, 560]', () => {
    expect(clampWidth('left', 100)).toBe(240);
    expect(clampWidth('left', 700)).toBe(560);
    expect(clampWidth('left', 340)).toBe(340);
  });

  it('clamps right pane to [280, 600]', () => {
    expect(clampWidth('right', 100)).toBe(280);
    expect(clampWidth('right', 700)).toBe(600);
    expect(clampWidth('right', 340)).toBe(340);
  });

  it('respects editor minimum when a viewport is supplied', () => {
    // viewport 900, right min 280, editor min 360 → left cap ≈ 260
    const w = clampWidth('left', 500, 900);
    expect(w).toBeLessThanOrEqual(900 - 360 - 280);
  });
});
