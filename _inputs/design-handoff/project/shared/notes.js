// Sample note bodies — realistic markdown rendering for the prototype
window.WS_NOTES = {
  '_brief.md': `
    <h1>WorkDesk — Brief</h1>
    <div class="properties">
      <div class="key">type</div><div class="val">project-brief</div>
      <div class="key">status</div><div class="val">active</div>
      <div class="key">updated</div><div class="val">May 13, 2026</div>
      <div class="key">owner</div><div class="val"><span class="wikilink">khalil-benalioulhaj</span></div>
      <div class="key">tags</div><div class="val"><a class="tag">#workdesk</a> <a class="tag">#v1</a></div>
    </div>

    <p>What a non-Khalil operator sees the moment they finish onboarding. The visual surface should read as deliberate and calm — not Obsidian with stuff bolted on.</p>

    <h2>Why this project exists</h2>
    <p>WorkDesk OS V1 shipped on 2026-04-27 as the public repo. Within 24 hours, two independent reviews confirmed the V1 install is <strong>not</strong> ready for a non-Khalil user.</p>

    <div class="callout note">
      <div class="callout-title">Note</div>
      <p>Combined with the Codex code review, there are <strong>28 fixable items</strong> across three severity tiers. See <span class="wikilink">2026-04-28-bug-list-v1</span> for the full punch list.</p>
    </div>

    <h2>Scope</h2>
    <table>
      <thead><tr><th>In scope</th><th>Out of scope</th></tr></thead>
      <tbody>
        <tr><td>One-line install (curl-piped)</td><td>Vault-architecture changes</td></tr>
        <tr><td>Bootstrap robustness</td><td>New skill development</td></tr>
        <tr><td><code>/workdesk-doctor</code> self-fix</td><td>Plugin dev beyond Phase 3 spike</td></tr>
        <tr><td><code>/onboarding</code> pacing redesign</td><td>Migrating V1 vaults to V1.1</td></tr>
      </tbody>
    </table>

    <h2>DONE criterion</h2>
    <blockquote>
      <p><strong>Yvette runs her daily work entirely inside a freshly-installed WorkDesk OS for two weeks without workarounds, after a single one-line install command and the <code>/onboarding</code> skill — no expert on the call.</strong></p>
    </blockquote>

    <h2>Install command</h2>
    <pre><code>curl -fsSL https://raw.githubusercontent.com/BenaliHQ/workdesk-os/main/install.sh \\
  | WORKDESK_VAULT_PATH="~/Workdesk-OS" bash</code></pre>

    <h4>Keyboard surface</h4>
    <ul>
      <li><kbd>⌘</kbd> + <kbd>K</kbd> — command palette</li>
      <li><kbd>⌘</kbd> + <kbd>T</kbd> — today's daily note</li>
      <li><kbd>⌘</kbd> + <kbd>J</kbd> — toggle terminal</li>
      <li><kbd>⌘</kbd> + <kbd>Shift</kbd> + <kbd>F</kbd> — focus mode</li>
      <li><kbd>⌘</kbd> + <kbd>Shift</kbd> + <kbd>M</kbd> — quick capture</li>
    </ul>

    <h2>Risks</h2>
    <div class="callout warning">
      <div class="callout-title">Plugin maintenance burden</div>
      <p>Building <code>workdesk-surface</code> is a deliberate departure from Principle 10. Justified because no shippable combination of existing plugins produces the curated experience operators ask for. Target: &lt; 500 LOC.</p>
    </div>
    <div class="callout info">
      <div class="callout-title">STT provider dependency</div>
      <p>Cloud-only by design — cross-device parity outweighs offline use. Default Groq Whisper-large-v3.</p>
    </div>

    <h2>Open items</h2>
    <ul class="task-list">
      <li><span class="checkbox checked"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg></span><span class="done">Phase A — install bedrock</span></li>
      <li><span class="checkbox checked"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg></span><span class="done">Phase B — onboarding redesign</span></li>
      <li><span class="checkbox checked"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg></span><span class="done">Phase C — hardening</span></li>
      <li><span class="checkbox"></span>Phase D — visual product surface <em>(this work)</em></li>
      <li><span class="checkbox"></span>Yvette's two-week dogfood</li>
    </ul>

    <hr />

    <div class="callout success">
      <div class="callout-title">Confidence</div>
      <p><strong>~70%.</strong> Bug list is empirical, not speculative. V1 architecture is solid; this is fix work.</p>
    </div>

    <p class="footnote">Sources: live operator conversation 2026-04-28, <span class="wikilink">2026-04-28-codex-review-findings</span>.</p>
  `,

  '_status.md': `
    <h1>WorkDesk — Status</h1>
    <div class="properties">
      <div class="key">phase</div><div class="val">D — visual surface</div>
      <div class="key">version</div><div class="val">v1.2.6 → v1.3</div>
      <div class="key">updated</div><div class="val">May 13, 2026</div>
    </div>
    <p><strong>Phase D in motion.</strong> Visual product surface — extends the four-pane shell with a real spec doc Claude Code can consume.</p>
    <h2>Open question</h2>
    <p>What's the highest-leverage focus next? Three candidate forks, ranked:</p>
    <ol>
      <li><strong>Khalil dogfoods WorkDesk</strong> — biggest lever; surfaces the same friction Yvette will hit</li>
      <li>Yvette dogfood prep — clearest path</li>
      <li>v1.2.7 hardening leftovers — lowest risk</li>
    </ol>
    <div class="callout note">
      <div class="callout-title">Today</div>
      <p>Shipping the WorkDesk visual spec to Claude Code. Plugin scaffold starts tomorrow.</p>
    </div>
  `,

  '2026-05-13.md': `
    <h1>Wednesday, May 13 2026</h1>
    <div class="properties">
      <div class="key">type</div><div class="val">daily-note</div>
      <div class="key">weather</div><div class="val">sunny / 22°</div>
      <div class="key">mood</div><div class="val">7/10</div>
    </div>

    <h2>Today</h2>
    <ul class="task-list">
      <li><span class="checkbox checked"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg></span><span class="done">Morning pages</span></li>
      <li><span class="checkbox checked"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg></span><span class="done">Ship WorkDesk visual spec to Claude Code</span></li>
      <li><span class="checkbox"></span>1:1 with <span class="wikilink">yvette-raven</span> @ 14:00</li>
      <li><span class="checkbox"></span>Review Dudley MSA red-lines</li>
      <li><span class="checkbox"></span>Walk 5km after lunch</li>
    </ul>

    <h2>Notes</h2>
    <p>Shipped the WorkDesk visual spec around 11am. Claude Code can now read <span class="wikilink">design-tokens</span>, <span class="wikilink">component-specs</span> and the manifest. Felt good — three weeks of mockups finally in one place.</p>

    <p>Lunch w/ <span class="wikilink">martin-holland</span>. He's been thinking about the same scoping problem for the content engine. We agreed: <strong>three forks max, one shipping, two on deck.</strong></p>

    <h3>Captures</h3>
    <blockquote>
      <p>"The hard part isn't building the plugin. The hard part is making the visual surface so calm that nobody notices it's a plugin." — voice memo, 09:41</p>
    </blockquote>

    <h2>Tomorrow</h2>
    <ul>
      <li>Plugin scaffold: <code>main.ts</code>, <code>manifest.json</code>, ribbon icons</li>
      <li>Get the ZoneSlot CustomView wired up to the Obsidian file explorer API</li>
    </ul>
  `,

  '_inbox.md': `
    <h1>GTD Inbox</h1>
    <p class="footnote">Everything here is <em>unprocessed</em>. Run <code>/triage</code> to clear.</p>
    <div class="callout success">
      <div class="callout-title">Caught up</div>
      <p>Inbox is empty as of 11:02 today. Next capture lands here.</p>
    </div>
  `,

  'plan.md': `
    <h1>ship-workdesk-v1.2.7 · Plan</h1>
    <div class="properties">
      <div class="key">type</div><div class="val">project-plan</div>
      <div class="key">project</div><div class="val"><span class="wikilink">ship-workdesk-v1.2.7</span></div>
      <div class="key">phase</div><div class="val">D — visual surface</div>
      <div class="key">updated</div><div class="val">May 13, 2026</div>
    </div>

    <h2>Forks under consideration</h2>
    <ol>
      <li><strong>Khalil dogfoods WorkDesk</strong> — biggest lever, surfaces what Yvette will hit</li>
      <li><strong>Yvette dogfood prep</strong> — clearest path, two-week test</li>
      <li><strong>v1.2.7 hardening leftovers</strong> — lowest risk, polish</li>
    </ol>

    <h2>This week</h2>
    <ul class="task-list">
      <li><span class="checkbox checked"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg></span><span class="done">Lock the visual spec in <span class="wikilink">deliverables/v1.3-design-spec</span></span></li>
      <li><span class="checkbox checked"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg></span><span class="done">Export tokens + components handoff to Claude Code</span></li>
      <li><span class="checkbox"></span>Scaffold plugin · <code>main.ts</code>, <code>manifest.json</code>, view registration</li>
      <li><span class="checkbox"></span>Wire ZoneView to file-explorer API</li>
      <li><span class="checkbox"></span>Build CommandPalette + QuickCapture modals</li>
      <li><span class="checkbox"></span>Smoke test with <span class="wikilink">yvette-raven</span></li>
    </ul>

    <h2>Open questions</h2>
    <p>See <span class="wikilink">notes/open-questions</span>.</p>

    <div class="callout note">
      <div class="callout-title">Project shape</div>
      <p>Every project follows the same shape: <code>_status.md</code>, <code>_brief.md</code>, <code>plan.md</code> at the root, plus <code>reference/</code>, <code>_archive/</code>, <code>repo/</code>, <code>notes/</code>, <code>deliverables/</code> folders.</p>
    </div>
  `,

  'README.md': `
    <h1>workdesk-surface</h1>
    <p>Obsidian plugin · curated visual surface for WorkDesk-OS vaults.</p>
    <p>The plugin is a small TypeScript shell (target &lt; 500 LOC) that overlays a four-pane grid: ribbon, zone pane, editor, right pane. It does not replace Obsidian's editor — it replaces the chrome around it.</p>
    <h2>Install</h2>
    <pre><code>curl -fsSL https://raw.githubusercontent.com/BenaliHQ/workdesk-os/main/install.sh \\
  | WORKDESK_VAULT_PATH="~/Workdesk-OS" bash</code></pre>
    <h2>Build</h2>
    <pre><code>pnpm install
pnpm run build</code></pre>
    <p>See <span class="wikilink">deliverables/v1.3-design-spec</span> for the full visual spec.</p>
  `,

  '2026-05-13 sync.md': `
    <h1>2026-05-13 sync</h1>
    <div class="properties">
      <div class="key">type</div><div class="val">meeting-note</div>
      <div class="key">attendees</div><div class="val"><span class="wikilink">khalil-benalioulhaj</span>, <span class="wikilink">yvette-raven</span></div>
      <div class="key">duration</div><div class="val">14:00 → 14:30</div>
    </div>
    <h2>Agenda</h2>
    <ul>
      <li>Where the design spec landed</li>
      <li>Dogfood timeline</li>
      <li>Next week scope</li>
    </ul>
    <h2>Decisions</h2>
    <ul>
      <li><strong>Yvette starts dogfood Monday</strong> · no expert on call</li>
      <li><strong>Khalil migrates from <code>~/khalils-vault/</code></strong> in parallel</li>
    </ul>
    <h2>Action items</h2>
    <ul class="task-list">
      <li><span class="checkbox"></span>Send install instructions · @khalil · today</li>
      <li><span class="checkbox"></span>Set up screenshare for first daily · @yvette · Monday</li>
    </ul>
  `,

  'open-questions.md': `
    <h1>Open questions</h1>
    <ol>
      <li><strong>How small can <code>main.ts</code> stay?</strong> Target is &lt; 500 LOC; currently scaffolded at ~120.</li>
      <li><strong>Where does the terminal session persist?</strong> Per-vault or per-machine?</li>
      <li><strong>HTML files in the editor</strong> — register <code>HtmlView</code> for <code>.html</code>, or just route to system browser?</li>
      <li><strong>STT cost</strong> — Groq free tier limits at high volume; offer self-host fallback?</li>
    </ol>
  `,

  'v1.3-design-spec.md': `
    <h1>v1.3 · Design spec</h1>
    <div class="properties">
      <div class="key">type</div><div class="val">deliverable</div>
      <div class="key">audience</div><div class="val">Claude Code</div>
      <div class="key">status</div><div class="val">final</div>
    </div>
    <p>This is the visual spec Claude Code consumes to build the <code>workdesk-surface</code> plugin. The lossless source lives in the prototype project; this note is the index.</p>
    <h2>Artifacts</h2>
    <ul>
      <li><span class="wikilink">prototype.html</span> · interactive four-pane shell</li>
      <li><span class="wikilink">tokens.css</span> · single source of truth</li>
      <li><span class="wikilink">app.css</span> · component CSS</li>
      <li><span class="wikilink">design-tokens-handoff</span> · markdown summary</li>
    </ul>
    <h2>Non-negotiables</h2>
    <ol>
      <li>Tokens come first — no magic numbers</li>
      <li>Obsidian-native variable names</li>
      <li>Light + dark both polished</li>
      <li>Don't reimplement Obsidian — curate, don't replace</li>
      <li>Calm beats clever</li>
    </ol>
  `,
};

// ── HTML previews ──────────────────────────────────────────────────────
// srcdoc strings for each known HTML file. Used by renderHtmlPreview().
window.WS_HTML_PREVIEWS = {
  '__default': (name) => `<!doctype html><html><head><style>
    body { font-family: 'DM Sans', system-ui, sans-serif; margin: 0; background: #faf9f7; color: #1a1a1a; }
    .shell { max-width: 640px; margin: 0 auto; padding: 48px 40px; }
    h1 { font-family: 'Manrope', system-ui, sans-serif; font-size: 24px; letter-spacing: -0.015em; margin: 0 0 8px; }
    .sub { color: #6b6862; font-size: 13px; margin: 0 0 24px; }
    .row { display: flex; gap: 12px; padding: 12px 14px; background: white; border: 1px solid #e9e5df; border-radius: 8px; margin-bottom: 8px; }
    .row strong { color: #1a1a1a; }
    code { font-family: 'Geist Mono', ui-monospace, monospace; font-size: 13px; background: #f6f3ed; padding: 1px 6px; border-radius: 4px; }
  </style></head><body><div class="shell">
    <h1>${name}</h1>
    <div class="sub">HTML file · rendered inline via workdesk-html-view.</div>
    <div class="row"><strong>Path:</strong> <code>gtd/projects/ship-workdesk-v1.2.7/${name}</code></div>
    <div class="row"><strong>Size:</strong> 2.4 KB</div>
    <div class="row"><strong>Modified:</strong> May 13, 2026 · 11:42</div>
    <div class="sub" style="margin-top: 24px">In a real vault, this iframe renders the actual file. Open in browser ↗ for full interaction.</div>
  </div></body></html>`,

  'preview.html': `<!doctype html><html><head><style>
    body { font-family: 'DM Sans', system-ui, sans-serif; margin: 0; background: #f3f1ee; color: #1a1a1a; }
    .shell { max-width: 720px; margin: 0 auto; padding: 48px 40px; }
    h1 { font-family: 'Manrope', system-ui, sans-serif; font-size: 28px; letter-spacing: -0.02em; margin: 0 0 6px; }
    .sub { color: #6b6862; font-size: 14px; margin: 0 0 32px; }
    .card { background: white; border: 1px solid #e9e5df; border-radius: 12px; padding: 20px 24px; box-shadow: 0 1px 0 rgba(20,20,20,0.02), 0 1px 3px rgba(20,20,20,0.04); margin-bottom: 14px; }
    .card h3 { margin: 0 0 4px; font-size: 16px; }
    .card p { margin: 0; color: #6b6862; font-size: 13px; line-height: 1.55; }
    .pip { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 8px; vertical-align: 1px; }
  </style></head><body><div class="shell">
    <h1>workdesk-surface · preview</h1>
    <div class="sub">Live preview of the plugin output — what the user will see in Obsidian.</div>
    <div class="card"><h3><span class="pip" style="background:#4a6a8a"></span>atlas</h3><p>People, companies, projects, decisions</p></div>
    <div class="card"><h3><span class="pip" style="background:#4f7a52"></span>gtd</h3><p>Active projects and next actions</p></div>
    <div class="card"><h3><span class="pip" style="background:#8a6a2e"></span>intel</h3><p>Reads, concepts, briefings</p></div>
    <div class="card"><h3><span class="pip" style="background:#8a4a55"></span>personal</h3><p>Journal, daily notes, captures</p></div>
    <div class="card"><h3><span class="pip" style="background:#5a5a5a"></span>system</h3><p>Inbox, logs, processing</p></div>
  </div></body></html>`,

  'prototype.html': `<!doctype html><html><head><style>
    body { font-family: 'DM Sans', system-ui, sans-serif; margin: 0; background: #f3f1ee; color: #1a1a1a; -webkit-font-smoothing: antialiased; }
    .shell { display: grid; grid-template-columns: 64px 280px 1fr; height: 100vh; }
    .ribbon { background: #f3f1ee; border-right: 1px solid #efece6; padding: 12px 0; display: flex; flex-direction: column; align-items: center; gap: 6px; }
    .slot { width: 36px; height: 36px; border-radius: 9px; }
    .slot.s1 { background: #e7eef6; }
    .slot.s2 { background: #e6efe6; }
    .slot.s3 { background: #f5ecdc; }
    .slot.s4 { background: #f4e6e8; }
    .slot.s5 { background: #ececec; }
    .slot.active { box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 4px 10px -3px #4a6a8a; transform: scale(1.06); }
    .pane { background: #faf9f7; border-right: 1px solid #efece6; padding: 24px; }
    .pane h2 { font-family: 'Manrope', system-ui, sans-serif; font-size: 18px; margin: 0 0 16px; letter-spacing: -0.01em; }
    .obj { background: white; border-radius: 10px; padding: 10px 12px; margin-bottom: 8px; box-shadow: 0 1px 0 rgba(20,20,20,0.02), 0 1px 3px rgba(20,20,20,0.04); display: flex; align-items: center; gap: 12px; }
    .obj .ic { width: 30px; height: 30px; border-radius: 50%; background: #e7eef6; color: #4a6a8a; display: grid; place-items: center; font-weight: 600; font-size: 13px; }
    .obj .t { font-weight: 500; font-size: 13.5px; }
    .obj .s { font-size: 11.5px; color: #9a958d; }
    .editor { background: white; padding: 48px 56px; overflow: auto; }
    .editor h1 { font-family: 'Manrope', system-ui, sans-serif; font-size: 28px; letter-spacing: -0.015em; margin: 0 0 12px; }
    .editor p { line-height: 1.65; color: #1a1a1a; max-width: 580px; }
  </style></head><body><div class="shell">
    <div class="ribbon">
      <div class="slot s1 active"></div>
      <div class="slot s2"></div>
      <div class="slot s3"></div>
      <div class="slot s4"></div>
      <div class="slot s5"></div>
    </div>
    <div class="pane">
      <h2>Atlas</h2>
      <div class="obj"><div class="ic">P</div><div><div class="t">Projects</div><div class="s">8 active</div></div></div>
      <div class="obj"><div class="ic">P</div><div><div class="t">People</div><div class="s">34 contacts</div></div></div>
      <div class="obj"><div class="ic">C</div><div><div class="t">Companies</div><div class="s">17 entries</div></div></div>
    </div>
    <div class="editor">
      <h1>workdesk-surface · prototype.html</h1>
      <p>This is what the plugin output looks like, rendered as a standalone HTML preview. The actual plugin runs as a TypeScript bundle inside Obsidian, but the visual surface is identical — same tokens, same components, same calm.</p>
      <p style="color:#6b6862; font-size: 13px; margin-top: 32px">Live preview · scroll to explore.</p>
    </div>
  </div></body></html>`,
};

// ── Code previews ──────────────────────────────────────────────────────
// For .ts / .css / .json files, render as a fancy code block.
function wrapCode(name, lang, code) {
  const lines = code.split('\n');
  const numbered = lines.map((l, i) => `<span style="color:var(--text-faint);display:inline-block;width:32px;text-align:right;padding-right:14px;user-select:none;font-variant-numeric:tabular-nums">${i + 1}</span>${l || '&nbsp;'}`).join('\n');
  return `<h1>${name}</h1>
    <div class="properties">
      <div class="key">type</div><div class="val">${lang}</div>
      <div class="key">size</div><div class="val">${(code.length / 1024).toFixed(1)} KB · ${lines.length} lines</div>
    </div>
    <pre style="max-width:none;overflow-x:auto"><code style="font-size:12.5px;line-height:1.6;display:block;white-space:pre">${numbered}</code></pre>`;
}

window.WS_CODE_PREVIEWS = {
  'manifest.json': wrapCode('manifest.json', 'json', `{
  "id": "workdesk-surface",
  "name": "WorkDesk",
  "version": "1.0.0",
  "minAppVersion": "1.5.0",
  "description": "Curated visual surface for WorkDesk-OS vaults — zones, command palette, quick capture, and a Claude Code terminal.",
  "author": "Benali",
  "authorUrl": "https://github.com/BenaliHQ/workdesk-os",
  "isDesktopOnly": false
}`),

  'main.ts': wrapCode('main.ts', 'typescript', `import { Plugin, WorkspaceLeaf } from 'obsidian';
import { ZoneView, VIEW_TYPE_ZONE } from './views/ZoneView';
import { CommandPalette } from './modals/CommandPalette';
import { QuickCapture } from './modals/QuickCapture';
import { WorkDeskSettings, DEFAULT_SETTINGS } from './settings';

export default class WorkDeskPlugin extends Plugin {
  settings: WorkDeskSettings;

  async onload() {
    await this.loadSettings();

    this.registerView(VIEW_TYPE_ZONE, (leaf) => new ZoneView(leaf, this));

    this.addCommand({
      id: 'workdesk-command-palette',
      name: 'Open WorkDesk command palette',
      hotkeys: [{ modifiers: ['Mod'], key: 'k' }],
      callback: () => new CommandPalette(this.app, this).open(),
    });

    this.addCommand({
      id: 'workdesk-quick-capture',
      name: 'Quick capture',
      hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'm' }],
      callback: () => new QuickCapture(this.app, this).open(),
    });

    if (!this.settings.onboarding.completed) this.runOnboarding();
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
}`),

  'tokens.css': wrapCode('tokens.css', 'css', `/* WorkDesk design tokens · single source of truth */
:root {
  --ws-space-1: 4px;
  --ws-space-2: 8px;
  --ws-space-3: 12px;
  --ws-space-4: 16px;
  --ws-radius-row: 6px;
  --ws-radius-card: 10px;
  --ws-radius-modal: 14px;
  --ws-font-sans: "DM Sans", system-ui, sans-serif;
  --ws-font-display: "Manrope", "DM Sans", sans-serif;
  --ws-font-mono: "Geist Mono", "JetBrains Mono", ui-monospace, monospace;
}
.theme-light, :root {
  --background-primary: #ffffff;
  --background-secondary: #faf9f7;
  --text-normal: #1a1a1a;
  --text-muted: #6b6862;
  --text-faint: #9a958d;
  --interactive-accent: #5a6b7a;
  --ws-zone-atlas-bg: #e7eef6;
  --ws-zone-atlas-fg: #4a6a8a;
  --ws-zone-gtd-bg: #e6efe6;
  --ws-zone-gtd-fg: #4f7a52;
}
.theme-dark {
  --background-primary: #2a2723;
  --background-secondary: #211f1c;
  --text-normal: #ebe5d9;
  --interactive-accent: #8a9aa8;
}`),

  'app.css': wrapCode('app.css', 'css', `/* WorkDesk component styles */
.app {
  display: grid;
  grid-template-columns: 64px 340px 1fr 340px;
  height: 100vh;
}
.zone-slot {
  width: 44px; height: 44px;
  border-radius: 12px;
  display: grid; place-items: center;
  cursor: pointer;
  background: transparent;
  border: none;
}
.zone-slot .dot {
  width: 32px; height: 32px;
  border-radius: 9px;
  display: grid; place-items: center;
}
.zone-slot.active .dot {
  transform: scale(1.06);
  box-shadow:
    0 1px 2px rgba(0,0,0,0.04),
    0 4px 10px -3px currentColor;
}
.obj {
  background: var(--background-primary);
  border-radius: var(--ws-radius-card);
  box-shadow: var(--ws-shadow-card);
  overflow: hidden;
}
.obj-row {
  display: grid;
  grid-template-columns: 36px 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 11px 12px;
  cursor: pointer;
}`),
};

// ── Re-define stubBodyFor on top of WS_NOTES + previews ────────────────

window.stubBodyFor = function (name) {
  if (window.WS_NOTES[name]) return window.WS_NOTES[name];

  // HTML files render inline via an iframe. The workdesk-surface plugin
  // registers an HtmlView for .html files; this is the in-prototype mock.
  if (name.endsWith('.html')) {
    return window.renderHtmlPreview(name);
  }

  // Code-flavored files render as a syntax-highlighted code block instead of body copy.
  if (window.WS_CODE_PREVIEWS && window.WS_CODE_PREVIEWS[name]) {
    return window.WS_CODE_PREVIEWS[name];
  }

  if (name.endsWith('.md')) {
    return `<h1>${name.replace('.md','')}</h1>
      <div class="properties">
        <div class="key">type</div><div class="val">note</div>
        <div class="key">updated</div><div class="val">May 13, 2026</div>
      </div>
      <p>Stub content — real note would render here with full markdown support.</p>
      <p>This is a placeholder for the in-prototype mock vault. Once the plugin is built, this file will live on disk at its actual path and Obsidian will render it via its native markdown engine.</p>`;
  }
  return `<h1>${name}</h1>`;
};

// ── HTML preview renderer ──────────────────────────────────────────────
// Renders a chip + iframe so the user sees what an HTML file would look
// like inline. The plugin registers an HtmlView for .html files that
// behaves the same way; fallback for users without the view is to open
// in the system browser.
window.renderHtmlPreview = function (name) {
  const srcdoc = window.WS_HTML_PREVIEWS && window.WS_HTML_PREVIEWS[name]
    ? window.WS_HTML_PREVIEWS[name]
    : window.WS_HTML_PREVIEWS['__default']
      ? window.WS_HTML_PREVIEWS['__default'](name)
      : '<html><body style="font-family: system-ui; padding: 40px; color: #888;">Preview unavailable.</body></html>';
  const safeSrcdoc = srcdoc.replace(/"/g, '&quot;');
  return `
    <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--ws-card-soft);border:1px solid var(--ws-border-hair);border-radius:8px;margin-bottom:16px;font-size:13px">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-muted)"><path d="m4 17 6-6-6-6M12 19h8"/></svg>
      <div style="flex:1;color:var(--text-muted)"><strong style="color:var(--text-normal);font-weight:600">${name}</strong> · rendered inline via <code>workdesk-html-view</code></div>
      <button class="btn ghost" style="font-size:12px;padding:5px 10px" onclick="window.open('${name}', '_blank')">Open in browser ↗</button>
    </div>
    <iframe srcdoc="${safeSrcdoc}" style="width:100%;height:560px;border:1px solid var(--background-modifier-border);border-radius:8px;background:white" sandbox="allow-same-origin"></iframe>
  `;
};
