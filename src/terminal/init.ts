// init — plugin-side wiring for terminal sessions. The plugin calls
// createTerminalSession from views and re-applies the theme on Obsidian's
// css-change event so light/dark toggles propagate into xterm.js at runtime.

import type { App } from 'obsidian';
import { TerminalSession, type TerminalSessionOptions } from './session';
import { getXtermTheme } from './theme-bridge';

export function createTerminalSession(
  containerEl: HTMLElement,
  vaultPath: string,
  _app: App,
  overrides: Partial<TerminalSessionOptions> = {},
): TerminalSession {
  return new TerminalSession(containerEl, { cwd: vaultPath, ...overrides });
}

export function applySessionTheme(session: TerminalSession): void {
  session.terminal.options.theme = getXtermTheme();
}

export { TerminalSession };
