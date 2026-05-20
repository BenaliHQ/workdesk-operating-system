// Discover recent AI-agent sessions on disk (Claude Code + Codex CLI) and
// format paste-ready resume commands.
//
// Claude Code stores each conversation at
//   ~/.claude/projects/<encoded-cwd>/<session-id>.jsonl
// We read each session file's header for the canonical `cwd` and `aiTitle`
// fields. The directory-name encoding (`/` → `-`) is lossy when the cwd
// itself contains `-`, so reading from the file is more reliable.
//
// Codex CLI maintains a single master index at
//   ~/.codex/session_index.jsonl
// One line per session: `{id, thread_name, updated_at}`. UUID + label
// already present — no per-file metadata read needed. `codex resume <UUID>`
// is portable across cwds, so no `cd` prefix is required in the command.

import { existsSync, openSync, readSync, closeSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const HOME = homedir();
const CLAUDE_PROJECTS_DIR = join(HOME, '.claude', 'projects');
const CODEX_SESSION_INDEX = join(HOME, '.codex', 'session_index.jsonl');
const MAX_PER_AGENT = 8;
const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h
const CLAUDE_HEADER_READ_BYTES = 256 * 1024; // 256KB — enough to reach `aiTitle` in typical sessions
const LABEL_MAX_LEN = 80;

export type AiAgent = 'claude' | 'codex';

export interface AiSession {
  agent: AiAgent;
  /** Working directory the session was active in. Null when unknown
   *  (Codex sessions only — the resume UUID is portable). */
  cwd: string | null;
  /** Session UUID. */
  sessionId: string;
  /** Epoch ms of the session's last activity. */
  lastModified: number;
  /** Human-readable label (aiTitle / thread_name / first prompt), or null. */
  label: string | null;
}

// ──────── Label cleaning ────────

function cleanLabel(raw: string): string {
  const flat = raw.replace(/\s+/g, ' ').trim();
  if (flat.length <= LABEL_MAX_LEN) return flat;
  return flat.slice(0, LABEL_MAX_LEN - 1).trimEnd() + '…';
}

function cleanCodexLabel(raw: string): string {
  // Strip the noisy "Codex Companion Task: " prefix that Codex auto-adds for
  // companion-mode sessions; keeps the heading readable.
  return cleanLabel(raw.replace(/^Codex Companion Task:\s*/i, ''));
}

// ──────── Claude discovery ────────

interface ClaudeSessionMeta {
  cwd: string | null;
  label: string | null;
}

function extractTextFromMessage(message: unknown): string | null {
  if (!message || typeof message !== 'object') return null;
  const m = message as { content?: unknown };
  if (typeof m.content === 'string') return m.content;
  if (Array.isArray(m.content)) {
    for (const c of m.content) {
      if (c && typeof c === 'object') {
        const block = c as { type?: unknown; text?: unknown };
        if (block.type === 'text' && typeof block.text === 'string') return block.text;
      }
    }
  }
  return null;
}

function readClaudeSessionMetadata(filePath: string): ClaudeSessionMeta {
  let fd: number;
  try {
    fd = openSync(filePath, 'r');
  } catch {
    return { cwd: null, label: null };
  }
  try {
    const buf = Buffer.alloc(CLAUDE_HEADER_READ_BYTES);
    const n = readSync(fd, buf, 0, buf.length, 0);
    const text = buf.subarray(0, n).toString('utf8');

    let cwd: string | null = null;
    let aiTitle: string | null = null;
    let firstUserText: string | null = null;

    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      let obj: Record<string, unknown>;
      try {
        obj = JSON.parse(line) as Record<string, unknown>;
      } catch {
        continue;
      }

      if (!cwd && typeof obj.cwd === 'string' && obj.cwd) cwd = obj.cwd;
      if (!aiTitle && typeof obj.aiTitle === 'string' && obj.aiTitle) aiTitle = obj.aiTitle;
      if (!firstUserText && obj.type === 'user') {
        const t = extractTextFromMessage(obj.message);
        if (t) firstUserText = t;
      }

      if (cwd && aiTitle) break;
    }

    const label = aiTitle ?? firstUserText;
    return { cwd, label: label ? cleanLabel(label) : null };
  } finally {
    try {
      closeSync(fd);
    } catch {
      // best-effort close
    }
  }
}

function findRecentClaudeSessions(): AiSession[] {
  if (!existsSync(CLAUDE_PROJECTS_DIR)) return [];
  const cutoff = Date.now() - RECENT_WINDOW_MS;

  interface Candidate {
    path: string;
    sessionId: string;
    mtime: number;
  }
  const candidates: Candidate[] = [];

  let projectDirs: string[];
  try {
    projectDirs = readdirSync(CLAUDE_PROJECTS_DIR);
  } catch {
    return [];
  }

  for (const projectDir of projectDirs) {
    const full = join(CLAUDE_PROJECTS_DIR, projectDir);
    try {
      if (!statSync(full).isDirectory()) continue;
    } catch {
      continue;
    }

    let files: string[];
    try {
      files = readdirSync(full);
    } catch {
      continue;
    }

    for (const file of files) {
      if (!file.endsWith('.jsonl')) continue;
      const path = join(full, file);
      let fst;
      try {
        fst = statSync(path);
      } catch {
        continue;
      }
      if (fst.mtimeMs < cutoff) continue;
      candidates.push({
        path,
        sessionId: file.replace(/\.jsonl$/, ''),
        mtime: fst.mtimeMs,
      });
    }
  }

  candidates.sort((a, b) => b.mtime - a.mtime);
  const top = candidates.slice(0, MAX_PER_AGENT);

  const out: AiSession[] = [];
  for (const c of top) {
    const { cwd, label } = readClaudeSessionMetadata(c.path);
    if (!cwd) continue;
    out.push({ agent: 'claude', cwd, sessionId: c.sessionId, lastModified: c.mtime, label });
  }
  return out;
}

// ──────── Codex discovery ────────

function findRecentCodexSessions(): AiSession[] {
  if (!existsSync(CODEX_SESSION_INDEX)) return [];
  const cutoff = Date.now() - RECENT_WINDOW_MS;

  let text: string;
  try {
    text = readFileSync(CODEX_SESSION_INDEX, 'utf8');
  } catch {
    return [];
  }

  const out: AiSession[] = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    let obj: { id?: unknown; thread_name?: unknown; updated_at?: unknown };
    try {
      obj = JSON.parse(line) as typeof obj;
    } catch {
      continue;
    }
    if (typeof obj.id !== 'string' || typeof obj.updated_at !== 'string') continue;
    const ts = Date.parse(obj.updated_at);
    if (Number.isNaN(ts) || ts < cutoff) continue;

    const label = typeof obj.thread_name === 'string' ? cleanCodexLabel(obj.thread_name) : null;
    out.push({
      agent: 'codex',
      cwd: null,
      sessionId: obj.id,
      lastModified: ts,
      label,
    });
  }

  out.sort((a, b) => b.lastModified - a.lastModified);
  return out.slice(0, MAX_PER_AGENT);
}

// ──────── Combined discovery + note formatting ────────

export function findRecentAiSessions(): AiSession[] {
  return [...findRecentClaudeSessions(), ...findRecentCodexSessions()];
}

function relativeTime(ms: number): string {
  const diffMin = Math.round((Date.now() - ms) / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.round(diffHr / 24)}d ago`;
}

function resumeCommand(s: AiSession): string {
  if (s.agent === 'claude') {
    const cwd = s.cwd ?? '.';
    return `cd "${cwd}" && claude --resume ${s.sessionId}`;
  }
  // Codex: UUID is portable, no cd needed.
  return `codex resume ${s.sessionId}`;
}

function renderSection(title: string, sessions: AiSession[], lines: string[]): void {
  if (sessions.length === 0) return;
  lines.push(`## ${title}`);
  lines.push('');
  for (let i = 0; i < sessions.length; i++) {
    const s = sessions[i];
    if (!s) continue;
    const when = relativeTime(s.lastModified);
    const heading = s.label
      ? `### ${i + 1}. ${s.label} (${when})`
      : `### Session ${i + 1} — \`${s.cwd ?? 'unknown cwd'}\` (${when})`;
    lines.push(heading);
    lines.push('');
    if (s.label && s.cwd) lines.push(`\`${s.cwd}\``);
    lines.push('');
    lines.push('```bash');
    lines.push(resumeCommand(s));
    lines.push('```');
    lines.push('');
  }
}

export interface ResumeNote {
  filename: string;
  content: string;
}

export function formatResumeNote(
  sessions: AiSession[],
  fromVersion: string,
  toVersion: string,
): ResumeNote {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mn = String(now.getMinutes()).padStart(2, '0');
  const filename = `${yyyy}-${mm}-${dd}-${hh}${mn}-ai-resume.md`;

  const claudeSessions = sessions.filter((s) => s.agent === 'claude');
  const codexSessions = sessions.filter((s) => s.agent === 'codex');

  const lines: string[] = [];
  lines.push('---');
  lines.push('type: inbox-item');
  lines.push(`created: ${yyyy}-${mm}-${dd}T${hh}:${mn}`);
  lines.push('source: workdesk-plugin-update');
  lines.push('---');
  lines.push('');
  lines.push('# Resume AI sessions after reload');
  lines.push('');
  lines.push(
    `Workdesk plugin v${fromVersion} → v${toVersion} update is about to close ` +
    `your terminal panes. Paste any of the commands below into a fresh ` +
    `terminal to pick up where you left off. Sessions are ordered most-recent ` +
    `first within each agent.`,
  );
  lines.push('');

  renderSection('Claude Code', claudeSessions, lines);
  renderSection('Codex CLI', codexSessions, lines);

  return { filename, content: lines.join('\n') };
}
