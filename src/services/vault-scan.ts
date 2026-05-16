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

export function loadZoneManifest(fs: FsAdapter, primaryPath: string, fallbackPath: string): ZoneManifest {
  const path = fs.exists(primaryPath) ? primaryPath : fallbackPath;
  if (!fs.exists(path)) throw new Error(`zone manifest not found at ${primaryPath} or ${fallbackPath}`);
  const parsed = parseYaml(fs.read(path)) as ZoneManifest;
  if (!parsed?.zones?.length) throw new Error(`zone manifest at ${path} produced no zones`);
  return parsed;
}

export function loadIconManifest(fs: FsAdapter, paths: string[]): Record<string, IconName> {
  for (const p of paths) {
    if (fs.exists(p)) {
      const parsed = parseYaml(fs.read(p)) as { icons?: Record<string, IconName> };
      return parsed?.icons ?? {};
    }
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
}

export function scanZones(fs: FsAdapter, opts: ScanOptions): Record<Exclude<ZoneId, 'files'>, Zone> {
  const manifest = loadZoneManifest(
    fs,
    `${opts.vaultRoot}/${opts.manifestPath ?? 'config/zones.yaml'}`,
    `${opts.pluginRoot}/fixtures/zones.yaml`,
  );
  const iconOverrides = loadIconManifest(fs, [
    `${opts.vaultRoot}/${opts.iconPath ?? 'config/object-icons.yaml'}`,
    `${opts.pluginRoot}/fixtures/object-icons.yaml`,
  ]);

  const out: Partial<Record<Exclude<ZoneId, 'files'>, Zone>> = {};
  for (const z of manifest.zones) {
    if (z.id === 'files') continue;
    const objects: ZoneObject[] = [];
    for (const obj of z.objects) {
      const target = obj.folder ?? obj.file ?? '';
      const fullPath = target ? `${opts.vaultRoot}/${target}` : '';
      const isFile = !!obj.file || target.endsWith('.md') || target.endsWith('.json');
      let count: number | '—' = 0;
      let children: TreeNode[] | undefined;
      if (!target) {
        count = 0;
      } else if (isFile) {
        count = '—';
      } else if (fs.exists(fullPath)) {
        count = countDescendants(fs, fullPath);
        children = walkTree(fs, fullPath);
      }
      objects.push({
        id: obj.id,
        folder: obj.folder,
        title: obj.title,
        sub: obj.sub,
        count,
        icon: iconOverrides[obj.id] ?? obj.icon,
        expanded: obj.expanded ?? false,
        empty: count === 0 && obj.empty ? 'caught-up' : undefined,
        children,
      });
    }
    out[z.id] = { name: z.name, sub: z.sub, icon: z.icon, objects };
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
