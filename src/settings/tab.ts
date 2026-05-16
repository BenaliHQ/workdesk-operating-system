// Settings tab — seven sub-tabs (General / Zones / Terminal / Quick capture /
// Claude Code / Appearance / About) following design's .settings layout.
// Navigation column on the left switches the displayed section.

import { PluginSettingTab, type App } from 'obsidian';
import type WorkdeskOSPlugin from '../main';
import { mountGeneralSection } from './sections/general';
import { mountZonesSection } from './sections/zones';
import { mountTerminalSection } from './sections/terminal';
import { mountQuickCaptureSection } from './sections/quick-capture';
import { mountClaudeCodeSection } from './sections/claude-code';
import { mountAppearanceSection } from './sections/appearance';
import { mountAboutSection } from './sections/about';

export type SettingsTabId =
  | 'general'
  | 'zones'
  | 'terminal'
  | 'quick-capture'
  | 'claude-code'
  | 'appearance'
  | 'about';

const TAB_ORDER: Array<{ id: SettingsTabId; label: string }> = [
  { id: 'general', label: 'General' },
  { id: 'zones', label: 'Zones' },
  { id: 'terminal', label: 'Terminal' },
  { id: 'quick-capture', label: 'Quick capture' },
  { id: 'claude-code', label: 'Claude Code' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'about', label: 'About' },
];

export class WorkdeskSettingTab extends PluginSettingTab {
  private plugin: WorkdeskOSPlugin;
  private activeId: SettingsTabId = 'general';
  private bodyEl: HTMLElement | null = null;

  constructor(app: App, plugin: WorkdeskOSPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    this.containerEl.replaceChildren();
    this.containerEl.classList.add('settings');

    const nav = activeDocument.createEl('aside');
    nav.className = 'settings-nav';
    this.containerEl.appendChild(nav);

    const groupLabel = activeDocument.createDiv();
    groupLabel.className = 'settings-nav-group';
    groupLabel.textContent = 'Workdesk';
    nav.appendChild(groupLabel);

    const navButtons = new Map<SettingsTabId, HTMLButtonElement>();
    for (const t of TAB_ORDER) {
      const item = activeDocument.createEl('button');
      item.type = 'button';
      item.className = 'settings-nav-item';
      item.dataset.tab = t.id;
      item.textContent = t.label;
      if (t.id === this.activeId) item.classList.add('active');
      item.addEventListener('click', () => this.setActive(t.id, navButtons));
      nav.appendChild(item);
      navButtons.set(t.id, item);
    }

    this.bodyEl = activeDocument.createDiv();
    this.bodyEl.className = 'settings-body';
    this.containerEl.appendChild(this.bodyEl);

    this.renderActive();
  }

  hide(): void {
    this.containerEl.replaceChildren();
  }

  renderAllSectionsForTest(): HTMLElement[] {
    const results: HTMLElement[] = [];
    for (const t of TAB_ORDER) {
      const host = activeDocument.createDiv();
      host.className = `settings-section settings-${t.id}`;
      mountSection(t.id, host, this.plugin);
      this.containerEl.appendChild(host);
      results.push(host);
    }
    return results;
  }

  private setActive(id: SettingsTabId, navButtons: Map<SettingsTabId, HTMLButtonElement>): void {
    this.activeId = id;
    for (const [tid, btn] of navButtons.entries()) {
      btn.classList.toggle('active', tid === id);
    }
    this.renderActive();
  }

  private renderActive(): void {
    if (!this.bodyEl) return;
    this.bodyEl.replaceChildren();
    mountSection(this.activeId, this.bodyEl, this.plugin);
  }
}

function mountSection(id: SettingsTabId, parent: HTMLElement, plugin: WorkdeskOSPlugin): void {
  switch (id) {
    case 'general':
      mountGeneralSection(parent, plugin);
      return;
    case 'zones':
      mountZonesSection(parent, plugin);
      return;
    case 'terminal':
      mountTerminalSection(parent, plugin);
      return;
    case 'quick-capture':
      void mountQuickCaptureSection(parent, plugin);
      return;
    case 'claude-code':
      mountClaudeCodeSection(parent, plugin);
      return;
    case 'appearance':
      mountAppearanceSection(parent, plugin);
      return;
    case 'about':
      mountAboutSection(parent, plugin);
      return;
  }
}
