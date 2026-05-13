// Quick-capture sub-tab — STT provider + key.
//
// The STT key field uses Obsidian's SecretComponent (1.11.4+) so the
// plaintext key never lands in data.json. The current key is fetched via
// app.secretStorage.getSecret('stt-groq') and saved via setSecret on change.
// (SecretStorage IDs must be lowercase alphanumeric with dashes — no colons.)

import { SecretComponent, type App } from 'obsidian';
import type WorkdeskosPlugin from '../../main';
import { field, select, sectionLabel } from '../../components/forms';

const STT_KEY_NAME = 'stt-groq';

export async function mountQuickCaptureSection(parent: HTMLElement, plugin: WorkdeskosPlugin): Promise<void> {
  parent.dataset.tab = 'quick-capture';
  sectionLabel(parent, 'QUICK CAPTURE');

  select(parent, {
    label: 'STT provider',
    initial: plugin.settings.capture.provider,
    choices: [
      { value: 'groq', label: 'Groq' },
      { value: 'openai', label: 'OpenAI' },
      { value: 'deepgram', label: 'Deepgram' },
    ],
    onChange: (v) => {
      plugin.settings.capture.provider = v as WorkdeskosPlugin['settings']['capture']['provider'];
      plugin.saveSettings();
    },
  });

  field(parent, {
    label: 'STT model',
    initial: plugin.settings.capture.model,
    mono: true,
    onChange: (v) => {
      plugin.settings.capture.model = v;
      plugin.saveSettings();
    },
  });

  await mountSecretField(parent, plugin.app);
}

async function mountSecretField(parent: HTMLElement, app: App): Promise<void> {
  const row = document.createElement('div');
  row.className = 'setting';
  row.setAttribute('role', 'group');

  const meta = document.createElement('div');
  meta.className = 'setting-meta';
  const label = document.createElement('div');
  label.className = 'label';
  label.id = 'ws-stt-key-label';
  label.textContent = 'STT API key';
  meta.appendChild(label);
  const desc = document.createElement('div');
  desc.className = 'desc';
  desc.id = 'ws-stt-key-desc';
  desc.textContent = 'Stored in Obsidian’s SecretStorage; never written to data.json.';
  meta.appendChild(desc);
  row.setAttribute('aria-labelledby', 'ws-stt-key-label');
  row.appendChild(meta);

  const control = document.createElement('div');
  control.className = 'control';
  row.appendChild(control);

  const secret = new SecretComponent(app, control);
  const stored = app.secretStorage.getSecret(STT_KEY_NAME);
  secret.setValue(stored ?? '');
  secret.onChange((v) => {
    app.secretStorage.setSecret(STT_KEY_NAME, v);
  });

  const inputEl = control.querySelector('input');
  if (inputEl) {
    inputEl.setAttribute('aria-label', 'STT API key');
    inputEl.setAttribute('aria-labelledby', 'ws-stt-key-label');
    inputEl.setAttribute('aria-describedby', 'ws-stt-key-desc');
  }

  parent.appendChild(row);
}
