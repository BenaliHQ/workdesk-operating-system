// Terminal sub-tab — shell, font, cursor, wrap, scrollback.

import type WorkdeskOSPlugin from '../../main';
import { field, toggle, select, sectionLabel } from '../../components/forms';

export function mountTerminalSection(parent: HTMLElement, plugin: WorkdeskOSPlugin): void {
  parent.dataset.tab = 'terminal';
  sectionLabel(parent, 'TERMINAL');

  field(parent, {
    label: 'Shell command',
    initial: plugin.settings.terminal.shell,
    mono: true,
    onChange: (v) => {
      plugin.settings.terminal.shell = v;
      void plugin.saveSettings();
    },
  });

  select(parent, {
    label: 'Font',
    initial: plugin.settings.terminal.font,
    choices: [
      { value: 'Geist Mono', label: 'Geist Mono' },
      { value: 'JetBrains Mono', label: 'JetBrains Mono' },
      { value: 'IBM Plex Mono', label: 'IBM Plex Mono' },
      { value: 'SF Mono', label: 'SF Mono' },
    ],
    onChange: (v) => {
      plugin.settings.terminal.font = v as WorkdeskOSPlugin['settings']['terminal']['font'];
      void plugin.saveSettings();
    },
  });

  select(parent, {
    label: 'Cursor',
    initial: plugin.settings.terminal.cursorStyle,
    choices: [
      { value: 'block', label: 'Block' },
      { value: 'bar', label: 'Bar' },
      { value: 'underline', label: 'Underline' },
    ],
    onChange: (v) => {
      plugin.settings.terminal.cursorStyle = v as WorkdeskOSPlugin['settings']['terminal']['cursorStyle'];
      void plugin.saveSettings();
    },
  });

  toggle(parent, {
    label: 'Wrap lines',
    initial: plugin.settings.terminal.wrap,
    onChange: (v) => {
      plugin.settings.terminal.wrap = v;
      void plugin.saveSettings();
    },
  });
}
