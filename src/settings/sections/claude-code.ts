// Claude Code sub-tab — binary path, tab status auto-detection, status flags.

import type WorkdeskosPlugin from '../../main';
import { field, toggle, sectionLabel } from '../../components/forms';

export function mountClaudeCodeSection(parent: HTMLElement, plugin: WorkdeskosPlugin): void {
  parent.dataset.tab = 'claude-code';
  sectionLabel(parent, 'CLAUDE CODE');

  field(parent, {
    label: 'Binary path',
    initial: plugin.settings.claude.binaryPath,
    mono: true,
    onChange: (v) => {
      plugin.settings.claude.binaryPath = v;
      plugin.saveSettings();
    },
  });

  toggle(parent, {
    label: 'Auto-detect tab status',
    description: 'Parse ● / ⎿ markers from Claude Code output to color the tabs.',
    initial: plugin.settings.claude.autoDetectTabStatus,
    onChange: (v) => {
      plugin.settings.claude.autoDetectTabStatus = v;
      plugin.saveSettings();
    },
  });

  toggle(parent, {
    label: 'Show context %',
    initial: plugin.settings.claude.showContextPct,
    onChange: (v) => {
      plugin.settings.claude.showContextPct = v;
      plugin.saveSettings();
    },
  });

  toggle(parent, {
    label: 'Show cost estimate',
    initial: plugin.settings.claude.showCostEstimate,
    onChange: (v) => {
      plugin.settings.claude.showCostEstimate = v;
      plugin.saveSettings();
    },
  });

  field(parent, {
    label: 'Skills directory',
    initial: plugin.settings.claude.skillsDir,
    mono: true,
    onChange: (v) => {
      plugin.settings.claude.skillsDir = v;
      plugin.saveSettings();
    },
  });
}
