// Status parser — folds an xterm onData chunk into a tab status transition.
//
// Markers come from Claude Code's output conventions (see design's
// components.md § Tab status). `●` opens a tool call, `⎿` closes it, and
// any `Error:` / `✗` token raises an error state.

export type TabStatus = 'idle' | 'working' | 'done' | 'waiting' | 'error';

const ERROR_RE = /Error:|✗|\bFAIL(ED)?\b/;
const WAITING_RE = /\(y\/n\)\??|\[Y\/N\]/i;

export function parseStatusFromChunk(chunk: string, current: TabStatus): TabStatus {
  if (ERROR_RE.test(chunk)) return 'error';
  if (chunk.includes('●') && !chunk.includes('⎿')) return 'working';
  if (chunk.includes('⎿')) return 'done';
  if (WAITING_RE.test(chunk)) return 'waiting';
  return current;
}

// Reducer for a running buffer. Useful for stitching cross-chunk markers
// when `●` and `⎿` arrive in separate writes.
export function reduceStatus(chunks: readonly string[], initial: TabStatus = 'idle'): TabStatus {
  let s = initial;
  for (const c of chunks) s = parseStatusFromChunk(c, s);
  return s;
}
