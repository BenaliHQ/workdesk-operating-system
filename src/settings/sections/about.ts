// About section — plugin metadata and repository link.

import { Setting } from 'obsidian';
import type WorkdeskOSPlugin from '../../main';

const REPO_URL = 'https://github.com/BenaliHQ/workdesk-operating-system';

export function mountAboutSection(containerEl: HTMLElement, plugin: WorkdeskOSPlugin): void {
  new Setting(containerEl).setName('About').setHeading();

  new Setting(containerEl)
    .setName(plugin.manifest.name)
    .setDesc(`Version ${plugin.manifest.version} · MIT`);

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
