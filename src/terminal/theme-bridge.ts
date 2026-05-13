// theme-bridge — maps WorkDesk's --ws-term-* CSS tokens to an xterm.js ITheme.
//
// All 16 ANSI slots plus background/foreground/cursor/selection are sourced
// from CSS custom properties so light/dark mode tracks Obsidian's theme.
// Defaults fall back to the design's hex values from styles/tokens.css so a
// missing custom property never collapses the palette.

import type { ITheme } from '@xterm/xterm';

export const TERM_THEME_FALLBACKS = {
  background: '#fbf8f0',
  foreground: '#2a2a2a',
  cursor: '#5a6b7a',
  cursorAccent: '#fbf8f0',
  selectionBackground: 'rgba(0, 0, 0, 0.12)',
  selectionForeground: '#1a1a1a',
  black: '#9a958d',
  red: '#8a4a55',
  green: '#4f7a52',
  yellow: '#8a6a2e',
  blue: '#4a6a8a',
  magenta: '#7a4a6a',
  cyan: '#4a8a8a',
  white: '#2a2a2a',
  brightBlack: '#a8a39c',
  brightRed: '#a05a65',
  brightGreen: '#5f8a62',
  brightYellow: '#a07a3a',
  brightBlue: '#5a7aa0',
  brightMagenta: '#8a5a7a',
  brightCyan: '#5aa0a0',
  brightWhite: '#3a3a3a',
} as const;

const ANSI_KEYS = [
  'black',
  'red',
  'green',
  'yellow',
  'blue',
  'magenta',
  'cyan',
  'white',
  'brightBlack',
  'brightRed',
  'brightGreen',
  'brightYellow',
  'brightBlue',
  'brightMagenta',
  'brightCyan',
  'brightWhite',
] as const;

type AnsiKey = (typeof ANSI_KEYS)[number];

export function getAnsiKeys(): readonly AnsiKey[] {
  return ANSI_KEYS;
}

export function getXtermTheme(rootEl: HTMLElement = document.body): ITheme {
  const s = getComputedStyle(rootEl);
  const get = (token: string, fallback: string): string => {
    const v = s.getPropertyValue(token).trim();
    return v.length > 0 ? v : fallback;
  };

  const background = get('--background-secondary', TERM_THEME_FALLBACKS.background);
  const foreground = get('--ws-term-fg', TERM_THEME_FALLBACKS.foreground);
  const cursor = get('--ws-term-caret', TERM_THEME_FALLBACKS.cursor);
  const selectionBackground = get(
    '--text-selection',
    TERM_THEME_FALLBACKS.selectionBackground,
  );

  return {
    background,
    foreground,
    cursor,
    cursorAccent: background,
    selectionBackground,
    selectionForeground: get('--text-normal', TERM_THEME_FALLBACKS.selectionForeground),
    black: get('--text-faint', TERM_THEME_FALLBACKS.black),
    red: get('--ws-term-error', TERM_THEME_FALLBACKS.red),
    green: get('--ws-term-success', TERM_THEME_FALLBACKS.green),
    yellow: get('--ws-term-warn', TERM_THEME_FALLBACKS.yellow),
    blue: get('--ws-term-accent', TERM_THEME_FALLBACKS.blue),
    magenta: get('--ws-zone-personal-fg', TERM_THEME_FALLBACKS.magenta),
    cyan: get('--ws-zone-atlas-fg', TERM_THEME_FALLBACKS.cyan),
    white: get('--ws-term-fg', TERM_THEME_FALLBACKS.white),
    brightBlack: get('--text-muted', TERM_THEME_FALLBACKS.brightBlack),
    brightRed: get('--ws-term-error', TERM_THEME_FALLBACKS.brightRed),
    brightGreen: get('--ws-term-success', TERM_THEME_FALLBACKS.brightGreen),
    brightYellow: get('--ws-term-warn', TERM_THEME_FALLBACKS.brightYellow),
    brightBlue: get('--ws-term-accent', TERM_THEME_FALLBACKS.brightBlue),
    brightMagenta: get('--ws-zone-personal-fg', TERM_THEME_FALLBACKS.brightMagenta),
    brightCyan: get('--ws-zone-atlas-fg', TERM_THEME_FALLBACKS.brightCyan),
    brightWhite: get('--ws-term-fg', TERM_THEME_FALLBACKS.brightWhite),
  };
}
