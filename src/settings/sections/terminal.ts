// Terminal section — shell, font, cursor, wrap.

import { Setting } from 'obsidian';
import type WorkdeskOSPlugin from '../../main';

export function mountTerminalSection(containerEl: HTMLElement, plugin: WorkdeskOSPlugin): void {
  new Setting(containerEl).setName('Terminal').setHeading();

  new Setting(containerEl)
    .setName('Shell command')
    .setDesc('Command used to spawn the terminal session.')
    .addText((text) => {
      text
        .setValue(plugin.settings.terminal.shell)
        .onChange((value) => {
          plugin.settings.terminal.shell = value;
          void plugin.saveSettings();
        });
    });

  new Setting(containerEl)
    .setName('Font')
    .addDropdown((dropdown) => {
      dropdown
        /* eslint-disable obsidianmd/ui/sentence-case -- font product names. */
        .addOption('Geist Mono', 'Geist Mono')
        .addOption('JetBrains Mono', 'JetBrains Mono')
        .addOption('IBM Plex Mono', 'IBM Plex Mono')
        .addOption('SF Mono', 'SF Mono')
        /* eslint-enable obsidianmd/ui/sentence-case */
        .setValue(plugin.settings.terminal.font)
        .onChange((value) => {
          plugin.settings.terminal.font = value as WorkdeskOSPlugin['settings']['terminal']['font'];
          void plugin.saveSettings();
        });
    });

  new Setting(containerEl)
    .setName('Cursor')
    .addDropdown((dropdown) => {
      dropdown
        .addOption('block', 'Block')
        .addOption('bar', 'Bar')
        .addOption('underline', 'Underline')
        .setValue(plugin.settings.terminal.cursorStyle)
        .onChange((value) => {
          plugin.settings.terminal.cursorStyle = value as WorkdeskOSPlugin['settings']['terminal']['cursorStyle'];
          void plugin.saveSettings();
        });
    });

  new Setting(containerEl)
    .setName('Wrap lines')
    .addToggle((toggle) => {
      toggle
        .setValue(plugin.settings.terminal.wrap)
        .onChange((value) => {
          plugin.settings.terminal.wrap = value;
          void plugin.saveSettings();
        });
    });
}
