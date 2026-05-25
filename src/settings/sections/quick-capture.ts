// Quick capture section — STT provider, model, and API key.
//
// The STT key uses Obsidian's SecretComponent (1.11.4+) so the plaintext key
// never lands in data.json. Reads through `app.secretStorage.getSecret`,
// writes through `setSecret` on change.
//
// Two key-source modes: `direct` (operator pastes the key) and `infisical`
// (a "Pull from Infisical" button shells out to the CLI, stores the value
// in the same secretStorage slot the direct path uses). Capture-time
// behavior is identical regardless of source — only the populate flow
// differs.

import { Setting, SecretComponent } from 'obsidian';
import type WorkdeskOSPlugin from '../../main';
import { fetchInfisicalSecret } from '../../services/infisical-fetch';
import { showToast } from '../../components/Toast';

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
    .setDesc('Vault-relative folder where voice memos land. Defaults to personal/captures (the captures practice).')
    .addText((text) => {
      text
        // eslint-disable-next-line obsidianmd/ui/sentence-case -- folder path, not prose.
        .setPlaceholder('personal/captures')
        .setValue(plugin.settings.capture.defaultDest)
        .onChange((value) => {
          plugin.settings.capture.defaultDest = value.trim();
          void plugin.saveSettings();
        });
    });

  new Setting(containerEl)
    .setName('Key source')
    // eslint-disable-next-line obsidianmd/ui/sentence-case -- STT, CLI are acronyms; Infisical is a proper noun.
    .setDesc('Where the STT API key comes from. Direct = paste below. Infisical = pull from the CLI on demand and cache.')
    .addDropdown((dropdown) => {
      dropdown
        .addOption('direct', 'Direct input')
        .addOption('infisical', 'Infisical')
        .setValue(plugin.settings.capture.keySource)
        .onChange((value) => {
          plugin.settings.capture.keySource = value as 'direct' | 'infisical';
          void plugin.saveSettings();
          applyKeySourceVisibility(containerEl, value as 'direct' | 'infisical');
        });
    });

  const directRow = new Setting(containerEl)
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
  directRow.settingEl.dataset.keySource = 'direct';

  const projectIdRow = new Setting(containerEl)
    .setName('Infisical project ID')
    // eslint-disable-next-line obsidianmd/ui/sentence-case -- proper nouns + Obsidian-style menu path.
    .setDesc('Project that holds the STT secret. Find it under Settings → General in the Infisical web UI.')
    .addText((text) => {
      text
        .setValue(plugin.settings.capture.infisical.projectId)
        .onChange((value) => {
          plugin.settings.capture.infisical.projectId = value.trim();
          void plugin.saveSettings();
        });
    });
  projectIdRow.settingEl.dataset.keySource = 'infisical';

  const secretNameRow = new Setting(containerEl)
    .setName('Infisical secret name')
    // eslint-disable-next-line obsidianmd/ui/sentence-case -- describes a literal SCREAMING_SNAKE_CASE constant name.
    .setDesc('Name of the secret to pull. Defaults to PERSONAL_GROQ_WHISPER_API_KEY.')
    .addText((text) => {
      text
        .setValue(plugin.settings.capture.infisical.secretName)
        .onChange((value) => {
          plugin.settings.capture.infisical.secretName = value.trim();
          void plugin.saveSettings();
        });
    });
  secretNameRow.settingEl.dataset.keySource = 'infisical';

  const envRow = new Setting(containerEl)
    .setName('Infisical environment')
    .setDesc('Usually prod.')
    .addText((text) => {
      text
        .setValue(plugin.settings.capture.infisical.environment)
        .onChange((value) => {
          plugin.settings.capture.infisical.environment = value.trim();
          void plugin.saveSettings();
        });
    });
  envRow.settingEl.dataset.keySource = 'infisical';

  const pullRow = new Setting(containerEl)
    // eslint-disable-next-line obsidianmd/ui/sentence-case -- Infisical is a proper noun.
    .setName('Pull from Infisical')
    .setDesc(formatLastPulledDesc(plugin.settings.capture.infisical.lastPulledAt))
    .addButton((btn) => {
      btn.setButtonText('Pull now').onClick(async () => {
        btn.setDisabled(true);
        try {
          const value = await fetchInfisicalSecret({
            projectId: plugin.settings.capture.infisical.projectId,
            secretName: plugin.settings.capture.infisical.secretName,
            environment: plugin.settings.capture.infisical.environment,
          });
          plugin.app.secretStorage.setSecret(STT_KEY_NAME, value);
          plugin.settings.capture.infisical.lastPulledAt = new Date().toISOString();
          await plugin.saveSettings();
          pullRow.setDesc(formatLastPulledDesc(plugin.settings.capture.infisical.lastPulledAt));
          showToast('STT key cached in Obsidian secret storage.', 'success', { title: 'Infisical' });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          showToast(msg, 'error', { title: 'Infisical pull failed' });
        } finally {
          btn.setDisabled(false);
        }
      });
    });
  pullRow.settingEl.dataset.keySource = 'infisical';

  applyKeySourceVisibility(containerEl, plugin.settings.capture.keySource);
}

function applyKeySourceVisibility(containerEl: HTMLElement, source: 'direct' | 'infisical'): void {
  const rows = containerEl.querySelectorAll<HTMLElement>('[data-key-source]');
  for (const row of Array.from(rows)) {
    row.style.display = row.dataset.keySource === source ? '' : 'none';
  }
}

function formatLastPulledDesc(lastPulledAt?: string): string {
  if (!lastPulledAt) return 'No pull yet. Click "Pull now" once project ID + secret name are filled in.';
  const d = new Date(lastPulledAt);
  if (Number.isNaN(d.getTime())) return 'Last pull: unknown.';
  const stamp = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  return `Last pulled: ${stamp} · key cached in Obsidian secret storage.`;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}
