// Terminal sub-tab — shell, font, cursor, wrap, scrollback.

import type WorkdeskosPlugin from '../../main';
import { field, toggle, select, sectionLabel } from '../../components/forms';

export function mountTerminalSection(parent: HTMLElement, plugin: WorkdeskosPlugin): void {
  parent.dataset.tab = 'terminal';
  sectionLabel(parent, 'TERMINAL');

  field(parent, {
    label: 'Shell command',
    initial: plugin.settings.terminal.shell,
    mono: true,
    onChange: (v) => {
      plugin.settings.terminal.shell = v;
      plugin.saveSettings();
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
      plugin.settings.terminal.font = v as WorkdeskosPlugin['settings']['terminal']['font'];
      plugin.saveSettings();
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
      plugin.settings.terminal.cursorStyle = v as WorkdeskosPlugin['settings']['terminal']['cursorStyle'];
      plugin.saveSettings();
    },
  });

  toggle(parent, {
    label: 'Wrap lines',
    initial: plugin.settings.terminal.wrap,
    onChange: (v) => {
      plugin.settings.terminal.wrap = v;
      plugin.saveSettings();
    },
  });
}
