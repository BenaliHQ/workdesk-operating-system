// Bridge from `CaptureVault` to Obsidian's vault APIs.
//
// `create()` writes the synthesis note. The parent folder is created on
// demand because new operators may not have `personal/captures/` yet.
// `appendToFile()` uses the DataAdapter so existing system/log.md content
// is preserved — `vault.modify` would require reading the whole file first.

import type { App } from 'obsidian';
import type { CaptureVault } from './capture-flow';

interface DataAdapterLike {
  exists(path: string): Promise<boolean>;
  append(path: string, data: string): Promise<void>;
  read?: (path: string) => Promise<string>;
  write?: (path: string, data: string) => Promise<void>;
}

interface VaultLike {
  create(path: string, data: string): Promise<unknown>;
  createFolder(path: string): Promise<unknown>;
  adapter: DataAdapterLike;
}

export function obsidianCaptureVault(app: App): CaptureVault {
  const vault = (app as unknown as { vault: VaultLike }).vault;
  return {
    async createNote(path, contents) {
      const slashIdx = path.lastIndexOf('/');
      if (slashIdx > 0) {
        const folder = path.slice(0, slashIdx);
        const folderExists = await vault.adapter.exists(folder).catch(() => false);
        if (!folderExists) {
          await vault.createFolder(folder).catch(() => {
            // folder may have been created concurrently; ignore
          });
        }
      }
      await vault.create(path, contents);
    },
    async appendToFile(path, line) {
      const existed = await vault.adapter.exists(path).catch(() => false);
      if (!existed) {
        await vault.create(path, line).catch(async () => {
          // race: another process created it; fall back to append.
          await vault.adapter.append(path, line);
        });
        return;
      }
      await vault.adapter.append(path, line);
    },
  };
}
