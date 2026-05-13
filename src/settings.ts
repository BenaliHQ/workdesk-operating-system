// Settings schema for WorkdeskOS Plugin.
//
// The shape follows design-handoff/handoff/manifest.md § Settings schema.
// API keys are intentionally OMITTED from this interface: per design's
// manifest.md:138, keys must be stored via Obsidian's encrypted credential
// helper, not in data.json. The Quick capture settings tab (phase 5A) wires
// the UI via `new SecretComponent(el).setValue('stt:groq')`; reads happen
// through `app.secretStorage.get('stt:groq')`. The data.json never sees
// plaintext keys.

export interface WorkdeskSettings {
  vault: {
    path: string;
    autoOpenDaily: boolean;
    dailyTemplatePath: string;
  };
  zones: {
    showFilesView: boolean;
    density: 'compact' | 'cozy' | 'spacious';
    expandActiveOnLoad: boolean;
    showFileCounts: boolean;
    manifestPath: string;
    iconManifestPath: string;
  };
  capture: {
    provider: 'groq' | 'openai' | 'deepgram';
    model: string;
    streamPartials: boolean;
    defaultDest: 'personal/captures' | 'system/inbox' | 'gtd/inbox';
    filenamePattern: string;
    autoLogToSystem: boolean;
    inputDevice?: string;
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
}

export const DEFAULT_SETTINGS: WorkdeskSettings = {
  vault: {
    path: '~/Workdesk-OS',
    autoOpenDaily: true,
    dailyTemplatePath: 'config/templates/daily.md',
  },
  zones: {
    showFilesView: true,
    density: 'cozy',
    expandActiveOnLoad: true,
    showFileCounts: true,
    manifestPath: 'config/zones.yaml',
    iconManifestPath: 'config/object-icons.yaml',
  },
  capture: {
    provider: 'groq',
    model: 'whisper-large-v3',
    streamPartials: true,
    defaultDest: 'personal/captures',
    filenamePattern: '{{timestamp}}-{{slug}}',
    autoLogToSystem: true,
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
};

export const PANE_CLAMPS = {
  paneWidth: { min: 240, max: 560 },
  rpaneWidth: { min: 280, max: 600 },
  editorMin: 360,
} as const;
