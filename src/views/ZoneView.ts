// ZoneView (`workdesk-zone`) — ItemView that mounts the zone pane.
//
// Layout: .pane-hero + .object-list. Each object renders as a .obj card
// that expands into its child tree. Files mode renders a flat tree at root.

import { ItemView, WorkspaceLeaf } from 'obsidian';
import type WorkdeskosPlugin from '../main';
import { VIEW_TYPE_WORKDESK_ZONE } from '../constants';
import { renderZoneCard } from '../components/ZoneCard';
import { renderTree } from '../components/TreeRow';
import { renderZoneEmpty, renderCaughtUpRow } from '../components/EmptyStates';
import { wsSvg } from '../icons';
import type { Zone, ZoneId } from '../types';

export class ZoneView extends ItemView {
  private plugin: WorkdeskosPlugin;
  private activeZone: ZoneId = 'atlas';
  private zones: Record<string, Zone> = {};

  constructor(leaf: WorkspaceLeaf, plugin: WorkdeskosPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string { return VIEW_TYPE_WORKDESK_ZONE; }
  getDisplayText(): string { return 'WorkDesk · zones'; }
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
    root.empty?.();
    root.innerHTML = '';
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

    const hero = document.createElement('div');
    hero.className = 'pane-hero';
    hero.innerHTML = `${wsSvg(zone.icon, 24)}<h1>${zone.name}</h1><div class="sub">${zone.sub}</div>`;
    root.appendChild(hero);

    const list = document.createElement('div');
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
        card.appendChild(
          renderTree(obj.children, {
            pathPrefix: obj.id,
            onActivate: (node, path) => this.handleActivate(node, path),
          }),
        );
      }
      list.appendChild(card);
    }
    root.appendChild(list);
  }

  private handleActivate(node: { type: string; name: string }, path: string): void {
    if (node.type === 'file') {
      this.plugin.app.workspace.openLinkText(path, '', false);
    }
  }
}
