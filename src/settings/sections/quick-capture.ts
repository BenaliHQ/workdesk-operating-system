// Quick capture section — STT provider, model, and API key.
//
// The STT key uses Obsidian's SecretComponent (1.11.4+) so the plaintext key
// never lands in data.json. Reads through `app.secretStorage.getSecret`,
// writes through `setSecret` on change. The component mounts inside the
// standard Setting row's controlEl so spacing matches the surrounding rows.

import { Setting, SecretComponent } from 'obsidian';
import type WorkdeskOSPlugin from '../../main';

const STT_KEY_NAME = 'stt-groq';

export async function mountQuickCaptureSection(containerEl: HTMLElement, plugin: WorkdeskOSPlugin): Promise<void> {
  new Setting(containerEl).setName('Quick capture').setHeading();

  new Setting(containerEl)
    // eslint-disable-next-line obsidianmd/ui/sentence-case -- STT is an acronym.
    .setName('STT provider')
    .setDesc('Speech-to-text service used for voice captures.')
    .addDropdown((dropdown) => {
      dropdown
        .addOption('groq', 'Groq')
        .addOption('openai', 'OpenAI')
        .addOption('deepgram', 'Deepgram')
        .setValue(plugin.settings.capture.provider)
        .onChange((value) => {
          plugin.settings.capture.provider = value as WorkdeskOSPlugin['settings']['capture']['provider'];
          void plugin.saveSettings();
        });
    });

  new Setting(containerEl)
    // eslint-disable-next-line obsidianmd/ui/sentence-case -- STT is an acronym.
    .setName('STT model')
    .addText((text) => {
      text
        .setValue(plugin.settings.capture.model)
        .onChange((value) => {
          plugin.settings.capture.model = value;
          void plugin.saveSettings();
        });
    });

  new Setting(containerEl)
    .setName('Default destination')
    .setDesc('Vault-relative folder where new captures land by default. The modal’s chips still let you switch at capture time.')
    .addText((text) => {
      text
        // eslint-disable-next-line obsidianmd/ui/sentence-case -- folder path, not prose.
        .setPlaceholder('gtd/inbox')
        .setValue(plugin.settings.capture.defaultDest)
        .onChange((value) => {
          plugin.settings.capture.defaultDest = value.trim();
          void plugin.saveSettings();
        });
    });

  new Setting(containerEl)
    // eslint-disable-next-line obsidianmd/ui/sentence-case -- STT is an acronym.
    .setName('STT API key')
    .setDesc('Stored in Obsidian’s secret storage; never written to data.json.')
    .then((setting) => {
      const secret = new SecretComponent(plugin.app, setting.controlEl);
      const stored = plugin.app.secretStorage.getSecret(STT_KEY_NAME);
      secret.setValue(stored ?? '');
      secret.onChange((value) => {
        plugin.app.secretStorage.setSecret(STT_KEY_NAME, value);
      });
      const input = setting.controlEl.querySelector('input');
      if (input) {
        // eslint-disable-next-line obsidianmd/ui/sentence-case -- STT is an acronym.
        input.setAttribute('aria-label', 'STT API key');
      }
    });
}
