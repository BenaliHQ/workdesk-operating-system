// ZoneView (`workdesk-zone`) — ItemView that mounts the zone pane.
//
// Layout: .pane-hero + .object-list. Each object renders as a .obj card
// that expands into its child tree. Files mode renders a flat tree at root.
//
// Creation flows (new note, new folder) are right-click-only — there are no
// + buttons. The zone hero context menu targets the zone root; each card's
// context menu targets that object's folder.

import { ItemView, Menu, TFile, TFolder, WorkspaceLeaf } from 'obsidian';
import type WorkdeskOSPlugin from '../main';
import { VIEW_TYPE_WORKDESK_ZONE } from '../constants';
import { renderZoneCard } from '../components/ZoneCard';
import { renderTree } from '../components/TreeRow';
import { renderZoneEmpty, renderCaughtUpRow } from '../components/EmptyStates';
import { wsSvgEl } from '../icons';
import type { Zone, ZoneId } from '../types';

/** Per-zone "X Management" subtitle shown beneath the zone name in the hero.
 *  Keep this in lockstep with the zone roster in src/types.d.ts so every
 *  zone has a paired label. */
const ZONE_SUBTITLE: Record<ZoneId, string> = {
  atlas: 'Object Management',
  gtd: 'Action Management',
  intel: 'Signal Management',
  personal: 'Practice Management',
  system: 'Source Management',
  config: 'Set-up Management',
  files: 'File Management',
};

/** Display name override — most zones render their lowercase manifest name
 *  styled via CSS, but GTD reads better in all caps as a brand. */
function zoneDisplayName(zoneId: ZoneId, fallback: string): string {
  if (zoneId === 'gtd') return 'GTD';
  return fallback;
}

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
      root.appendChild(this.renderHero(zone?.icon, zone?.name));
      root.appendChild(
        renderZoneEmpty({
          icon: 'inbox',
          title: 'Nothing in this zone yet',
          body: 'Right-click to add a folder or note, or drop one in your vault.',
        }),
      );
      return;
    }

    root.appendChild(this.renderHero(zone.icon, zone.name));

    const list = createDiv();
    list.className = 'object-list';
    for (const obj of zone.objects) {
      const card = renderZoneCard({
        zoneId: this.activeZone,
        obj,
        onToggle: () => this.render(),
        // Every filesystem-derived object now carries its vault-relative
        // path in `obj.folder` (folders and files alike — see scanner).
        // The host routes the right-click based on what's actually at that
        // path: folder → "New note/folder in <X>" + native menu; file →
        // native menu only (Delete, Rename, Reveal, etc.).
        onContextMenu: obj.folder ? (evt) => this.openCardContextMenu(evt, obj.folder ?? '', obj.title) : undefined,
      });
      if (obj.empty === 'caught-up') {
        card.appendChild(renderCaughtUpRow());
      } else if (obj.count === 0) {
        // Real folder with no descendants — the operator can expand to see
        // an explicit empty-state row instead of an empty container.
        const childrenWrap = createDiv();
        childrenWrap.className = 'obj-children';
        const empty = createDiv();
        empty.className = 'obj-empty-row';
        empty.textContent = 'This folder is empty';
        childrenWrap.appendChild(empty);
        card.appendChild(childrenWrap);
      } else if (obj.children?.length) {
        const childrenWrap = createDiv();
        childrenWrap.className = 'obj-children';
        childrenWrap.appendChild(
          renderTree(obj.children, {
            pathPrefix: obj.folder ?? obj.id,
            onActivate: (node, path) => this.handleActivate(node, path),
            onContextMenu: (evt, _node, path) => this.openFileMenu(evt, path),
          }),
        );
        card.appendChild(childrenWrap);
      }
      list.appendChild(card);
    }
    root.appendChild(list);
  }

  /** Builds the zone-pane header: oversized icon on the left, zone name
   *  + per-zone management label stacked on the right. Right-clicking
   *  anywhere on the hero opens the same create menu the card rows use. */
  private renderHero(icon: Zone['icon'] | undefined, name: string | undefined): HTMLElement {
    const hero = createDiv();
    hero.className = 'pane-hero workdesk-os-zone-hero';

    if (icon) {
      const glyph = createDiv();
      glyph.className = 'workdesk-os-zone-hero-icon';
      glyph.appendChild(wsSvgEl(icon, 40));
      hero.appendChild(glyph);
    }

    const meta = createDiv();
    meta.className = 'workdesk-os-zone-hero-meta';
    const h1 = createEl('h1');
    h1.textContent = zoneDisplayName(this.activeZone, name ?? this.activeZone);
    meta.appendChild(h1);
    const sub = createDiv();
    sub.className = 'sub';
    sub.textContent = ZONE_SUBTITLE[this.activeZone] ?? '';
    meta.appendChild(sub);
    hero.appendChild(meta);

    const zoneRoot = this.zoneRoot();
    hero.addEventListener('contextmenu', (evt) => this.openCreateMenu(evt, zoneRoot, name ?? this.activeZone));
    return hero;
  }

  private zoneRoot(): string {
    const id = this.activeZone;
    if (id === 'files') return '';
    return this.plugin.settings.zones.folders[id] ?? id;
  }

  /** Right-click on a zone-pane card. Behavior splits on what's at the path:
   *
   *  - **Folder card** → "New note in <X>" + "New folder in <X>", then
   *    native file-menu contributions, then an explicit Delete.
   *  - **File card** (e.g. an `untitled.md` accidentally created at zone
   *    root) → Open in new tab, native file-menu contributions, explicit
   *    Delete.
   *
   *  We always add Delete ourselves because Obsidian's File Explorer only
   *  contributes Delete when `source === 'file-explorer-context-menu'`
   *  — using that source caused other side effects, so the safer pattern
   *  is: trigger the generic 'file-menu' event for plugin extensions,
   *  then layer in the operator-critical actions ourselves.
   */
  private openCardContextMenu(evt: MouseEvent, vaultPath: string, label: string): void {
    evt.preventDefault();
    evt.stopPropagation();
    const target = this.plugin.app.vault.getAbstractFileByPath(vaultPath);
    if (!(target instanceof TFile) && !(target instanceof TFolder)) return;
    this.buildAndShowMenu(evt, target, { label, parent: vaultPath });
  }

  /** Right-click on the zone hero — always a folder-style create menu,
   *  rooted at the zone's configured folder. */
  private openCreateMenu(evt: MouseEvent, parent: string, label: string): void {
    evt.preventDefault();
    evt.stopPropagation();
    const menu = new Menu();
    menu.addItem((item) =>
      item
        .setTitle(`New note in ${label}`)
        .setIcon('file-plus')
        .onClick(() => void this.plugin.createNewNoteIn(parent)),
    );
    menu.addItem((item) =>
      item
        .setTitle(`New folder in ${label}`)
        .setIcon('folder-plus')
        .onClick(() => void this.plugin.createNewFolderIn(parent)),
    );
    menu.showAtMouseEvent(evt);
  }

  private handleActivate(node: { type: string; name: string }, path: string): void {
    if (node.type === 'file') {
      void this.plugin.app.workspace.openLinkText(path, '', false);
    }
  }

  /** Right-click on a tree row inside an expanded card. Same menu shape as
   *  the card-level one minus the create-in actions (those only make sense
   *  when right-clicking on a folder card). */
  private openFileMenu(evt: MouseEvent, path: string): void {
    evt.preventDefault();
    evt.stopPropagation();
    const file = this.plugin.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile) && !(file instanceof TFolder)) return;
    this.buildAndShowMenu(evt, file, {});
  }

  /** Shared context-menu builder. Layers plugin-contributed items in the
   *  middle, with our own essentials on top (folder-only create actions)
   *  and bottom (Delete) so they're always present. */
  private buildAndShowMenu(
    evt: MouseEvent,
    target: TFile | TFolder,
    opts: { label?: string; parent?: string },
  ): void {
    const menu = new Menu();

    if (target instanceof TFolder && opts.label && opts.parent) {
      menu.addItem((item) =>
        item
          .setTitle(`New note in ${opts.label}`)
          .setIcon('file-plus')
          .onClick(() => void this.plugin.createNewNoteIn(opts.parent ?? '')),
      );
      menu.addItem((item) =>
        item
          .setTitle(`New folder in ${opts.label}`)
          .setIcon('folder-plus')
          .onClick(() => void this.plugin.createNewFolderIn(opts.parent ?? '')),
      );
      menu.addSeparator?.();
    }

    if (target instanceof TFile) {
      menu.addItem((item) =>
        item
          .setTitle('Open in new tab')
          .setIcon('lucide-file-plus-2')
          .onClick(() => {
            void this.plugin.app.workspace.getLeaf('tab').openFile(target);
          }),
      );
      menu.addSeparator?.();
    }

    // Plugin extensions (Bookmarks, Copy path, Reveal in Finder, etc.).
    (this.plugin.app.workspace as unknown as {
      trigger(name: string, ...args: unknown[]): void;
    }).trigger('file-menu', menu, target, 'workdesk-zone-pane');

    menu.addSeparator?.();
    menu.addItem((item) =>
      item
        .setTitle('Delete')
        .setIcon('trash')
        .onClick(() => {
          void this.plugin.app.fileManager.trashFile(target);
        }),
    );

    menu.showAtMouseEvent(evt);
  }
}
