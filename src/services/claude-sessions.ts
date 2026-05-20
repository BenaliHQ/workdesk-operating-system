// Discover recent Claude Code sessions on disk and format resume commands.
//
// Claude Code stores each conversation at
//   ~/.claude/projects/<encoded-cwd>/<session-id>.jsonl
//
// The directory-name encoding (`/` → `-`) is lossy when the cwd itself
// contains `-`, so we read the cwd out of the file's header instead: line
// 1 onward carries a `cwd` field in the JSON envelope. We sort sessions by
// mtime and read cwd only for the top N so the discovery pass stays cheap
// even on machines with hundreds of historical sessions.

import { existsSync, openSync, readSync, closeSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const CLAUDE_PROJECTS_DIR = join(homedir(), '.claude', 'projects');
const MAX_SESSIONS = 8;
const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h
const HEADER_READ_BYTES = 256 * 1024; // 256KB — enough to reach `aiTitle` in typical sessions
const LABEL_MAX_LEN = 80;

export interface ClaudeSession {
  /** Absolute working directory where the session was active. */
  cwd: string;
  /** Session UUID, used as `claude --resume <id>`. */
  sessionId: string;
  /** Epoch ms of the session file's last modification. */
  lastModified: number;
  /** Human-readable label: `aiTitle` if present, else first user message,
   *  else null. Truncated to LABEL_MAX_LEN. */
  label: string | null;
}

interface SessionMetadata {
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

function cleanLabel(raw: string): string {
  // Strip code-block markers, collapse whitespace, truncate.
  const flat = raw.replace(/\s+/g, ' ').trim();
  if (flat.length <= LABEL_MAX_LEN) return flat;
  return flat.slice(0, LABEL_MAX_LEN - 1).trimEnd() + '…';
}

function readSessionMetadata(filePath: string): SessionMetadata {
  let fd: number;
  try {
    fd = openSync(filePath, 'r');
  } catch {
    return { cwd: null, label: null };
  }
  try {
    const buf = Buffer.alloc(HEADER_READ_BYTES);
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
        // Incomplete trailing line — append-only file; just stop reading
        // partial JSON and use what we already have.
        continue;
      }

      if (!cwd && typeof obj.cwd === 'string' && obj.cwd) cwd = obj.cwd;
      if (!aiTitle && typeof obj.aiTitle === 'string' && obj.aiTitle) aiTitle = obj.aiTitle;
      if (!firstUserText && obj.type === 'user') {
        const t = extractTextFromMessage(obj.message);
        if (t) firstUserText = t;
      }

      // aiTitle is the best label and lands after a few turns; once we have
      // it plus cwd, stop scanning.
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

export function findRecentClaudeSessions(): ClaudeSession[] {
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
  const top = candidates.slice(0, MAX_SESSIONS);

  const out: ClaudeSession[] = [];
  for (const c of top) {
    const { cwd, label } = readSessionMetadata(c.path);
    if (!cwd) continue;
    out.push({ cwd, sessionId: c.sessionId, lastModified: c.mtime, label });
  }
  return out;
}

function relativeTime(ms: number): string {
  const diffMin = Math.round((Date.now() - ms) / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.round(diffHr / 24)}d ago`;
}

export interface ResumeNote {
  filename: string;
  content: string;
}

export function formatResumeNote(
  sessions: ClaudeSession[],
  fromVersion: string,
  toVersion: string,
): ResumeNote {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mn = String(now.getMinutes()).padStart(2, '0');
  const filename = `${yyyy}-${mm}-${dd}-${hh}${mn}-claude-resume.md`;

  const lines: string[] = [];
  lines.push('---');
  lines.push('type: inbox-item');
  lines.push(`created: ${yyyy}-${mm}-${dd}T${hh}:${mn}`);
  lines.push('source: workdesk-plugin-update');
  lines.push('---');
  lines.push('');
  lines.push('# Resume Claude Code sessions after reload');
  lines.push('');
  lines.push(
    `Workdesk plugin v${fromVersion} → v${toVersion} update is about to close ` +
    `your terminal panes. Paste any of the commands below into a fresh terminal ` +
    `to pick up where you left off. Sessions are ordered most-recent first.`,
  );
  lines.push('');

  for (let i = 0; i < sessions.length; i++) {
    const s = sessions[i];
    if (!s) continue;
    const when = relativeTime(s.lastModified);
    const heading = s.label
      ? `## ${i + 1}. ${s.label} (${when})`
      : `## Session ${i + 1} — \`${s.cwd}\` (${when})`;
    lines.push(heading);
    lines.push('');
    if (s.label) lines.push(`\`${s.cwd}\``);
    lines.push('');
    lines.push('```bash');
    lines.push(`cd "${s.cwd}" && claude --resume ${s.sessionId}`);
    lines.push('```');
    lines.push('');
  }

  return { filename, content: lines.join('\n') };
}
