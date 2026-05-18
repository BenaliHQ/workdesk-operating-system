// Appearance section — visual scaffolding controls.

import { Setting } from 'obsidian';
import type WorkdeskOSPlugin from '../../main';

export function mountAppearanceSection(containerEl: HTMLElement, plugin: WorkdeskOSPlugin): void {
  new Setting(containerEl).setName('Appearance').setHeading();

  new Setting(containerEl)
    // eslint-disable-next-line obsidianmd/ui/sentence-case -- "Workdesk" is the product name.
    .setName('Hide non-Workdesk ribbon icons')
    .setDesc(
      // eslint-disable-next-line obsidianmd/ui/sentence-case -- "Workdesk Operating System" is the product name.
      'Hides every ribbon icon not contributed by Workdesk Operating System. Use when you want a tighter ribbon focused on Workdesk surfaces; other plugins continue to function normally.',
    )
    .addToggle((toggle) => {
      toggle
        .setValue(plugin.settings.appearance.hideNonWorkdeskRibbonIcons)
        .onChange((value) => {
          plugin.settings.appearance.hideNonWorkdeskRibbonIcons = value;
          void plugin.saveSettings();
          plugin.applyAppearance();
        });
    });
}
