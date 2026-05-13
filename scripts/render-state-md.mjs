#!/usr/bin/env node
// Renders STATE.md from STATE.json. Run after every STATE.json mutation.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const state = JSON.parse(fs.readFileSync(path.join(root, 'STATE.json'), 'utf8'));

const phaseOrder = ['0', '1', '2', '3', '4a.1', '4a.2', '4b', '5a', '5b', '6a', '6b'];

const lines = [];
lines.push('# WorkdeskOS Plugin — STATE');
lines.push('');
lines.push(`- **plugin_id**: \`${state.plugin_id}\``);
lines.push(`- **repo_path**: \`${state.repo_path}\``);
lines.push(`- **last_session**: \`${state.last_session}\``);
lines.push(`- **runtime**: node \`${state.runtime.node}\` · pnpm \`${state.runtime.pnpm}\` · python3 \`${state.runtime.python3_version}\``);
lines.push('');
lines.push('## Phases');
lines.push('');
lines.push('| Phase | Status | Commit | Verified at |');
lines.push('|---|---|---|---|');
for (const id of phaseOrder) {
  const p = state.phases[id];
  if (!p) continue;
  const sha = p.commit ? `\`${p.commit.slice(0, 9)}\`` : '—';
  const ts = p.verified_at ?? '—';
  lines.push(`| ${id} | **${p.status}** | ${sha} | ${ts} |`);
}
lines.push('');
lines.push('## Decisions');
lines.push('');
for (const [k, v] of Object.entries(state.decisions)) {
  if (k === 'font_shas') {
    lines.push(`- \`font_shas\`: ${Object.keys(v).length} fonts recorded`);
    continue;
  }
  if (k === 'added_deps') {
    lines.push(`- \`added_deps\`: ${v.length} entries`);
    continue;
  }
  if (typeof v === 'string' && v.length > 40) {
    lines.push(`- \`${k}\`: \`${v.slice(0, 20)}…${v.slice(-12)}\``);
  } else {
    lines.push(`- \`${k}\`: \`${JSON.stringify(v)}\``);
  }
}
lines.push('');
lines.push('---');
lines.push(`_Rendered at ${new Date().toISOString()} from \`STATE.json\`._`);

fs.writeFileSync(path.join(root, 'STATE.md'), lines.join('\n') + '\n');
console.log('[render-state-md] wrote STATE.md');
