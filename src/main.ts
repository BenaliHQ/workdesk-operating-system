import { Plugin, TFile, TFolder, addIcon } from 'obsidian';
import { FileSystemAdapter } from 'obsidian';
import {
  COMMAND_ID_PREFIX,
  PLUGIN_ID,
  VIEW_TYPE_WORKDESK_HTML,
  VIEW_TYPE_WORKDESK_TERMINAL,
  VIEW_TYPE_WORKDESK_ZONE,
} from './constants';
import { DEFAULT_SETTINGS, WorkdeskSettings } from './settings';
import { ZoneView } from './views/ZoneView';
import { HtmlView } from './views/HtmlView';
import {
  OutputCaptureModal,
  ShortcutsModal,
  TerminalView,
  writePtyHelper,
} from './vendor/workdesk-terminal';
import { wikilinkAndTagDecorations } from './editor/wikilink-ext';
import { CommandPalette } from './modals/CommandPalette';
import { InsertTemplateModal } from './modals/InsertTemplate';
import { QuickCaptureModal } from './modals/QuickCapture';
import { RenameItemModal } from './modals/RenameItem';
import { applyTemplateVariables, formatDate } from './services/templates';
import { checkAndUpdate } from './services/updater';
import { WorkdeskSettingTab } from './settings/tab';
import { createFocusController, type FocusController } from './services/focus';
import { obsidianCaptureVault } from './services/capture/obsidian-vault';
import { installStatusObserver } from './services/terminal-status';
import { installGlobalToast, showToast } from './components/Toast';
import { wsSvg } from './icons';
import { scanZones, scanFilesView, nodeFsAdapter } from './services/vault-scan';
import type { IconName, Zone, ZoneId } from './types';

// 12 plugin surfaces in spec order — 7 zone icons + Today + Terminal + Focus
// + Mic (quick capture) + Settings. Names registered via addIcon at onload.
const RIBBON_ICON_MAP: Array<{ name: string; glyph: IconName }> = [
  { name: 'workdesk-atlas', glyph: 'globe' },
  { name: 'workdesk-gtd', glyph: 'check' },
  { name: 'workdesk-intel', glyph: 'signal' },
  { name: 'workdesk-personal', glyph: 'person' },
  { name: 'workdesk-system', glyph: 'layers' },
  { name: 'workdesk-config', glyph: 'sliders' },
  { name: 'workdesk-files', glyph: 'files' },
  { name: 'workdesk-today', glyph: 'calendar' },
  { name: 'workdesk-terminal', glyph: 'code' },
  { name: 'workdesk-focus', glyph: 'focus' },
  { name: 'workdesk-mic', glyph: 'mic' },
  { name: 'workdesk-settings', glyph: 'gear' },
];

const ZONE_RIBBON_IDS: readonly ZoneId[] = [
  'atlas', 'gtd', 'intel', 'personal', 'system', 'config', 'files',
];

export default class WorkdeskOSPlugin extends Plugin {
  settings!: WorkdeskSettings;
  activeZone: ZoneId = 'atlas';
  focus: FocusController | null = null;
  private ribbonElements: HTMLElement[] = [];
  private zones: Record<string, Zone> = {};
  // First-run orientation is handled by WorkDesk OS's /onboarding skill,
  // not a plugin modal. STATE.json.decisions.onboarding_enabled = false.

  async onload(): Promise<void> {
    await this.loadSettings();
    installGlobalToast();

    this.registerIcons();
    await this.loadZones();

    this.registerView(VIEW_TYPE_WORKDESK_ZONE, (leaf) => new ZoneView(leaf, this));
    this.registerView(VIEW_TYPE_WORKDESK_HTML, (leaf) => new HtmlView(leaf, this));
    this.registerExtensions(['html', 'htm'], VIEW_TYPE_WORKDESK_HTML);
    // Vendored vin TerminalView (see src/vendor/workdesk-terminal/NOTICE.md).
    // Writes the PTY helper script next to the plugin folder before any
    // session can spawn — BRAT ships main.js / styles.css / manifest.json
    // only, so the python helper has to be materialized at runtime.
    const vaultAdapter = this.app.vault.adapter;
    if (vaultAdapter instanceof FileSystemAdapter && this.manifest.dir) {
      writePtyHelper(vaultAdapter.getBasePath(), this.manifest.dir);
    }
    this.registerView(VIEW_TYPE_WORKDESK_TERMINAL, (leaf) => new TerminalView(leaf));

    this.registerEditorExtension(wikilinkAndTagDecorations);

    this.addSettingTab(new WorkdeskSettingTab(this.app, this));

    this.addCommand({
      id: `${COMMAND_ID_PREFIX}:open-palette`,
      name: 'Open palette',
      callback: () => new CommandPalette(this.app).open(),
    });

    this.addCommand({
      id: `${COMMAND_ID_PREFIX}:templates:insert`,
      name: 'Insert template',
      editorCallback: (editor, view) => {
        const title = view.file?.basename ?? '';
        new InsertTemplateModal(this.app, {
          editor,
          title,
          folder: this.settings.templates.folder,
          dateFormat: this.settings.templates.dateFormat,
          timeFormat: this.settings.templates.timeFormat,
        }).open();
      },
    });

    this.addCommand({
      id: `${COMMAND_ID_PREFIX}:terminal:toggle`,
      name: 'Toggle terminal pane',
      callback: () => this.toggleTerminalPane(),
    });

    this.addCommand({
      id: `${COMMAND_ID_PREFIX}:terminal:new-tab`,
      name: 'New terminal tab',
      callback: () => this.openNewTerminalTab(),
    });

    // Vendored vin commands — upstream registers these from inside its
    // stripped `TerminalPlugin.onload`. Re-register them under our command
    // prefix so the bookmark / capture / shortcuts workflows are reachable
    // from Obsidian's command palette and rebindable via Settings → Hotkeys.
    this.addCommand({
      id: `${COMMAND_ID_PREFIX}:terminal:toggle-fullscreen`,
      name: 'Toggle fullscreen terminal',
      callback: () => {
        const view = this.firstTerminalView();
        view?.fullscreenManager?.toggle();
      },
    });
    this.addCommand({
      id: `${COMMAND_ID_PREFIX}:terminal:capture-output`,
      name: 'Capture terminal output to note',
      callback: () => {
        const view = this.firstTerminalView();
        const session = view?.activeSession;
        if (!session) return;
        const text = session.captureOutput();
        if (!text.trim()) return;
        new OutputCaptureModal(this.app, text).open();
      },
    });
    this.addCommand({
      id: `${COMMAND_ID_PREFIX}:terminal:add-bookmark`,
      name: 'Add terminal bookmark',
      callback: () => this.firstTerminalView()?.activeSession?.addBookmark(),
    });
    this.addCommand({
      id: `${COMMAND_ID_PREFIX}:terminal:next-bookmark`,
      name: 'Next terminal bookmark',
      callback: () => this.firstTerminalView()?.activeSession?.nextBookmark(),
    });
    this.addCommand({
      id: `${COMMAND_ID_PREFIX}:terminal:prev-bookmark`,
      name: 'Previous terminal bookmark',
      callback: () => this.firstTerminalView()?.activeSession?.prevBookmark(),
    });
    this.addCommand({
      id: `${COMMAND_ID_PREFIX}:terminal:clear-bookmarks`,
      name: 'Clear terminal bookmarks',
      callback: () => this.firstTerminalView()?.activeSession?.clearBookmarks(),
    });
    this.addCommand({
      id: `${COMMAND_ID_PREFIX}:terminal:show-shortcuts`,
      name: 'Show terminal shortcuts',
      callback: () => new ShortcutsModal(this.app).open(),
    });

    this.addCommand({
      id: `${COMMAND_ID_PREFIX}:capture:triage`,
      name: 'Triage capture inbox',
      callback: () => this.triageCaptureInbox(),
    });

    this.addCommand({
      id: `${COMMAND_ID_PREFIX}:capture:open`,
      name: 'Quick capture',
      callback: () => this.openQuickCapture(),
    });

    this.addCommand({
      id: `${COMMAND_ID_PREFIX}:focus:toggle`,
      name: 'Toggle focus mode',
      callback: () => this.toggleFocus(),
    });

    this.addCommand({
      id: `${COMMAND_ID_PREFIX}:update`,
      name: 'Check for plugin updates',
      callback: () => { void checkAndUpdate(this); },
    });

    this.registerRibbonIcons();

    this.focus = createFocusController({
      workspace: this.app.workspace as unknown as Parameters<typeof createFocusController>[0]['workspace'],
      settings: this.settings,
      saveSettings: () => this.saveSettings(),
    });
    this.focus.restore();
    if (this.focus.isOn()) this.refreshFocusIconActive(true);

    this.applyAppearance();

    // Live zone refresh — vault filesystem changes (file/folder create,
    // delete, rename) trigger a debounced re-scan + re-render of every
    // open ZoneView. Without this, the operator creates a folder via
    // Obsidian's file explorer and the zone pane shows stale state until
    // a manual reload. Debounce coalesces bulk ops (e.g. moving 50 files
    // into a folder) into a single refresh.
    this.registerEvent(this.app.vault.on('create', () => this.scheduleZoneRefresh()));
    this.registerEvent(this.app.vault.on('delete', () => this.scheduleZoneRefresh()));
    this.registerEvent(this.app.vault.on('rename', () => this.scheduleZoneRefresh()));

    // Sidebar tab activity pulse — per-view MutationObserver on tabBarEl
    // that re-applies `.has-activity` on tab-strip rebuilds. Fullscreen
    // overlay tabs already get the same class from vin's vendored
    // FullscreenManager; no separate wiring needed here.
    this.app.workspace.onLayoutReady(() => this.installTerminalStatusObservers());
    this.registerEvent(
      this.app.workspace.on('layout-change', () => this.installTerminalStatusObservers()),
    );

    this.registerDomEvent(activeDocument, 'keydown', (evt: KeyboardEvent) => {
      if (evt.key !== 'Escape') return;
      const modalOpen = activeDocument.querySelector('.modal-container.mod-shown, .scrim.open');
      if (modalOpen) return;
      if (this.focus?.isOn()) {
        this.focus.off();
        this.refreshFocusIconActive(false);
      }
    });
  }

  onunload(): void {
    activeDocument.body.classList.remove('workdesk-hide-native-ribbon-icons');
    for (const el of this.ribbonElements) {
      el.classList.remove('workdesk-icon', 'workdesk-active', 'workdesk-focus-active');
    }
    this.ribbonElements = [];
  }

  private registerIcons(): void {
    for (const { name, glyph } of RIBBON_ICON_MAP) {
      addIcon(name, wsSvg(glyph, 100));
    }
  }

  /** Re-scans the vault with the current settings (zone folders, manifest path,
   *  icon manifest path) and pushes the refreshed zones into every open
   *  ZoneView. Called by settings-tab onChange handlers so folder remaps
   *  take effect without a plugin reload — and by the vault create/delete/
   *  rename listeners so the zone pane stays in sync with the filesystem. */
  async refreshZones(): Promise<void> {
    await this.loadZones();
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_WORKDESK_ZONE);
    for (const leaf of leaves) {
      const view = leaf.view as ZoneView | undefined;
      if (!view) continue;
      view.setZones(this.zones);
      view.setActiveZone(this.activeZone);
    }
  }

  private zoneRefreshTimer: number | null = null;

  /** Coalesces a burst of vault filesystem events into a single refresh
   *  on the trailing edge. 250ms is short enough to feel instant after a
   *  single mkdir, long enough to fold bulk moves into one re-scan. */
  scheduleZoneRefresh(): void {
    if (this.zoneRefreshTimer !== null) activeWindow.clearTimeout(this.zoneRefreshTimer);
    this.zoneRefreshTimer = activeWindow.setTimeout(() => {
      this.zoneRefreshTimer = null;
      void this.refreshZones();
    }, 250);
  }

  /** Creates a new untitled markdown file inside `parent` (vault-relative)
   *  and opens it in the workspace. Mirrors Obsidian's File Explorer
   *  "new note" affordance: instant create with `Untitled`, `Untitled 1`,
   *  `Untitled 2`, ... naming, then the operator renames via Obsidian's
   *  built-in rename (F2 / right-click → rename / title bar). */
  async createNewNoteIn(parent: string): Promise<string | null> {
    const folder = parent.replace(/^\/+|\/+$/g, '');
    if (folder && !this.app.vault.getAbstractFileByPath(folder)) {
      try { await this.app.vault.createFolder(folder); } catch { /* concurrent create */ }
    }
    const name = this.findAvailableName(folder, 'Untitled', '.md');
    const path = folder ? `${folder}/${name}` : name;
    try {
      const file = await this.app.vault.create(path, '');
      if (file instanceof TFile) {
        await this.app.workspace.openLinkText(file.path, '', false);
        new RenameItemModal(this.app, { target: file, heading: 'Rename note' }).open();
      }
      return path;
    } catch (err) {
      showToast(`Could not create note at ${path}: ${String(err)}`, 'error');
      return null;
    }
  }

  /** Creates a new untitled folder inside `parent` (vault-relative).
   *  Same auto-numbered naming as createNewNoteIn. */
  async createNewFolderIn(parent: string): Promise<string | null> {
    const folder = parent.replace(/^\/+|\/+$/g, '');
    if (folder && !this.app.vault.getAbstractFileByPath(folder)) {
      try { await this.app.vault.createFolder(folder); } catch { /* concurrent create */ }
    }
    const name = this.findAvailableName(folder, 'Untitled', '');
    const path = folder ? `${folder}/${name}` : name;
    try {
      await this.app.vault.createFolder(path);
      const created = this.app.vault.getAbstractFileByPath(path);
      if (created instanceof TFolder) {
        new RenameItemModal(this.app, { target: created, heading: 'Rename folder' }).open();
      }
      return path;
    } catch (err) {
      showToast(`Could not create folder at ${path}: ${String(err)}`, 'error');
      return null;
    }
  }

  /** Returns the first available `<base><n><ext>` under `parent`. Used by
   *  createNewNoteIn / createNewFolderIn to mirror Obsidian's collision-
   *  numbering convention (Untitled, Untitled 1, Untitled 2, ...). */
  private findAvailableName(parent: string, base: string, ext: string): string {
    for (let i = 0; i < 1000; i += 1) {
      const suffix = i === 0 ? '' : ` ${String(i)}`;
      const candidate = `${base}${suffix}${ext}`;
      const fullPath = parent ? `${parent}/${candidate}` : candidate;
      if (!this.app.vault.getAbstractFileByPath(fullPath)) return candidate;
    }
    // Pathological fallback — 1000 untitled items in a single folder is
    // operator error, not a bug; degrade to a timestamped name.
    return `${base} ${String(Date.now())}${ext}`;
  }

  private async loadZones(): Promise<void> {
    try {
      const vaultRoot = this.getVaultRoot();
      const manifestDir = (this.manifest as unknown as { dir?: string }).dir ?? '';
      const pluginRoot = manifestDir ? `${vaultRoot}/${manifestDir}` : vaultRoot;
      this.zones = scanZones(nodeFsAdapter(), {
        vaultRoot,
        manifestPath: this.settings.zones.manifestPath,
        iconPath: this.settings.zones.iconManifestPath,
        pluginRoot,
        zoneFolders: this.settings.zones.folders,
      }) as unknown as Record<string, Zone>;
    } catch (err) {
      console.warn(`[${PLUGIN_ID}] zone scan failed; continuing with empty state`, err);
      this.zones = {};
    }
  }

  private registerRibbonIcons(): void {
    for (const zone of ZONE_RIBBON_IDS) {
      const label = `WorkDesk: ${zone[0].toUpperCase()}${zone.slice(1)} zone`;
      const el = this.addRibbonIcon(`workdesk-${zone}`, label, () => {
        void this.revealZone(zone);
      });
      el.classList.add('workdesk-icon');
      el.style.setProperty('--workdesk-active-bg', `var(--ws-zone-${zone}-bg)`);
      el.style.setProperty('--workdesk-active-fg', `var(--ws-zone-${zone}-fg)`);
      el.dataset.zone = zone;
      this.ribbonElements.push(el);
    }
    const utilityIcons: Array<{ name: string; title: string; handler: () => void | Promise<void> }> = [
      { name: 'workdesk-today', title: "WorkDesk: Today's daily note", handler: () => this.openDaily() },
      { name: 'workdesk-terminal', title: 'WorkDesk: Toggle terminal pane', handler: () => this.toggleTerminalPane() },
      { name: 'workdesk-focus', title: 'WorkDesk: Toggle focus mode', handler: () => { this.toggleFocus(); } },
      { name: 'workdesk-mic', title: 'WorkDesk: Quick capture', handler: () => this.openQuickCapture() },
      { name: 'workdesk-settings', title: 'WorkDesk: Open WorkDesk settings', handler: () => this.openWorkdeskSettings() },
    ];
    for (const util of utilityIcons) {
      const el = this.addRibbonIcon(util.name, util.title, () => { void util.handler(); });
      el.classList.add('workdesk-icon');
      this.ribbonElements.push(el);
    }
  }

  async revealZone(zoneId: ZoneId): Promise<void> {
    this.activeZone = zoneId;
    const workspace = this.app.workspace;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE_WORKDESK_ZONE);
    let leaf = leaves[0];
    if (!leaf) {
      const left = workspace.getLeftLeaf(false);
      if (!left) return;
      await left.setViewState({ type: VIEW_TYPE_WORKDESK_ZONE, active: true });
      leaf = left;
    }
    await workspace.revealLeaf(leaf);
    const view = leaf.view as ZoneView | undefined;
    if (!view) return;
    if (zoneId === 'files') {
      const tree = scanFilesView(nodeFsAdapter(), { vaultRoot: this.getVaultRoot() });
      // Wrapper zone-object with id: '' so ZoneView passes an empty pathPrefix
      // to renderTree. Combined with the TreeRow patch (empty pathPrefix uses
      // node.name as the path root), this makes tree-row file paths
      // vault-relative (e.g. 'atlas/people/martin-holland.md').
      view.setZones({
        files: {
          name: 'files',
          sub: 'all vault files',
          icon: 'files',
          objects: [{
            id: '',
            title: 'files',
            sub: '',
            icon: 'files',
            count: tree.length,
            children: tree,
          }],
        },
      } as unknown as Record<string, Zone>);
      view.setActiveZone('files' as ZoneId);
    } else {
      view.setZones(this.zones);
      view.setActiveZone(zoneId);
    }
    this.refreshZoneRibbonActive(zoneId);
  }

  private refreshZoneRibbonActive(active: ZoneId): void {
    for (const el of this.ribbonElements) {
      if (!el.dataset.zone) continue;
      el.classList.toggle('workdesk-active', el.dataset.zone === active);
    }
  }

  private refreshFocusIconActive(on: boolean): void {
    // Focus icon is index 9 in the ribbonElements array (after 7 zones + today
    // + terminal). Defensive: no-op if not yet registered.
    const focusEl = this.ribbonElements[9];
    if (!focusEl) return;
    focusEl.classList.toggle('workdesk-focus-active', on);
  }

  applyAppearance(): void {
    activeDocument.body.classList.toggle(
      'workdesk-hide-native-ribbon-icons',
      this.settings.appearance.hideNonWorkdeskRibbonIcons,
    );
  }

  private getVaultRoot(): string {
    const adapter = this.app.vault.adapter;
    if (adapter instanceof FileSystemAdapter) return adapter.getBasePath();
    return this.settings.vault.path;
  }

  private async toggleTerminalPane(): Promise<void> {
    const workspace = this.app.workspace;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE_WORKDESK_TERMINAL);
    if (leaves.length === 0) {
      const leaf = workspace.getRightLeaf(false);
      if (!leaf) return;
      await leaf.setViewState({ type: VIEW_TYPE_WORKDESK_TERMINAL, active: true });
      await workspace.revealLeaf(leaf);
      return;
    }

    const rightSplit = (workspace as unknown as { rightSplit?: WorkspaceItemLike }).rightSplit;
    const sidebarLeaf = leaves.find((l) => leafIsHostedBy(l, rightSplit));

    if (sidebarLeaf && rightSplit) {
      if (rightSplit.collapsed) {
        rightSplit.expand();
        await workspace.revealLeaf(sidebarLeaf);
        return;
      }
      if (workspace.getActiveViewOfType?.(TerminalView) === sidebarLeaf.view) {
        rightSplit.collapse();
        return;
      }
      await workspace.revealLeaf(sidebarLeaf);
      return;
    }

    await workspace.revealLeaf(leaves[0]);
  }

  async openNewTerminalTab(): Promise<void> {
    const workspace = this.app.workspace;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE_WORKDESK_TERMINAL);
    if (leaves.length === 0) {
      const right = workspace.getRightLeaf(false);
      if (!right) return;
      await right.setViewState({ type: VIEW_TYPE_WORKDESK_TERMINAL, active: true });
      await workspace.revealLeaf(right);
      return;
    }
    const leaf = leaves[0];
    await workspace.revealLeaf(leaf);
    const view = leaf.view as TerminalView | undefined;
    if (view?.createSession) view.createSession();
  }

  private installTerminalStatusObservers(): void {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_WORKDESK_TERMINAL)) {
      if (!(leaf.view instanceof TerminalView)) continue;
      installStatusObserver(leaf.view);
    }
  }

  /** First terminal leaf's view, or null if no terminal has been opened yet. */
  private firstTerminalView(): TerminalView | null {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_WORKDESK_TERMINAL);
    if (leaves.length === 0) return null;
    const view = leaves[0].view;
    return view instanceof TerminalView ? view : null;
  }

  async triageCaptureInbox(): Promise<void> {
    await this.revealZone('gtd');
    showToast('Switched to gtd · run /triage in terminal to process inbox', 'info');
  }

  private openQuickCapture(): void {
    const modal = new QuickCaptureModal(this, { vault: obsidianCaptureVault(this.app) });
    modal.open();
  }

  private async openDaily(): Promise<void> {
    const d = new Date();
    const filenameFormat = this.settings.vault.dailyFilenameFormat?.trim() || 'YYYY-MM-DD';
    const filenameStem = formatDate(d, filenameFormat);
    // `dateStr` is the canonical YYYY-MM-DD date passed into the template
    // engine as {{title}}; keep it independent of the filename format so
    // template substitutions stay stable when the operator changes the
    // filename pattern.
    const dateStr = formatDate(d, 'YYYY-MM-DD');
    const folder = this.settings.vault.dailyNoteFolder.replace(/^\/+|\/+$/g, '');
    const path = folder ? `${folder}/${filenameStem}.md` : `${filenameStem}.md`;

    const existing = this.app.vault.getAbstractFileByPath(path);
    if (existing instanceof TFile) {
      await this.app.workspace.openLinkText(path, '', false);
      return;
    }

    if (folder && !this.app.vault.getAbstractFileByPath(folder)) {
      try {
        await this.app.vault.createFolder(folder);
      } catch {
        // Folder may already exist; ignore.
      }
    }

    const content = await this.resolveDailyTemplate(d, dateStr);
    try {
      await this.app.vault.create(path, content);
    } catch (err) {
      showToast(`Could not create daily note at ${path}: ${String(err)}`, 'error');
      return;
    }
    await this.app.workspace.openLinkText(path, '', false);
  }

  private async resolveDailyTemplate(now: Date, dateStr: string): Promise<string> {
    const templatePath = this.settings.vault.dailyTemplatePath.trim();
    if (!templatePath) return '';

    let raw: string | null = null;

    // Vault index first — preferred path, respects renames and moves.
    const tpl = this.app.vault.getAbstractFileByPath(templatePath);
    if (tpl instanceof TFile) {
      try {
        raw = await this.app.vault.read(tpl);
      } catch (err) {
        showToast(
          `Could not read daily template "${templatePath}": ${String(err)}`,
          'error',
          { duration: 12000 },
        );
        return '';
      }
    } else {
      // Index miss — fall back to the adapter which reads directly from
      // disk. Covers the case where the template file was added or moved
      // outside Obsidian's awareness (terminal create, plugin file ops,
      // file watcher race during initial vault scan).
      try {
        const exists = await this.app.vault.adapter.exists(templatePath);
        if (exists) raw = await this.app.vault.adapter.read(templatePath);
      } catch {
        // Adapter errors fall through to the "not found" toast below.
      }
      if (raw == null) {
        showToast(
          `Daily template not found at "${templatePath}". Creating empty note. Check Settings → WorkdeskOS → Daily note template path.`,
          'error',
          { duration: 12000 },
        );
        return '';
      }
    }

    return applyTemplateVariables(raw, {
      now,
      title: dateStr,
      dateFormat: this.settings.templates.dateFormat,
      timeFormat: this.settings.templates.timeFormat,
    });
  }

  private openWorkdeskSettings(): void {
    const setting = (this.app as unknown as {
      setting?: { open(): void; openTabById(id: string): void };
    }).setting;
    if (!setting) {
      showToast('Could not open settings — open Settings → WorkdeskOS manually.', 'info');
      return;
    }
    setting.open();
    setting.openTabById(PLUGIN_ID);
  }

  toggleFocus(): boolean {
    if (!this.focus) return false;
    const next = this.focus.toggle();
    this.refreshFocusIconActive(next);
    return next;
  }

  async loadSettings(): Promise<void> {
    const raw = (await this.loadData()) as Partial<WorkdeskSettings> | null;
    this.settings = mergeDeep(DEFAULT_SETTINGS, raw ?? {});
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}

// Subset of Obsidian's WorkspaceSidedock surface we actually call.
interface WorkspaceItemLike {
  collapsed: boolean;
  expand(): void;
  collapse(): void;
}

function leafIsHostedBy(leaf: unknown, container: unknown): boolean {
  if (!container) return false;
  const getRoot = (leaf as { getRoot?: () => unknown }).getRoot;
  if (typeof getRoot !== 'function') return false;
  return getRoot.call(leaf) === container;
}

function mergeDeep<T>(base: T, patch: Partial<T>): T {
  if (patch === null || patch === undefined) return base;
  if (typeof base !== 'object' || base === null) return (patch as T) ?? base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && k in (base as Record<string, unknown>)) {
      out[k] = mergeDeep((base as Record<string, unknown>)[k], v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}
