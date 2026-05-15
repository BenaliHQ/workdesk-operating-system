// Appearance sub-tab — visual scaffolding controls.
//
// Currently a single toggle: hide non-WorkDesk ribbon icons. The toggle
// flips `settings.appearance.hideNonWorkdeskRibbonIcons` and re-applies
// the body class via plugin.applyAppearance() on change.

import type WorkdeskosPlugin from '../../main';
import { toggle, sectionLabel } from '../../components/forms';

export function mountAppearanceSection(parent: HTMLElement, plugin: WorkdeskosPlugin): void {
  parent.dataset.tab = 'appearance';
  sectionLabel(parent, 'APPEARANCE');

  toggle(parent, {
    label: 'Hide non-WorkDesk ribbon icons (opt-in)',
    description:
      'Hides every ribbon icon that is not contributed by WorkdeskOS Plugin. Use when you want a tighter ribbon focused on WorkDesk surfaces. Other plugins and Obsidian itself continue to function normally.',
    initial: plugin.settings.appearance.hideNonWorkdeskRibbonIcons,
    onChange: (v) => {
      plugin.settings.appearance.hideNonWorkdeskRibbonIcons = v;
      void plugin.saveSettings();
      plugin.applyAppearance();
    },
  });
}
