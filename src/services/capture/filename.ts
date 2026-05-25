// Capture filename + frontmatter helpers.
//
// Filename pattern: `{YYYY.MM.DD} Capture - {first sentence}`
// (matches the captures practice declared in WorkDesk OS — see
// config/practices/captures.md in the distribution).
//
// The first-sentence title preserves case and punctuation so the file tree
// reads like prose. Filesystem-unsafe characters are stripped, and the title
// is capped at 80 chars so long ramblings don't blow out the filename.
//
// Frontmatter retains `transcribed-at`, `provider`, and `model` so each
// capture self-documents which STT pass produced it.

const FILESYSTEM_UNSAFE = /[/\\:*?"<>|]/g;
const MAX_TITLE_LEN = 80;

/** YYYY.MM.DD using the local date (matches the daily-note convention). */
export function dotDate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}.${m}.${d}`;
}

/** ISO timestamp for frontmatter and log lines: `2026-05-13T11:02:14Z`. */
export function isoTimestampForLog(date: Date = new Date()): string {
  return date.toISOString().replace(/\.\d+Z$/, 'Z');
}

/** Extracts a human-readable title from the transcript: the first sentence
 *  (split on `.`, `!`, `?`), capped at 80 chars, with filesystem-unsafe
 *  characters stripped. Falls back to "Capture" on empty input. */
export function firstSentenceTitle(transcript: string, maxLen = MAX_TITLE_LEN): string {
  const normalized = transcript.trim().replace(/\s+/g, ' ');
  if (!normalized) return 'Capture';

  const sentenceMatch = normalized.match(/^.+?[.!?](?=\s|$)/);
  let title = sentenceMatch ? sentenceMatch[0] : normalized;

  if (title.length > maxLen) {
    title = title.slice(0, maxLen).replace(/[\s,;:.!?-]+$/, '');
  }

  title = title.replace(FILESYSTEM_UNSAFE, '').trim();
  return title || 'Capture';
}

/** Full filename (no extension): `2026.05.13 Capture - First sentence here`. */
export function captureFilename(transcript: string, date: Date = new Date()): string {
  return `${dotDate(date)} Capture - ${firstSentenceTitle(transcript)}`;
}

/** Single-line entry for `system/log.md` so every capture has an audit trail. */
export function logLine(transcript: string, date: Date = new Date()): string {
  const trimmed = transcript.trim().replace(/\s+/g, ' ');
  const head = trimmed.length > 64 ? `${trimmed.slice(0, 64).trimEnd()}…` : trimmed;
  return `${isoTimestampForLog(date)} capture: ${head}`;
}

export function captureFrontmatter(opts: {
  transcribedAt: string;
  sourceKind?: string;
  provider?: string;
  model?: string;
}): string {
  const provider = opts.provider ? `provider: ${opts.provider}\n` : '';
  const model = opts.model ? `model: ${opts.model}\n` : '';
  return [
    '---',
    'type: capture',
    `source-kind: ${opts.sourceKind ?? 'voice-memo'}`,
    `transcribed-at: ${opts.transcribedAt}`,
    `${provider}${model}---`,
    '',
  ].join('\n');
}

export function captureNoteContents(transcript: string, opts: { provider?: string; model?: string; now?: Date }): string {
  const now = opts.now ?? new Date();
  const fm = captureFrontmatter({
    transcribedAt: isoTimestampForLog(now),
    provider: opts.provider,
    model: opts.model,
  });
  return `${fm}\n${transcript.trim()}\n`;
}
