// Composer keymap.
//
// Enter or ⌘↵ → send; Shift+Enter → newline (default); ↑/↓ → history walk;
// Esc → blur. History walk is gated on caret position so a multi-line draft
// doesn't get clobbered when the user is just navigating within their text.

export interface KeymapHandlers {
  send(): void;
  historyPrev(): void;
  historyNext(): void;
  blur(): void;
}

export function attachComposerKeymap(
  textarea: HTMLTextAreaElement,
  handlers: KeymapHandlers,
): () => void {
  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Enter') {
      if (e.shiftKey) return;
      e.preventDefault();
      handlers.send();
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      handlers.blur();
      return;
    }
    if (e.key === 'ArrowUp' && atFirstLine(textarea)) {
      e.preventDefault();
      handlers.historyPrev();
      return;
    }
    if (e.key === 'ArrowDown' && atLastLine(textarea)) {
      e.preventDefault();
      handlers.historyNext();
      return;
    }
  };

  textarea.addEventListener('keydown', onKeyDown);
  return () => textarea.removeEventListener('keydown', onKeyDown);
}

function atFirstLine(t: HTMLTextAreaElement): boolean {
  const before = t.value.slice(0, t.selectionStart);
  return !before.includes('\n');
}

function atLastLine(t: HTMLTextAreaElement): boolean {
  const after = t.value.slice(t.selectionEnd);
  return !after.includes('\n');
}
