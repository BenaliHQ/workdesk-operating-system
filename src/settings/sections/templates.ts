// Templates section — folder + default date/time formats for the
// Insert template command.

import { Setting } from 'obsidian';
import type WorkdeskOSPlugin from '../../main';

export function mountTemplatesSection(containerEl: HTMLElement, plugin: WorkdeskOSPlugin): void {
  new Setting(containerEl).setName('Templates').setHeading();

  new Setting(containerEl)
    .setName('Templates folder')
    // eslint-disable-next-line obsidianmd/ui/sentence-case -- "Insert template" is the command name.
    .setDesc('Vault-relative folder where template files live. The Insert template command lists every markdown file under this folder, recursively.')
    .addText((text) => {
      text
        // eslint-disable-next-line obsidianmd/ui/sentence-case -- folder path, not prose.
        .setPlaceholder('config/templates')
        .setValue(plugin.settings.templates.folder)
        .onChange((value) => {
          plugin.settings.templates.folder = value.trim();
          void plugin.saveSettings();
        });
    });

  new Setting(containerEl)
    .setName('Date format')
    .setDesc('Default format for {{date}} substitutions. Tokens: YYYY, MM, DD, HH, mm, ss.')
    .addText((text) => {
      text
        // eslint-disable-next-line obsidianmd/ui/sentence-case -- moment-style token.
        .setPlaceholder('YYYY-MM-DD')
        .setValue(plugin.settings.templates.dateFormat)
        .onChange((value) => {
          plugin.settings.templates.dateFormat = value.trim() || 'YYYY-MM-DD';
          void plugin.saveSettings();
        });
    });

  new Setting(containerEl)
    .setName('Time format')
    .setDesc('Default format for {{time}} substitutions.')
    .addText((text) => {
      text
        // eslint-disable-next-line obsidianmd/ui/sentence-case -- moment-style token.
        .setPlaceholder('HH:mm')
        .setValue(plugin.settings.templates.timeFormat)
        .onChange((value) => {
          plugin.settings.templates.timeFormat = value.trim() || 'HH:mm';
          void plugin.saveSettings();
        });
    });
}
