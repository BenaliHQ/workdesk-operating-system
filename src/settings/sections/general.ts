// General section — vault, auto-open daily, reduce motion.

import { Setting } from 'obsidian';
import type WorkdeskOSPlugin from '../../main';

export function mountGeneralSection(containerEl: HTMLElement, plugin: WorkdeskOSPlugin): void {
  new Setting(containerEl).setName('General').setHeading();

  new Setting(containerEl)
    .setName('Vault path')
    .setDesc('Defaults to the current Obsidian vault.')
    .addText((text) => {
      text
        .setValue(plugin.settings.vault.path)
        .onChange((value) => {
          plugin.settings.vault.path = value;
          void plugin.saveSettings();
        });
    });

  new Setting(containerEl)
    .setName('Auto-open daily note')
    .setDesc('Opens today’s daily note on session start.')
    .addToggle((toggle) => {
      toggle
        .setValue(plugin.settings.vault.autoOpenDaily)
        .onChange((value) => {
          plugin.settings.vault.autoOpenDaily = value;
          void plugin.saveSettings();
        });
    });

  new Setting(containerEl)
    .setName('Daily note folder')
    .setDesc('Vault-relative folder where daily notes live.')
    .addText((text) => {
      text
        // eslint-disable-next-line obsidianmd/ui/sentence-case -- folder path, not prose.
        .setPlaceholder('personal/daily')
        .setValue(plugin.settings.vault.dailyNoteFolder)
        .onChange((value) => {
          plugin.settings.vault.dailyNoteFolder = value.trim();
          void plugin.saveSettings();
        });
    });

  new Setting(containerEl)
    .setName('Daily note filename format')
    .setDesc('Moment-style tokens: YYYY MM DD HH mm ss. Anything else passes through literally (e.g. "YYYY.MM.DD Daily Note").')
    .addText((text) => {
      text
        .setPlaceholder('YYYY.MM.DD [Daily Note]')
        .setValue(plugin.settings.vault.dailyFilenameFormat)
        .onChange((value) => {
          plugin.settings.vault.dailyFilenameFormat = value.trim() || 'YYYY.MM.DD [Daily Note]';
          void plugin.saveSettings();
        });
    });

  new Setting(containerEl)
    .setName('Daily note template path')
    .setDesc('Vault-relative path to the template file applied to new daily notes. Variables: {{date}}, {{date:FORMAT}}, {{time}}, {{time:FORMAT}}, {{title}}. Leave blank to create empty daily notes.')
    .addText((text) => {
      text
        .setPlaceholder('config/templates/daily-note.md')
        .setValue(plugin.settings.vault.dailyTemplatePath)
        .onChange((value) => {
          plugin.settings.vault.dailyTemplatePath = value.trim();
          void plugin.saveSettings();
        });
    });

  new Setting(containerEl)
    .setName('Reduce motion')
    .setDesc('Honor the system preference or force on/off.')
    .addDropdown((dropdown) => {
      dropdown
        .addOption('auto', 'Auto')
        .addOption('on', 'On')
        .addOption('off', 'Off')
        .setValue(plugin.settings.theme.reduceMotion)
        .onChange((value) => {
          plugin.settings.theme.reduceMotion = value as 'auto' | 'on' | 'off';
          void plugin.saveSettings();
        });
    });
}
