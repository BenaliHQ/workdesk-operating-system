// Four-pane workspace layout.
//
// Migrates Obsidian workspace on first run (settings.onboarding.completed === false)
// so the left pane hosts workdesk-zone and the right pane hosts workdesk-terminal.
// Mounts the splitters that resize pane / right-pane.

import type { Plugin } from 'obsidian';
import {
  VIEW_TYPE_WORKDESK_TERMINAL,
  VIEW_TYPE_WORKDESK_ZONE,
} from '../constants';
import { WorkdeskSettings } from '../settings';
import { applyInitialWidths, makeSplitter } from './splitters';

export interface ShellContext {
  appEl: HTMLElement;
  settings: WorkdeskSettings;
  saveSettings: () => Promise<void>;
}

export async function mountShell(plugin: Plugin, ctx: ShellContext): Promise<void> {
  ctx.appEl.classList.add('app');
  applyInitialWidths(ctx.appEl, ctx.settings);

  const leftSplitter = makeSplitter({
    appEl: ctx.appEl,
    side: 'left',
    initialWidth: ctx.settings.panes.paneWidth,
    onCommit: async (w) => {
      ctx.settings.panes.paneWidth = w;
      await ctx.saveSettings();
    },
  });
  const rightSplitter = makeSplitter({
    appEl: ctx.appEl,
    side: 'right',
    initialWidth: ctx.settings.panes.rpaneWidth,
    onCommit: async (w) => {
      ctx.settings.panes.rpaneWidth = w;
      await ctx.saveSettings();
    },
  });
  ctx.appEl.appendChild(leftSplitter);
  ctx.appEl.appendChild(rightSplitter);

  if (!ctx.settings.onboarding.completed) {
    await migrateWorkspaceOnce(plugin);
  }
}

async function migrateWorkspaceOnce(plugin: Plugin): Promise<void> {
  const workspace = plugin.app.workspace;
  const left = workspace.getLeavesOfType(VIEW_TYPE_WORKDESK_ZONE);
  if (left.length === 0) {
    const leaf = workspace.getLeftLeaf(false);
    if (leaf) await leaf.setViewState({ type: VIEW_TYPE_WORKDESK_ZONE, active: true });
  }
  const right = workspace.getLeavesOfType(VIEW_TYPE_WORKDESK_TERMINAL);
  if (right.length === 0) {
    const leaf = workspace.getRightLeaf(false);
    if (leaf) await leaf.setViewState({ type: VIEW_TYPE_WORKDESK_TERMINAL, active: true });
  }
}
