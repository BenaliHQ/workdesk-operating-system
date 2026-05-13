// Capture filename + slug helpers.
//
// `{timestamp}-{slug}` where slug is up to the first six words of the
// transcript, lower-cased, ASCII-only, non-word runs collapsed to single
// hyphens. Empty or pure-noise transcripts fall back to "capture".

export function isoTimestampForFilename(date: Date = new Date()): string {
  // ISO with `:` and `.` stripped so the filename is portable.
  // e.g. 2026-05-13T11-02-14Z
  return date.toISOString().replace(/\.\d+Z$/, 'Z').replace(/:/g, '-');
}

export function isoTimestampForLog(date: Date = new Date()): string {
  // Standard ISO with milliseconds dropped for the log line.
  return date.toISOString().replace(/\.\d+Z$/, 'Z');
}

export function firstWordsSlug(transcript: string, maxWords = 6): string {
  const normalized = transcript
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '');
  const tokens = normalized.match(/[a-z0-9]+/g) ?? [];
  const slug = tokens.slice(0, maxWords).join('-').replace(/-+/g, '-');
  return slug.length > 0 ? slug : 'capture';
}

export function captureFilename(transcript: string, date: Date = new Date()): string {
  return `${isoTimestampForFilename(date)}-${firstWordsSlug(transcript)}`;
}

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
