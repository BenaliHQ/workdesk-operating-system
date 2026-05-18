// Zones section — density, file counts, per-zone folders, manifest paths.
//
// Every setting that affects how zones are scanned (folder remaps + manifest
// paths) triggers a debounced refreshZones() call so the change takes effect
// live, without a plugin reload.

import { Setting } from 'obsidian';
import type WorkdeskOSPlugin from '../../main';
import type { ZoneFolderMap } from '../../settings';

const ZONE_FOLDER_ROWS: Array<{ key: keyof ZoneFolderMap; label: string }> = [
  { key: 'atlas', label: 'Atlas folder' },
  { key: 'gtd', label: 'GTD folder' },
  { key: 'intel', label: 'Intel folder' },
  { key: 'personal', label: 'Personal folder' },
  { key: 'system', label: 'System folder' },
  { key: 'config', label: 'Config folder' },
];

const REFRESH_DEBOUNCE_MS = 350;
let refreshTimer: number | null = null;

function scheduleZoneRefresh(plugin: WorkdeskOSPlugin): void {
  if (refreshTimer) activeWindow.clearTimeout(refreshTimer);
  refreshTimer = activeWindow.setTimeout(() => {
    refreshTimer = null;
    void plugin.refreshZones();
  }, REFRESH_DEBOUNCE_MS);
}

export function mountZonesSection(containerEl: HTMLElement, plugin: WorkdeskOSPlugin): void {
  new Setting(containerEl).setName('Zones').setHeading();

  new Setting(containerEl)
    .setName('Density')
    .setDesc('Compact is tighter, spacious is airy.')
    .addDropdown((dropdown) => {
      dropdown
        .addOption('compact', 'Compact')
        .addOption('cozy', 'Cozy')
        .addOption('spacious', 'Spacious')
        .setValue(plugin.settings.zones.density)
        .onChange((value) => {
          plugin.settings.zones.density = value as 'compact' | 'cozy' | 'spacious';
          void plugin.saveSettings();
        });
    });

  new Setting(containerEl)
    .setName('Show files view')
    .setDesc('Adds a files slot in the ribbon.')
    .addToggle((toggle) => {
      toggle
        .setValue(plugin.settings.zones.showFilesView)
        .onChange((value) => {
          plugin.settings.zones.showFilesView = value;
          void plugin.saveSettings();
        });
    });

  new Setting(containerEl)
    .setName('Show file counts')
    .setDesc('Numbers next to each zone card.')
    .addToggle((toggle) => {
      toggle
        .setValue(plugin.settings.zones.showFileCounts)
        .onChange((value) => {
          plugin.settings.zones.showFileCounts = value;
          void plugin.saveSettings();
        });
    });

  new Setting(containerEl)
    .setName('Zone folders')
    // eslint-disable-next-line obsidianmd/ui/sentence-case -- example uses lowercase folder paths.
    .setDesc('Vault-relative root folder for each zone. Defaults match the zone ID; change a folder to remap a whole zone (e.g. atlas → archive/atlas) without editing zones.yaml. Changes apply live.');

  for (const { key, label } of ZONE_FOLDER_ROWS) {
    new Setting(containerEl)
      .setName(label)
      .addText((text) => {
        text
          .setPlaceholder(key)
          .setValue(plugin.settings.zones.folders[key])
          .onChange((value) => {
            plugin.settings.zones.folders[key] = value.trim() || key;
            void plugin.saveSettings();
            scheduleZoneRefresh(plugin);
          });
      });
  }

  new Setting(containerEl)
    .setName('Zones manifest path')
    .setDesc('Vault-relative path to the zones manifest YAML.')
    .addText((text) => {
      text
        .setValue(plugin.settings.zones.manifestPath)
        .onChange((value) => {
          plugin.settings.zones.manifestPath = value;
          void plugin.saveSettings();
          scheduleZoneRefresh(plugin);
        });
    });
}
