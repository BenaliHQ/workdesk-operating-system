import { Platform } from 'obsidian';

type RequireFn = (id: string) => unknown;

export function requireDesktopModule<T>(id: string): T {
  if (!Platform.isDesktopApp) throw new Error(`${id} is only available in the desktop app.`);
  const windowRequire = (activeWindow as unknown as { require?: RequireFn }).require;
  if (windowRequire) return windowRequire(id) as T;
  // eslint-disable-next-line obsidianmd/prefer-active-doc -- process is a Node/Electron runtime global, not a DOM/window API.
  const builtin = (globalThis as unknown as {
    process?: { getBuiltinModule?: (moduleId: string) => unknown };
  }).process?.getBuiltinModule?.(id);
  if (builtin) return builtin as T;
  // eslint-disable-next-line @typescript-eslint/no-implied-eval -- Desktop Obsidian exposes CommonJS require; keep lookup lazy so mobile never evaluates Node imports.
  const loadRequire = Function('return require') as () => RequireFn;
  return loadRequire()(id) as T;
}
