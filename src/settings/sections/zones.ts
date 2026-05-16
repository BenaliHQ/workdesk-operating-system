// Zones sub-tab — density, file counts, manifest paths.

import type WorkdeskOSPlugin from '../../main';
import { field, toggle, segmented, sectionLabel } from '../../components/forms';

export function mountZonesSection(parent: HTMLElement, plugin: WorkdeskOSPlugin): void {
  parent.dataset.tab = 'zones';
  sectionLabel(parent, 'ZONES');

  segmented(parent, {
    label: 'Density',
    description: 'Compact = tighter spacing, Spacious = airy.',
    initial: plugin.settings.zones.density,
    choices: [
      { value: 'compact', label: 'Compact' },
      { value: 'cozy', label: 'Cozy' },
      { value: 'spacious', label: 'Spacious' },
    ],
    onChange: (v) => {
      plugin.settings.zones.density = v as 'compact' | 'cozy' | 'spacious';
      void plugin.saveSettings();
    },
  });

  toggle(parent, {
    label: 'Show Files view',
    description: 'Adds a Files slot in the ribbon.',
    initial: plugin.settings.zones.showFilesView,
    onChange: (v) => {
      plugin.settings.zones.showFilesView = v;
      void plugin.saveSettings();
    },
  });

  toggle(parent, {
    label: 'Show file counts',
    description: 'Numbers next to each zone card.',
    initial: plugin.settings.zones.showFileCounts,
    onChange: (v) => {
      plugin.settings.zones.showFileCounts = v;
      void plugin.saveSettings();
    },
  });

  field(parent, {
    label: 'Zones manifest path',
    initial: plugin.settings.zones.manifestPath,
    mono: true,
    onChange: (v) => {
      plugin.settings.zones.manifestPath = v;
      void plugin.saveSettings();
    },
  });
}
