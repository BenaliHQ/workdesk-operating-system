// General sub-tab — vault, auto-open daily, theme, motion.

import type WorkdeskOSPlugin from '../../main';
import { field, toggle, segmented, sectionLabel } from '../../components/forms';

export function mountGeneralSection(parent: HTMLElement, plugin: WorkdeskOSPlugin): void {
  parent.dataset.tab = 'general';
  sectionLabel(parent, 'GENERAL');

  field(parent, {
    label: 'Vault path',
    description: 'Defaults to the current Obsidian vault.',
    initial: plugin.settings.vault.path,
    onChange: (v) => {
      plugin.settings.vault.path = v;
      void plugin.saveSettings();
    },
  });

  toggle(parent, {
    label: 'Auto-open daily note',
    description: 'Opens today’s daily note on session start.',
    initial: plugin.settings.vault.autoOpenDaily,
    onChange: (v) => {
      plugin.settings.vault.autoOpenDaily = v;
      void plugin.saveSettings();
    },
  });

  segmented(parent, {
    label: 'Reduce motion',
    description: 'Honor the system preference or force on/off.',
    initial: plugin.settings.theme.reduceMotion,
    choices: [
      { value: 'auto', label: 'Auto' },
      { value: 'on', label: 'On' },
      { value: 'off', label: 'Off' },
    ],
    onChange: (v) => {
      plugin.settings.theme.reduceMotion = v as 'auto' | 'on' | 'off';
      void plugin.saveSettings();
    },
  });
}
