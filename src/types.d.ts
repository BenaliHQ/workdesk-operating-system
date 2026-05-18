// WorkDesk — Ambient TypeScript types for the zone data model.
// Drop this file at `src/types.d.ts` (or import as needed) so the plugin's
// implementation can reference the same shapes the prototype uses.

/** The five canonical zones plus the special Files view and Config. */
export type ZoneId =
  | 'atlas'
  | 'gtd'
  | 'intel'
  | 'personal'
  | 'system'
  | 'config'
  | 'files'; // Special: stock Obsidian file-tree view; not a real zone folder.

/** Order in which zones appear in the ribbon. `files` sits below the divider. */
export const ZONE_ORDER: readonly ZoneId[] = [
  'atlas', 'gtd', 'intel', 'personal', 'system', 'config',
] as const;

/** Glyph names available in `shared/icons.js`. Extend as the icon set grows. */
export type IconName =
  | 'globe' | 'check' | 'signal' | 'person' | 'layers' | 'gear' | 'files'
  | 'folder' | 'file' | 'chevron' | 'chevDown'
  | 'building' | 'video' | 'badge' | 'pencil' | 'book' | 'sun' | 'moon'
  | 'inbox' | 'list' | 'clock' | 'archive' | 'code' | 'zap' | 'shield' | 'feather'
  | 'search' | 'calendar' | 'focus' | 'mic'
  | 'panelL' | 'panelR' | 'link' | 'outline' | 'collapse'
  | 'plus' | 'sort' | 'more' | 'close' | 'doubleR' | 'doubleL'
  | 'newNote' | 'folderPlus' | 'sliders' | 'help' | 'warn' | 'upload' | 'command' | 'enter' | 'hash'
  | 'trash' | 'copy' | 'expand' | 'contract' | 'send';

/** Status of a terminal tab. Drives the leading dot color + pulse. */
export type TerminalTabStatus = 'idle' | 'working' | 'done' | 'waiting' | 'error';

/** A folder or file inside a zone object's child tree. */
export interface TreeNode {
  type: 'folder' | 'file';
  name: string;
  /** Total descendant count for folders; omit for files. */
  count?: number | '—';
  /** 1-indexed depth from the object root (1 = direct child of the object). */
  depth: number;
  /** Whether the folder starts expanded. Only meaningful for folders. */
  expanded?: boolean;
  /** Whether this is the active file in the editor. */
  active?: boolean;
  /** Recursive children. */
  children?: TreeNode[];
}

/** A top-level object inside a zone (e.g. atlas → projects, people, meetings). */
export interface ZoneObject {
  /** Stable id used in URL params + scripts. lowercase-hyphenated. */
  id: string;
  /** Vault-relative folder path (e.g. `atlas/people`). Used as the path
   *  prefix when rendering children, so file activation can resolve full
   *  vault-relative paths. Falls back to `id` if unset. */
  folder?: string;
  /** Display title — title-cased via CSS, so keep lowercase here. */
  title: string;
  /** Single-line description shown under the title in the zone card. */
  sub: string;
  /** Count to render top-right. Use `'—'` for non-numeric (e.g. log.md). */
  count: number | '—';
  /** Glyph rendered in the ribbon and zone cards. */
  icon: IconName;
  /** Whether the card starts expanded. */
  expanded?: boolean;
  /** Optional empty-state marker. 'caught-up' shows the green check. */
  empty?: 'caught-up';
  /** Children rendered inside the expanded card. */
  children?: TreeNode[];
}

/** A whole zone — top-level entry rendered in the ribbon + zone pane. */
export interface Zone {
  /** Display name; lowercase for visual style. */
  name: string;
  /** Sub-copy shown under the zone hero. */
  sub: string;
  /** Glyph used in the ribbon dot and zone hero. */
  icon: IconName;
  /** Top-level objects in this zone. */
  objects: ZoneObject[];
}

/** Top-level zones model — mirrors `window.WS_ZONES` in `shared/zones.js`. */
export type Zones = Record<Exclude<ZoneId, 'files'>, Zone>;

// ─── Settings schema ────────────────────────────────────────────────────
export interface WorkDeskSettings {
  vault: {
    /** Absolute path; resolved against ~ at load. */
    path: string;
    autoOpenDaily: boolean;
    /** Path inside the vault. */
    dailyTemplatePath: string;
  };
  zones: {
    showFilesView: boolean;
    density: 'compact' | 'cozy' | 'spacious';
    expandActiveOnLoad: boolean;
    showFileCounts: boolean;
    manifestPath: string;     // default: 'config/zones.yaml'
    iconManifestPath: string; // default: 'config/object-icons.yaml'
  };
  capture: {
    provider: 'groq' | 'openai' | 'deepgram';
    /** Encrypted via Obsidian's plugin credential helper. Never in data.json plaintext. */
    apiKey: string;
    model: string;
    /** Stream partials into the modal as they come back from STT. */
    streamPartials: boolean;
    defaultDest: 'personal/captures' | 'system/inbox' | 'gtd/inbox';
    /** Mustache template. Vars: timestamp, slug, date. */
    filenamePattern: string;
    autoLogToSystem: boolean;
    inputDevice?: string;
  };
  terminal: {
    rightPaneIsTerminal: boolean;
    shell: string;          // default: '/bin/zsh -il'
    cwd: string;            // default: '{{vault}}'
    font: 'Geist Mono' | 'JetBrains Mono' | 'IBM Plex Mono' | 'SF Mono';
    fontSize: 12 | 13 | 14 | 15;
    wrap: boolean;
    cursorStyle: 'block' | 'bar' | 'underline';
    persistSessions: boolean;
    scrollbackLines: number; // default 10000
  };
  claude: {
    binaryPath: string;     // default: '/usr/local/bin/claude'
    autoDetectTabStatus: boolean;
    highlightWikilinksInOutput: boolean;
    showContextPct: boolean;
    showCostEstimate: boolean;
    skillsDir: string;      // default: 'config/skills'
    showSkillsCount: boolean;
  };
  onboarding: {
    completed: boolean;
    lastSeen: number;       // unix ms
  };
  panes: {
    paneWidth: number;      // px, default 340, clamp [240, 560]
    rpaneWidth: number;     // px, default 340, clamp [280, 600]
  };
  theme: {
    matchObsidian: boolean;
    reduceMotion: 'auto' | 'on' | 'off';
  };
}

// ─── Public functions exposed on `window` ───────────────────────────────
declare global {
  interface Window {
    WS_ZONES: Zones;
    WS_ZONE_ORDER: readonly ZoneId[];
    WS_ICONS: Record<IconName, string>;
    wsSvg(name: IconName, size?: number, extraAttrs?: string): string;
    showToast(
      message: string,
      severity?: 'success' | 'error' | 'info' | 'loading',
      opts?: { title?: string; sub?: string; duration?: number }
    ): HTMLElement | void;
    stubBodyFor(name: string): string;
  }
}
