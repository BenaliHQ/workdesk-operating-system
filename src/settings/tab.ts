// Settings tab — one scrollable column divided by Setting.setHeading() per
// section. Follows Obsidian's native PluginSettingTab idiom: rows are built
// with `new Setting(containerEl)` so spacing, alignment, and theme styling
// come from Obsidian's stylesheet, not custom CSS.

import { PluginSettingTab, type App } from 'obsidian';
import type WorkdeskOSPlugin from '../main';
import { mountGeneralSection } from './sections/general';
import { mountZonesSection } from './sections/zones';
import { mountTerminalSection } from './sections/terminal';
import { mountQuickCaptureSection } from './sections/quick-capture';
import { mountClaudeCodeSection } from './sections/claude-code';
import { mountTemplatesSection } from './sections/templates';
import { mountAppearanceSection } from './sections/appearance';
import { mountAboutSection } from './sections/about';

export class WorkdeskSettingTab extends PluginSettingTab {
  private plugin: WorkdeskOSPlugin;

  constructor(app: App, plugin: WorkdeskOSPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass('workdesk-os-settings');

    mountGeneralSection(containerEl, this.plugin);
    mountZonesSection(containerEl, this.plugin);
    mountTerminalSection(containerEl, this.plugin);
    void mountQuickCaptureSection(containerEl, this.plugin);
    mountClaudeCodeSection(containerEl, this.plugin);
    mountTemplatesSection(containerEl, this.plugin);
    mountAppearanceSection(containerEl, this.plugin);
    mountAboutSection(containerEl, this.plugin);
  }

  hide(): void {
    this.containerEl.empty();
  }
}
