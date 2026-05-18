// Template engine — shared helper for the Insert template command (and any
// future template-substituting flow). Pure logic: vault listing + variable
// substitution. No modal, no editor, no Obsidian-specific UI.
//
// Supported variables (matches the core Obsidian Templates plugin behavior):
//   {{date}}            → current date in the configured default format
//   {{date:FORMAT}}     → current date in a custom format (e.g. {{date:DD/MM/YYYY}})
//   {{time}}            → current time in the configured default format
//   {{time:FORMAT}}     → current time in a custom format
//   {{title}}           → the active file's basename (no extension)
//
// FORMAT tokens supported: YYYY MM DD HH mm ss (other tokens pass through
// literally). Covers ~95% of real-world template formats; extend the token
// map without changing the substitution shape.

import type { App } from 'obsidian';
import { TFile, TFolder } from 'obsidian';

export interface TemplateContext {
  now: Date;
  title: string;
  dateFormat: string;
  timeFormat: string;
}

/** Lists every `.md` file under the given vault-relative folder, recursively.
 *  Returns an empty array if the folder doesn't exist. Files are sorted
 *  alphabetically by basename for stable modal ordering. */
export function listTemplateFiles(app: App, folder: string): TFile[] {
  const trimmed = folder.replace(/^\/+|\/+$/g, '');
  if (!trimmed) return [];
  const root = app.vault.getAbstractFileByPath(trimmed);
  if (!(root instanceof TFolder)) return [];
  const out: TFile[] = [];
  const walk = (node: TFolder): void => {
    for (const child of node.children) {
      if (child instanceof TFile && child.extension === 'md') out.push(child);
      else if (child instanceof TFolder) walk(child);
    }
  };
  walk(root);
  out.sort((a, b) => a.basename.localeCompare(b.basename));
  return out;
}

/** Formats a Date using a moment-style format string. */
export function formatDate(d: Date, fmt: string): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  const tokens: Record<string, string> = {
    YYYY: String(d.getFullYear()),
    MM: pad(d.getMonth() + 1),
    DD: pad(d.getDate()),
    HH: pad(d.getHours()),
    mm: pad(d.getMinutes()),
    ss: pad(d.getSeconds()),
  };
  return fmt.replace(/YYYY|MM|DD|HH|mm|ss/g, (token) => tokens[token] ?? token);
}

/** Applies template variable substitutions to a raw template string. */
export function applyTemplateVariables(content: string, ctx: TemplateContext): string {
  return content
    .replace(/\{\{date(?::([^}]+))?\}\}/g, (_match, custom: string | undefined) =>
      formatDate(ctx.now, custom ?? ctx.dateFormat),
    )
    .replace(/\{\{time(?::([^}]+))?\}\}/g, (_match, custom: string | undefined) =>
      formatDate(ctx.now, custom ?? ctx.timeFormat),
    )
    .replace(/\{\{title\}\}/g, ctx.title);
}
