import { Plugin } from 'obsidian';
import {
  COMMAND_ID_PREFIX,
  PLUGIN_ID,
  VIEW_TYPE_WORKDESK_HTML,
  VIEW_TYPE_WORKDESK_TERMINAL,
  VIEW_TYPE_WORKDESK_ZONE,
} from './constants';
import { DEFAULT_SETTINGS, WorkdeskSettings } from './settings';
import { WorkdeskRibbon } from './views/RibbonControl';
import { ZoneView } from './views/ZoneView';
import { HtmlView } from './views/HtmlView';
import { TerminalView } from './views/TerminalView';
import { mountShell } from './layout/shell';
import { wikilinkAndTagDecorations } from './editor/wikilink-ext';
import { CommandPalette } from './modals/CommandPalette';
import { QuickCaptureModal } from './modals/QuickCapture';
import { WorkdeskSettingTab } from './settings/tab';
import { createFocusController, type FocusController } from './services/focus';
import { obsidianCaptureVault } from './services/capture/obsidian-vault';
import { installGlobalToast, showToast } from './components/Toast';
import { attachEditorDragHover } from './components/DragDropHover';
import type { ZoneId } from './types';

export default class WorkdeskosPlugin extends Plugin {
  settings!: WorkdeskSettings;
  ribbon: WorkdeskRibbon | null = null;
  activeZone: ZoneId = 'atlas';
  focus: FocusController | null = null;
  // First-run orientation is handled by WorkDesk OS's /onboarding skill,
  // not a plugin modal. STATE.json.decisions.onboarding_enabled = false.

  async onload(): Promise<void> {
    console.log(`[${PLUGIN_ID}] loaded`);
    await this.loadSettings();
    installGlobalToast();

    const appEl = document.body.querySelector('.app') as HTMLElement | null
      ?? document.body;
    await mountShell(this, {
      appEl,
      settings: this.settings,
      saveSettings: () => this.saveSettings(),
    });

    this.ribbon = new WorkdeskRibbon(this);
    this.ribbon.mount(appEl);
    this.ribbon.onSlot((slot) => this.handleSlot(slot));

    this.focus = createFocusController({
      appEl,
      settings: this.settings,
      saveSettings: () => this.saveSettings(),
    });
    this.focus.restore();
    if (this.focus.isOn()) this.ribbon.setFocus(true);

    const editorPane = document.querySelector<HTMLElement>('.editor-pane');
    if (editorPane) {
      attachEditorDragHover(editorPane, {
        onPathDropped: (path) => {
          showToast(`Inserted file reference · ${path}`, 'success');
        },
      });
    }

    this.registerView(VIEW_TYPE_WORKDESK_ZONE, (leaf) => new ZoneView(leaf, this));

    this.registerView(VIEW_TYPE_WORKDESK_HTML, (leaf) => new HtmlView(leaf, this));
    this.registerExtensions(['html', 'htm'], VIEW_TYPE_WORKDESK_HTML);

    this.registerView(VIEW_TYPE_WORKDESK_TERMINAL, (leaf) => new TerminalView(leaf, this));

    this.registerEditorExtension(wikilinkAndTagDecorations);

    this.addSettingTab(new WorkdeskSettingTab(this.app, this));

    this.addCommand({
      id: `${COMMAND_ID_PREFIX}:open-palette`,
      name: 'Open command palette',
      hotkeys: [{ modifiers: ['Mod'], key: 'k' }],
      callback: () => new CommandPalette(this.app).open(),
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

    this.addCommand({
      id: `${COMMAND_ID_PREFIX}:capture:triage`,
      name: 'Triage capture inbox',
      callback: () => this.triageCaptureInbox(),
    });

    this.addCommand({
      id: `${COMMAND_ID_PREFIX}:capture:open`,
      name: 'Quick capture',
      hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'm' }],
      callback: () => this.openQuickCapture(),
    });

    this.addCommand({
      id: `${COMMAND_ID_PREFIX}:focus:toggle`,
      name: 'Toggle focus mode',
      hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'f' }],
      callback: () => this.toggleFocus(),
    });

    this.registerDomEvent(document, 'keydown', (evt: KeyboardEvent) => {
      if (evt.key !== 'Escape') return;
      const modalOpen = document.querySelector('.modal-container.mod-shown, .scrim.open');
      if (modalOpen) return;
      if (this.focus?.isOn()) {
        this.focus.off();
        this.ribbon?.setFocus(false);
      }
    });
  }

  async onunload(): Promise<void> {
    this.ribbon?.unmount();
    console.log(`[${PLUGIN_ID}] unloaded`);
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
    // Prefer a terminal leaf that actually lives inside the right sidebar so
    // toggle collapses the dock rather than hiding an unrelated editor tab.
    const sidebarLeaf = leaves.find((l) => leafIsHostedBy(l, rightSplit));

    if (sidebarLeaf && rightSplit) {
      if (rightSplit.collapsed) {
        rightSplit.expand();
        await workspace.revealLeaf(sidebarLeaf);
        return;
      }
      // Sidebar is open. If the terminal is the active view, collapse;
      // otherwise just bring it to the front of the sidebar.
      if (workspace.getActiveViewOfType?.(TerminalView) === sidebarLeaf.view) {
        rightSplit.collapse();
        return;
      }
      await workspace.revealLeaf(sidebarLeaf);
      return;
    }

    // No sidebar-hosted terminal — focus whichever one we have.
    await workspace.revealLeaf(leaves[0]!);
  }

  private async openNewTerminalTab(): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_WORKDESK_TERMINAL);
    if (existing.length > 0) {
      const leaf = existing[0]!;
      // Reveal first so a deferred/collapsed leaf has a chance to call
      // onOpen() and mount its canvas host. Without this, openNewSession()
      // can no-op (no canvasHost yet) or attach an xterm to a hidden
      // container that never gets the correct size.
      await this.app.workspace.revealLeaf(leaf);
      const view = leaf.view as TerminalView | undefined;
      if (view?.openNewSession) {
        view.openNewSession();
        return;
      }
    }
    const leaf = this.app.workspace.getLeaf('tab');
    await leaf.setViewState({ type: VIEW_TYPE_WORKDESK_TERMINAL, active: true });
    await this.app.workspace.revealLeaf(leaf);
  }

  private async triageCaptureInbox(): Promise<void> {
    // Per design's prototype.js: navigate to gtd zone where unprocessed
    // captures land. The actual /triage skill runs inside the terminal —
    // operator invokes it manually once they're looking at the inbox.
    this.handleSlot('gtd');
    // handleSlot only updates the plugin's active-zone state + ribbon.
    // Push the change into every live ZoneView so the visible pane actually
    // re-renders the gtd inbox, then reveal the first zone leaf so the
    // operator lands on it instead of having to click the ribbon.
    const zoneLeaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_WORKDESK_ZONE);
    for (const leaf of zoneLeaves) {
      const view = leaf.view as ZoneView | undefined;
      view?.setActiveZone?.('gtd');
    }
    const target = zoneLeaves[0];
    if (target) await this.app.workspace.revealLeaf(target);
    showToast('Switched to gtd · run /triage in terminal to process inbox', 'info');
  }

  private openQuickCapture(): void {
    const modal = new QuickCaptureModal(this, { vault: obsidianCaptureVault(this.app) });
    modal.open();
  }

  toggleFocus(): boolean {
    if (!this.focus) return false;
    const next = this.focus.toggle();
    this.ribbon?.setFocus(next);
    return next;
  }

  private handleSlot(slot: string): void {
    const zones: ZoneId[] = ['atlas', 'gtd', 'intel', 'personal', 'system', 'config', 'files'];
    if (zones.includes(slot as ZoneId)) {
      this.activeZone = slot as ZoneId;
      this.ribbon?.setActiveZone(this.activeZone);
    } else if (slot === 'focus') {
      this.toggleFocus();
    }
  }

  async loadSettings(): Promise<void> {
    const raw = (await this.loadData()) as Partial<WorkdeskSettings> | null;
    this.settings = mergeDeep(DEFAULT_SETTINGS, raw ?? {});
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}

// Subset of Obsidian's WorkspaceSidedock surface we actually call. Kept here
// so the toggle path doesn't drag the full type and still narrows correctly
// when checking sidebar hosting.
interface WorkspaceItemLike {
  collapsed: boolean;
  expand(): void;
  collapse(): void;
}

function leafIsHostedBy(leaf: { getRoot?: () => unknown } | unknown, container: unknown): boolean {
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
