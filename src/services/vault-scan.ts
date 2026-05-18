// vault-scan — walks the vault into the Zone shape from src/types.d.ts.
//
// Reads two manifests:
//   fixtures/zones.yaml         (plugin defaults; overridable from <vault>/config/zones.yaml)
//   fixtures/object-icons.yaml  (icon overrides per object id)
//
// Production runs on Obsidian's Vault adapter; unit tests pass a Node fs
// adapter so the scanner is testable without a live workspace.

import * as fsNs from 'node:fs';
import { parseYaml } from 'obsidian';
import type { Zone, ZoneId, ZoneObject, TreeNode, IconName } from '../types';

// Fixture YAML is inlined into main.js at build time via esbuild's text
// loader (see esbuild.config.mjs `loader: { '.yaml': 'text' }`). The
// runtime always has access to these strings, even when BRAT installs
// only the flat release assets (main.js / styles.css / manifest.json /
// versions.json) and the plugin folder has no fixtures/ subdirectory.
import defaultZonesYaml from '../../fixtures/zones.yaml';
import defaultObjectIconsYaml from '../../fixtures/object-icons.yaml';

// ───────── Adapter shapes ─────────

export interface FsAdapter {
  exists(path: string): boolean;
  read(path: string): string;
  list(path: string): Array<{ name: string; isDir: boolean }>;
}

export interface ZoneManifest {
  zones: Array<{
    id: ZoneId;
    name: string;
    sub: string;
    icon: IconName;
    root: string;
    objects: Array<{
      id: string;
      title: string;
      sub: string;
      icon: IconName;
      folder: string;
      file?: string;
      expanded?: boolean;
      empty?: 'caught-up';
    }>;
  }>;
}

// ───────── YAML loading + fallback ─────────

export function loadZoneManifest(
  fs: FsAdapter,
  primaryPath: string,
  fallbackPath: string,
  inlineFallback?: string,
): ZoneManifest {
  let yaml: string | undefined;
  if (fs.exists(primaryPath)) yaml = fs.read(primaryPath);
  else if (fs.exists(fallbackPath)) yaml = fs.read(fallbackPath);
  else if (inlineFallback) yaml = inlineFallback;
  if (!yaml) throw new Error(`zone manifest not found at ${primaryPath} or ${fallbackPath} (no inlined fallback)`);
  const parsed = parseYaml(yaml) as ZoneManifest;
  if (!parsed?.zones?.length) throw new Error('zone manifest produced no zones');
  return parsed;
}

export function loadIconManifest(
  fs: FsAdapter,
  paths: string[],
  inlineFallback?: string,
): Record<string, IconName> {
  for (const p of paths) {
    if (fs.exists(p)) {
      const parsed = parseYaml(fs.read(p)) as { icons?: Record<string, IconName> };
      return parsed?.icons ?? {};
    }
  }
  if (inlineFallback) {
    const parsed = parseYaml(inlineFallback) as { icons?: Record<string, IconName> };
    return parsed?.icons ?? {};
  }
  return {};
}

// ───────── Tree walk ─────────

export function walkTree(fs: FsAdapter, folder: string, depth = 1, maxDepth = 3): TreeNode[] {
  if (!fs.exists(folder)) return [];
  const entries = fs.list(folder).filter((e) => !e.name.startsWith('.'));
  entries.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const nodes: TreeNode[] = [];
  for (const entry of entries) {
    const childPath = `${folder}/${entry.name}`;
    if (entry.isDir) {
      const children = depth < maxDepth ? walkTree(fs, childPath, depth + 1, maxDepth) : [];
      nodes.push({
        type: 'folder',
        name: entry.name,
        depth,
        count: countDescendants(fs, childPath),
        expanded: false,
        children,
      });
    } else {
      nodes.push({ type: 'file', name: entry.name, depth });
    }
  }
  return nodes;
}

export function countDescendants(fs: FsAdapter, folder: string): number {
  if (!fs.exists(folder)) return 0;
  let n = 0;
  for (const entry of fs.list(folder)) {
    if (entry.name.startsWith('.')) continue;
    if (entry.isDir) n += countDescendants(fs, `${folder}/${entry.name}`);
    else n++;
  }
  return n;
}

// ───────── Scanner ─────────

export interface ScanOptions {
  vaultRoot: string;
  manifestPath?: string;    // <vault>/config/zones.yaml
  iconPath?: string;        // <vault>/config/object-icons.yaml
  pluginRoot: string;       // plugin folder (contains fixtures/)
  /** Optional per-zone root folder overrides. When provided, any object whose
   *  manifest folder/file path starts with `<zoneId>/` (or equals `<zoneId>`)
   *  is rewritten to start with the override. Lets the operator move whole
   *  zones (e.g. atlas → archive/atlas) without editing zones.yaml. */
  zoneFolders?: Partial<Record<Exclude<ZoneId, 'files'>, string>>;
}

/** Rewrites a manifest path so its `<zoneId>` prefix is replaced with the
 *  operator-configured root. Returns the original path when no override
 *  applies, when the override is empty, or when the path doesn't start with
 *  the zone id. */
function applyZoneFolderOverride(
  path: string,
  zoneId: Exclude<ZoneId, 'files'>,
  zoneFolders?: Partial<Record<Exclude<ZoneId, 'files'>, string>>,
): string {
  if (!path) return path;
  const override = zoneFolders?.[zoneId]?.trim().replace(/\/+$/, '');
  if (!override || override === zoneId) return path;
  if (path === zoneId) return override;
  if (path.startsWith(`${zoneId}/`)) return `${override}${path.slice(zoneId.length)}`;
  return path;
}

export function scanZones(fs: FsAdapter, opts: ScanOptions): Record<Exclude<ZoneId, 'files'>, Zone> {
  const manifest = loadZoneManifest(
    fs,
    `${opts.vaultRoot}/${opts.manifestPath ?? 'config/zones.yaml'}`,
    `${opts.pluginRoot}/fixtures/zones.yaml`,
    defaultZonesYaml,
  );
  const iconOverrides = loadIconManifest(
    fs,
    [
      `${opts.vaultRoot}/${opts.iconPath ?? 'config/object-icons.yaml'}`,
      `${opts.pluginRoot}/fixtures/object-icons.yaml`,
    ],
    defaultObjectIconsYaml,
  );

  // Filesystem-first model: for every zone, walk its actual root folder on
  // disk and emit a zone object for each direct child (folder or markdown/
  // json file). The manifest is treated as an OVERLAY — it lets the
  // operator override title/sub/icon/empty for specific entries that match
  // by path, but it never invents folders that aren't there. This avoids
  // the old failure mode where the scanner reported manifest-defined
  // objects (e.g. `config/templates`) even when the folder didn't exist,
  // and inversely hid real folders (e.g. `config/objects`) that the
  // manifest didn't enumerate.

  const out: Partial<Record<Exclude<ZoneId, 'files'>, Zone>> = {};
  for (const z of manifest.zones) {
    if (z.id === 'files') continue;
    const zoneId = z.id;
    const zoneRoot = applyZoneFolderOverride(zoneId, zoneId, opts.zoneFolders);
    const fullZoneRoot = `${opts.vaultRoot}/${zoneRoot}`;

    // Build a lookup keyed by remapped vault-relative path so the overlay
    // matches whatever path the operator's zone-folder remap resolves to.
    type ManifestObj = (typeof z.objects)[number];
    const overlay = new Map<string, ManifestObj>();
    for (const obj of z.objects) {
      const raw = obj.folder ?? obj.file ?? '';
      const remapped = applyZoneFolderOverride(raw, zoneId, opts.zoneFolders);
      if (remapped) overlay.set(remapped, obj);
    }

    const objects: ZoneObject[] = [];
    if (fs.exists(fullZoneRoot)) {
      const entries = fs.list(fullZoneRoot).filter((e) => !e.name.startsWith('.'));
      entries.sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      for (const entry of entries) {
        const relPath = `${zoneRoot}/${entry.name}`;
        const fullPath = `${opts.vaultRoot}/${relPath}`;
        const m = overlay.get(relPath);

        if (entry.isDir) {
          const count = countDescendants(fs, fullPath);
          const children = walkTree(fs, fullPath);
          const id = m?.id ?? entry.name;
          objects.push({
            id,
            folder: relPath,
            title: m?.title ?? entry.name,
            sub: m?.sub ?? '',
            count,
            icon: iconOverrides[id] ?? m?.icon ?? 'folder',
            // Always start collapsed — the manifest's `expanded: true` is
            // ignored so the operator has to opt in to seeing children.
            expanded: false,
            empty: count === 0 && m?.empty ? 'caught-up' : undefined,
            children,
          });
        } else if (entry.name.endsWith('.md') || entry.name.endsWith('.json')) {
          const id = m?.id ?? entry.name;
          // For file-cards, `folder` carries the file's vault-relative path
          // (semantic stretch — the field name is folder-biased — but it lets
          // the host resolve the underlying TFile via getAbstractFileByPath
          // for right-click → native file menu without adding a new field.
          // `count: '—'` remains the discriminator that this is a file).
          objects.push({
            id,
            folder: relPath,
            title: m?.title ?? entry.name,
            sub: m?.sub ?? '',
            count: '—',
            icon: iconOverrides[id] ?? m?.icon ?? 'file',
            expanded: false,
          });
        }
      }
    }
    out[zoneId] = { name: z.name, sub: z.sub, icon: z.icon, objects };
  }
  return out as Record<Exclude<ZoneId, 'files'>, Zone>;
}

// ───────── Files-mode flat view ─────────

export function scanFilesView(fs: FsAdapter, opts: { vaultRoot: string }): TreeNode[] {
  return walkTree(fs, opts.vaultRoot, 1, 2);
}

// ───────── Node fs adapter (tests + dev) ─────────

export function nodeFsAdapter(): FsAdapter {
  return {
    exists: (p) => fsNs.existsSync(p),
    read: (p) => fsNs.readFileSync(p, 'utf8'),
    list: (p) =>
      fsNs.readdirSync(p, { withFileTypes: true }).map((d) => ({ name: d.name, isDir: d.isDirectory() })),
  };
}
