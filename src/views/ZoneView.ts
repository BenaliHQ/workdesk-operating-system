// ZoneView (`workdesk-zone`) — ItemView that mounts the zone pane.
//
// Layout: .pane-hero + .object-list. Each object renders as a .obj card
// that expands into its child tree. Files mode renders a flat tree at root.

import { ItemView, WorkspaceLeaf } from 'obsidian';
import type WorkdeskOSPlugin from '../main';
import { VIEW_TYPE_WORKDESK_ZONE } from '../constants';
import { renderZoneCard } from '../components/ZoneCard';
import { renderTree } from '../components/TreeRow';
import { renderZoneEmpty, renderCaughtUpRow } from '../components/EmptyStates';
import { wsSvgEl } from '../icons';
import type { Zone, ZoneId } from '../types';

export class ZoneView extends ItemView {
  private plugin: WorkdeskOSPlugin;
  private activeZone: ZoneId = 'atlas';
  private zones: Record<string, Zone> = {};

  constructor(leaf: WorkspaceLeaf, plugin: WorkdeskOSPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string { return VIEW_TYPE_WORKDESK_ZONE; }
  getDisplayText(): string { return 'Workdesk · zones'; }
  getIcon(): string { return 'folder'; }

  setZones(zones: Record<string, Zone>): void {
    this.zones = zones;
    this.render();
  }

  setActiveZone(id: ZoneId): void {
    this.activeZone = id;
    this.render();
  }

  render(): void {
    const root = this.contentEl;
    root.empty();
    root.classList.add('workdesk-zone-pane');

    const zone = this.zones[this.activeZone];
    if (!zone || zone.objects.length === 0) {
      root.appendChild(
        renderZoneEmpty({
          icon: 'inbox',
          title: 'Nothing in this zone yet',
          body: 'Add a folder under this zone in your vault and it will appear here.',
        }),
      );
      return;
    }

    const hero = createDiv();
    hero.className = 'pane-hero';
    hero.appendChild(wsSvgEl(zone.icon, 24));
    const h1 = createEl('h1');
    h1.textContent = zone.name;
    hero.appendChild(h1);
    const sub = createDiv();
    sub.className = 'sub';
    sub.textContent = zone.sub;
    hero.appendChild(sub);
    root.appendChild(hero);

    const list = createDiv();
    list.className = 'object-list';
    for (const obj of zone.objects) {
      const card = renderZoneCard({
        zoneId: this.activeZone,
        obj,
        onToggle: () => this.render(),
      });
      if (obj.empty === 'caught-up') {
        card.appendChild(renderCaughtUpRow());
      } else if (obj.children?.length) {
        // Wrap the tree in .obj-children so the existing CSS
        // (.obj.collapsed .obj-children { display: none }) actually matches.
        const childrenWrap = createDiv();
        childrenWrap.className = 'obj-children';
        childrenWrap.appendChild(
          renderTree(obj.children, {
            pathPrefix: obj.id,
            onActivate: (node, path) => this.handleActivate(node, path),
          }),
        );
        card.appendChild(childrenWrap);
      }
      list.appendChild(card);
    }
    root.appendChild(list);
  }

  private handleActivate(node: { type: string; name: string }, path: string): void {
    if (node.type === 'file') {
      void this.plugin.app.workspace.openLinkText(path, '', false);
    }
  }
}
