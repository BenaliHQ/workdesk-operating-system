// Settings schema for Workdesk Operating System.
//
// The shape follows design-handoff/handoff/manifest.md § Settings schema.
// API keys are intentionally OMITTED from this interface: per design's
// manifest.md:138, keys must be stored via Obsidian's encrypted credential
// helper, not in data.json. The Quick capture settings tab (phase 5A) wires
// the UI via `new SecretComponent(el).setValue('stt:groq')`; reads happen
// through `app.secretStorage.get('stt:groq')`. The data.json never sees
// plaintext keys.

/** Zone folder map. Each zone's root folder path is operator-configurable;
 *  defaults to the zone id. The scanner applies these as prefix overrides
 *  when resolving zone objects from `config/zones.yaml`. */
export type ZoneFolderMap = {
  atlas: string;
  gtd: string;
  intel: string;
  personal: string;
  system: string;
  config: string;
};

export interface WorkdeskSettings {
  vault: {
    path: string;
    autoOpenDaily: boolean;
    dailyTemplatePath: string;
    /** Vault-relative folder where daily notes live. */
    dailyNoteFolder: string;
    /** Moment-style format string for the daily-note filename stem (no
     *  extension). Tokens YYYY MM DD HH mm ss substitute; anything else
     *  passes through literally. Default `YYYY-MM-DD` reproduces v1.5.x
     *  behavior. */
    dailyFilenameFormat: string;
  };
  zones: {
    showFilesView: boolean;
    density: 'compact' | 'cozy' | 'spacious';
    expandActiveOnLoad: boolean;
    showFileCounts: boolean;
    manifestPath: string;
    iconManifestPath: string;
    /** Per-zone root folder overrides. Defaults to the zone id. */
    folders: ZoneFolderMap;
  };
  capture: {
    provider: 'groq' | 'openai' | 'deepgram';
    model: string;
    streamPartials: boolean;
    /** Vault-relative folder where quick captures land by default. Free-form
     *  string so operators can route to any folder; the modal's chips remain
     *  as one-tap shortcuts at capture time. */
    defaultDest: string;
    filenamePattern: string;
    autoLogToSystem: boolean;
    inputDevice?: string;
    /** Where the STT API key comes from. `direct` = operator pasted it into
     *  Obsidian's SecretComponent. `infisical` = pulled on-demand from the
     *  Infisical CLI and cached in Obsidian's secretStorage. */
    keySource: 'direct' | 'infisical';
    infisical: {
      projectId: string;
      secretName: string;
      environment: string;
      /** ISO timestamp of the last successful pull. Surfaced in settings UI. */
      lastPulledAt?: string;
    };
  };
  terminal: {
    rightPaneIsTerminal: boolean;
    shell: string;
    cwd: string;
    font: 'Geist Mono' | 'JetBrains Mono' | 'IBM Plex Mono' | 'SF Mono';
    fontSize: 12 | 13 | 14 | 15;
    wrap: boolean;
    cursorStyle: 'block' | 'bar' | 'underline';
    persistSessions: boolean;
    scrollbackLines: number;
  };
  claude: {
    binaryPath: string;
    autoDetectTabStatus: boolean;
    highlightWikilinksInOutput: boolean;
    showContextPct: boolean;
    showCostEstimate: boolean;
    skillsDir: string;
    showSkillsCount: boolean;
  };
  onboarding: {
    completed: boolean;
    lastSeen: number;
  };
  focus: {
    /** Whether focus mode is currently active. Persisted so reload restores. */
    completed: boolean;
  };
  panes: {
    paneWidth: number;   // px, default 340, clamp [240, 560]
    rpaneWidth: number;  // px, default 340, clamp [280, 600]
  };
  theme: {
    matchObsidian: boolean;
    reduceMotion: 'auto' | 'on' | 'off';
  };
  html: {
    previewMode: 'inline' | 'browser';
    allowScripts: boolean;
  };
  appearance: {
    /** When true, hides ribbon icons not contributed by Workdesk Operating System via a body class hook. */
    hideNonWorkdeskRibbonIcons: boolean;
  };
  templates: {
    /** Vault-relative folder containing markdown templates. The Insert
     *  template command lists every `.md` under this folder, recursively. */
    folder: string;
    /** Default format for {{date}} substitutions. Moment-style tokens. */
    dateFormat: string;
    /** Default format for {{time}} substitutions. Moment-style tokens. */
    timeFormat: string;
  };
}

export const DEFAULT_SETTINGS: WorkdeskSettings = {
  vault: {
    path: '~/Workdesk-OS',
    autoOpenDaily: true,
    dailyTemplatePath: 'config/templates/daily-note.md',
    dailyNoteFolder: 'personal/daily',
    dailyFilenameFormat: 'YYYY.MM.DD [Daily Note]',
  },
  zones: {
    showFilesView: true,
    density: 'cozy',
    expandActiveOnLoad: true,
    showFileCounts: true,
    manifestPath: 'config/zones.yaml',
    iconManifestPath: 'config/object-icons.yaml',
    folders: {
      atlas: 'atlas',
      gtd: 'gtd',
      intel: 'intel',
      personal: 'personal',
      system: 'system',
      config: 'config',
    },
  },
  capture: {
    provider: 'groq',
    model: 'whisper-large-v3',
    streamPartials: true,
    defaultDest: 'personal/captures',
    filenamePattern: '{{date}} Capture - {{title}}',
    autoLogToSystem: true,
    keySource: 'direct',
    infisical: {
      projectId: '',
      secretName: 'PERSONAL_GROQ_WHISPER_API_KEY',
      environment: 'prod',
    },
  },
  terminal: {
    rightPaneIsTerminal: true,
    shell: '/bin/zsh -il',
    cwd: '{{vault}}',
    font: 'Geist Mono',
    fontSize: 13,
    wrap: true,
    cursorStyle: 'block',
    persistSessions: true,
    scrollbackLines: 10000,
  },
  claude: {
    binaryPath: '/usr/local/bin/claude',
    autoDetectTabStatus: true,
    highlightWikilinksInOutput: true,
    showContextPct: true,
    showCostEstimate: true,
    skillsDir: 'config/skills',
    showSkillsCount: true,
  },
  onboarding: {
    completed: false,
    lastSeen: 0,
  },
  focus: {
    completed: false,
  },
  panes: {
    paneWidth: 340,
    rpaneWidth: 340,
  },
  theme: {
    matchObsidian: true,
    reduceMotion: 'auto',
  },
  html: {
    previewMode: 'inline',
    allowScripts: false,
  },
  appearance: {
    // On for new installs — operators picking WorkDesk as their primary surface
    // want a tight ribbon. The Appearance settings sub-tab lets them flip back
    // if they prefer the native icons visible.
    hideNonWorkdeskRibbonIcons: true,
  },
  templates: {
    folder: 'config/templates',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: 'HH:mm',
  },
};

export const PANE_CLAMPS = {
  paneWidth: { min: 240, max: 560 },
  rpaneWidth: { min: 280, max: 600 },
  editorMin: 360,
} as const;
