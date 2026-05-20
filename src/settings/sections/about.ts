// About section — plugin metadata, update button, repository link.

import { Setting } from 'obsidian';
import type WorkdeskOSPlugin from '../../main';
import { checkAndUpdate } from '../../services/updater';

const REPO_URL = 'https://github.com/BenaliHQ/workdesk-operating-system';

export function mountAboutSection(containerEl: HTMLElement, plugin: WorkdeskOSPlugin): void {
  new Setting(containerEl).setName('About').setHeading();

  new Setting(containerEl)
    .setName(plugin.manifest.name)
    .setDesc(`Version ${plugin.manifest.version} · MIT`);

  new Setting(containerEl)
    .setName('Plugin updates')
    .setDesc('Pulls the latest release from GitHub and installs it in place. A reload prompt appears after a successful update.')
    .addButton((button) => {
      button
        .setButtonText('Check for updates')
        .onClick(async () => {
          button.setDisabled(true);
          button.setButtonText('Checking…');
          try {
            await checkAndUpdate(plugin);
          } finally {
            button.setDisabled(false);
            button.setButtonText('Check for updates');
          }
        });
    });

  new Setting(containerEl)
    .setName('Repository')
    .setDesc('Source code and issue tracker.')
    .addButton((button) => {
      button
        .setButtonText('Open on GitHub')
        .onClick(() => {
          window.open(REPO_URL, '_blank');
        });
    });
}
