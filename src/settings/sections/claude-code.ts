// Claude Code section — binary path, tab status, status flags, skills dir.

import { Setting } from 'obsidian';
import type WorkdeskOSPlugin from '../../main';

export function mountClaudeCodeSection(containerEl: HTMLElement, plugin: WorkdeskOSPlugin): void {
  new Setting(containerEl)
    // eslint-disable-next-line obsidianmd/ui/sentence-case -- "Claude Code" is the Anthropic CLI product name.
    .setName('Claude Code')
    .setHeading();

  new Setting(containerEl)
    .setName('Binary path')
    .setDesc('Absolute path to the Claude CLI.')
    .addText((text) => {
      text
        .setValue(plugin.settings.claude.binaryPath)
        .onChange((value) => {
          plugin.settings.claude.binaryPath = value;
          void plugin.saveSettings();
        });
    });

  new Setting(containerEl)
    .setName('Auto-detect tab status')
    // eslint-disable-next-line obsidianmd/ui/sentence-case -- "Claude Code" is a product name.
    .setDesc('Parse ● / ⎿ markers from Claude Code output to color the tabs.')
    .addToggle((toggle) => {
      toggle
        .setValue(plugin.settings.claude.autoDetectTabStatus)
        .onChange((value) => {
          plugin.settings.claude.autoDetectTabStatus = value;
          void plugin.saveSettings();
        });
    });

  new Setting(containerEl)
    .setName('Show context percentage')
    .addToggle((toggle) => {
      toggle
        .setValue(plugin.settings.claude.showContextPct)
        .onChange((value) => {
          plugin.settings.claude.showContextPct = value;
          void plugin.saveSettings();
        });
    });

  new Setting(containerEl)
    .setName('Show cost estimate')
    .addToggle((toggle) => {
      toggle
        .setValue(plugin.settings.claude.showCostEstimate)
        .onChange((value) => {
          plugin.settings.claude.showCostEstimate = value;
          void plugin.saveSettings();
        });
    });

  new Setting(containerEl)
    .setName('Skills directory')
    .setDesc('Vault-relative path to the skills folder.')
    .addText((text) => {
      text
        .setValue(plugin.settings.claude.skillsDir)
        .onChange((value) => {
          plugin.settings.claude.skillsDir = value;
          void plugin.saveSettings();
        });
    });
}
