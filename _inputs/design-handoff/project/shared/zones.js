// WorkDesk — Zone data model (mock vault)
// Shape: ZONES[zoneId] = { name, sub, icon, objects: [{ id, title, sub, count, icon, children?, empty? }] }
window.WS_ZONES = {
  atlas: {
    name: 'atlas',
    sub: 'People, companies, projects, decisions',
    icon: 'globe',
    objects: [
      { id: 'projects', title: 'projects', sub: 'Active engagements & infrastructure', count: 8, icon: 'folder', expanded: true,
        children: [
          { type: 'folder', name: 'workdesk', count: 23, expanded: true, depth: 1, children: [
            { type: 'file', name: '_brief.md', depth: 2, active: true },
            { type: 'file', name: '_status.md', depth: 2 },
            { type: 'file', name: 'plan.md', depth: 2 },
            { type: 'folder', name: 'specs', count: 4, depth: 2, children: [
              { type: 'file', name: 'ui-design.md', depth: 3 },
              { type: 'file', name: 'workdesk-init.md', depth: 3 },
              { type: 'file', name: 'onboarding-redesign.md', depth: 3 },
            ]},
            { type: 'folder', name: 'notes', count: 7, depth: 2 },
            { type: 'folder', name: 'reference', count: 6, depth: 2 },
          ]},
          { type: 'folder', name: 'vault-architecture', count: 18, depth: 1 },
          { type: 'folder', name: 'dudley-msa-review', count: 12, depth: 1 },
          { type: 'folder', name: 'paxus-qbo-integration', count: 9, depth: 1 },
        ]
      },
      { id: 'people', title: 'people', sub: 'Contacts with vault entries', count: 34, icon: 'person',
        children: [
          { type: 'file', name: 'khalil-benalioulhaj.md', depth: 1 },
          { type: 'file', name: 'yvette-raven.md', depth: 1 },
          { type: 'file', name: 'lisa-dionisio.md', depth: 1 },
          { type: 'file', name: 'martin-holland.md', depth: 1 },
        ]
      },
      { id: 'companies', title: 'companies', sub: 'Clients, partners, vendors', count: 17, icon: 'building',
        children: [
          { type: 'file', name: 'benali.md', depth: 1 },
          { type: 'file', name: 'dudley-land-company.md', depth: 1 },
          { type: 'file', name: 'paxus.md', depth: 1 },
        ]
      },
      { id: 'meetings', title: 'meetings', sub: 'Transcribed sessions, processed', count: 61, icon: 'video' },
      { id: 'decisions', title: 'decisions', sub: 'Logged calls with rationale', count: 22, icon: 'badge' },
      { id: 'content', title: 'content', sub: 'Drafts, candidates, published', count: 0, icon: 'pencil' },
    ]
  },
  gtd: {
    name: 'gtd',
    sub: 'Active projects and next actions',
    icon: 'check',
    objects: [
      { id: 'inbox', title: 'inbox', sub: 'Awaiting processing', count: 0, icon: 'inbox', empty: 'caught-up' },
      { id: 'projects', title: 'projects', sub: 'In motion right now', count: 8, icon: 'folder', expanded: true,
        children: [
          { type: 'folder', name: 'ship-workdesk-v1.2.7', count: 26, depth: 1, expanded: true, children: [
            { type: 'file', name: '_status.md', depth: 2 },
            { type: 'file', name: '_brief.md', depth: 2 },
            { type: 'file', name: 'plan.md', depth: 2 },
            { type: 'folder', name: 'reference', count: 5, depth: 2, children: [
              { type: 'file', name: 'obsidian-plugin-api.md', depth: 3 },
              { type: 'file', name: 'lucide-icon-set.md', depth: 3 },
              { type: 'file', name: 'codex-review-findings.md', depth: 3 },
              { type: 'file', name: 'desk-design-principles.md', depth: 3 },
              { type: 'file', name: 'iA-writer-style.md', depth: 3 },
            ]},
            { type: 'folder', name: '_archive', count: 3, depth: 2, children: [
              { type: 'file', name: '_brief-v1.md', depth: 3 },
              { type: 'file', name: '_status-2026-04-15.md', depth: 3 },
              { type: 'file', name: 'plan-spike.md', depth: 3 },
            ]},
            { type: 'folder', name: 'repo', count: 6, depth: 2, children: [
              { type: 'file', name: 'README.md', depth: 3 },
              { type: 'file', name: 'manifest.json', depth: 3 },
              { type: 'file', name: 'tokens.css', depth: 3 },
              { type: 'file', name: 'app.css', depth: 3 },
              { type: 'file', name: 'main.ts', depth: 3 },
              { type: 'file', name: 'preview.html', depth: 3 },
            ]},
            { type: 'folder', name: 'notes', count: 4, depth: 2, children: [
              { type: 'file', name: '2026-05-13 sync.md', depth: 3 },
              { type: 'file', name: '2026-05-12 internal-review.md', depth: 3 },
              { type: 'file', name: '2026-05-10 codex-review.md', depth: 3 },
              { type: 'file', name: 'open-questions.md', depth: 3 },
            ]},
            { type: 'folder', name: 'deliverables', count: 3, depth: 2, children: [
              { type: 'file', name: 'v1.3-design-spec.md', depth: 3 },
              { type: 'file', name: 'design-tokens-handoff.md', depth: 3 },
              { type: 'file', name: 'prototype.html', depth: 3 },
            ]},
          ]},
          { type: 'folder', name: 'lisa-onboarding', count: 6, depth: 1 },
          { type: 'folder', name: 'q2-content-plan', count: 9, depth: 1 },
        ]
      },
      { id: 'next-actions', title: 'next-actions', sub: 'Things to do today', count: 12, icon: 'zap' },
      { id: 'waiting-for', title: 'waiting-for', sub: 'Blocked on others', count: 4, icon: 'clock' },
      { id: 'someday', title: 'someday', sub: 'Maybe one day', count: 0, icon: 'feather' },
    ]
  },
  intel: {
    name: 'intel',
    sub: 'Reads, concepts, and references',
    icon: 'signal',
    objects: [
      { id: 'reads', title: 'reads', sub: 'Articles, papers, threads', count: 28, icon: 'book' },
      { id: 'concepts', title: 'concepts', sub: 'Ideas in development', count: 19, icon: 'feather' },
      { id: 'reference', title: 'reference', sub: 'Standards and primitives', count: 24, icon: 'archive' },
      { id: 'briefings', title: 'briefings', sub: 'Daily and weekly', count: 5, icon: 'list' },
    ]
  },
  personal: {
    name: 'personal',
    sub: 'Journal, daily notes, captures',
    icon: 'person',
    objects: [
      { id: 'daily', title: 'daily', sub: 'One note per day', count: 145, icon: 'sun', expanded: true,
        children: [
          { type: 'file', name: '2026-05-13.md', depth: 1, active: true },
          { type: 'file', name: '2026-05-12.md', depth: 1 },
          { type: 'file', name: '2026-05-11.md', depth: 1 },
          { type: 'file', name: '2026-05-10.md', depth: 1 },
        ]
      },
      { id: 'journal', title: 'journal', sub: 'Long-form reflection', count: 28, icon: 'feather' },
      { id: 'captures', title: 'captures', sub: 'Voice notes, transcribed', count: 89, icon: 'pencil' },
      { id: 'books', title: 'books', sub: 'Reading notes', count: 12, icon: 'book' },
      { id: 'identity', title: 'identity', sub: 'Values, principles, voice', count: 3, icon: 'shield' },
    ]
  },
  system: {
    name: 'system',
    sub: 'Inbox, logs, processing',
    icon: 'layers',
    objects: [
      { id: 'log', title: 'log.md', sub: 'Append-only event stream', count: '—', icon: 'list' },
      { id: 'claude-log', title: 'claude-log', sub: 'Session audit trail', count: 147, icon: 'archive' },
      { id: 'reference', title: 'reference', sub: 'SOPs, workflows, standards', count: 8, icon: 'book' },
      { id: 'processing', title: '_processing', sub: 'Claude scratch — cleared after runs', count: '—', icon: 'folder' },
    ]
  },
  config: {
    name: 'config',
    sub: 'WorkDesk plugin and skill configuration',
    icon: 'gear',
    objects: [
      { id: 'settings', title: 'settings.json', sub: 'Hooks, permissions, env', count: '—', icon: 'file' },
      { id: 'agents', title: 'agents', sub: 'Orchestrator + specialists', count: 3, icon: 'shield' },
      { id: 'skills', title: 'skills', sub: 'Workflow entry points', count: 18, icon: 'zap' },
      { id: 'rules', title: 'rules', sub: 'Hard constraints', count: 11, icon: 'badge' },
      { id: 'scripts', title: 'scripts', sub: 'Hook implementations', count: 14, icon: 'code' },
      { id: 'templates', title: 'templates', sub: 'Daily note, vault README', count: 4, icon: 'file' },
    ]
  },
};

window.WS_ZONE_ORDER = ['atlas', 'gtd', 'intel', 'personal', 'system', 'config'];
