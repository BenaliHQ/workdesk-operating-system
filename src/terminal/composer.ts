// Composer — DOM textarea below the xterm canvas. Forwards sends to the PTY
// (or any onSend handler). Owns in-session history, auto-grow, send/attach
// buttons, and the meta strip described in design's components.md § Composer.

import { attachComposerKeymap } from './keymap';

const MIN_HEIGHT = 22;
const MAX_HEIGHT = 160;
const PLACEHOLDER = 'Ask Claude — ⌘↵ to send';

export interface ComposerOptions {
  onSend(text: string): void;
  onAttach?(): void;
  metaLeft?: string;
  metaRight?: string;
}

export interface ComposerHandle {
  element: HTMLElement;
  textarea: HTMLTextAreaElement;
  sendButton: HTMLButtonElement;
  attachButton: HTMLButtonElement;
  metaStrip: HTMLElement;
  focus(): void;
  blur(): void;
  setValue(value: string): void;
  getValue(): string;
  dispose(): void;
}

export function mountComposer(parent: HTMLElement, opts: ComposerOptions): ComposerHandle {
  const root = createDiv();
  root.className = 'term-composer';

  const inner = createDiv();
  inner.className = 'composer-inner';
  root.appendChild(inner);

  const shell = createDiv();
  shell.className = 'composer-shell';
  inner.appendChild(shell);

  const promptGlyph = createSpan();
  promptGlyph.className = 'composer-prompt';
  promptGlyph.textContent = '▌';
  shell.appendChild(promptGlyph);

  const textarea = createEl('textarea');
  textarea.className = 'composer-input';
  textarea.placeholder = PLACEHOLDER;
  textarea.rows = 1;
  textarea.style.height = `${MIN_HEIGHT}px`;
  shell.appendChild(textarea);

  const actions = createDiv();
  actions.className = 'composer-actions';
  shell.appendChild(actions);

  const attachButton = createEl('button');
  attachButton.type = 'button';
  attachButton.className = 'composer-icon';
  attachButton.setAttribute('aria-label', 'Attach wikilink');
  attachButton.textContent = '📎';
  actions.appendChild(attachButton);

  const sendButton = createEl('button');
  sendButton.type = 'button';
  sendButton.className = 'composer-send';
  sendButton.setAttribute('aria-label', 'Send');
  sendButton.textContent = '↵';
  actions.appendChild(sendButton);

  const metaStrip = createDiv();
  metaStrip.className = 'composer-meta';
  inner.appendChild(metaStrip);

  const metaL = createSpan();
  metaL.className = 'composer-meta-l';
  metaL.textContent = opts.metaLeft ?? 'opus 4.7';
  metaStrip.appendChild(metaL);

  const metaR = createSpan();
  metaR.className = 'composer-meta-r';
  metaR.textContent = opts.metaRight ?? '⌘↵ send · esc blur';
  metaStrip.appendChild(metaR);

  parent.appendChild(root);

  // History state.
  const history: string[] = [];
  let historyCursor: number | null = null;
  let draftBeforeRecall = '';

  const refreshSendState = (): void => {
    const hasInput = textarea.value.trim().length > 0;
    sendButton.classList.toggle('has-input', hasInput);
    sendButton.disabled = !hasInput;
  };

  const autoGrow = (): void => {
    textarea.style.height = `${MIN_HEIGHT}px`;
    const next = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, textarea.scrollHeight));
    textarea.style.height = `${next}px`;
  };

  const doSend = (): void => {
    const text = textarea.value;
    if (text.trim().length === 0) return;
    opts.onSend(text);
    history.push(text);
    historyCursor = null;
    draftBeforeRecall = '';
    textarea.value = '';
    autoGrow();
    refreshSendState();
  };

  const recallPrev = (): void => {
    if (history.length === 0) return;
    if (historyCursor === null) {
      draftBeforeRecall = textarea.value;
      historyCursor = history.length - 1;
    } else if (historyCursor > 0) {
      historyCursor -= 1;
    }
    textarea.value = history[historyCursor] ?? '';
    autoGrow();
    refreshSendState();
    placeCaretAtEnd(textarea);
  };

  const recallNext = (): void => {
    if (historyCursor === null) return;
    if (historyCursor >= history.length - 1) {
      historyCursor = null;
      textarea.value = draftBeforeRecall;
    } else {
      historyCursor += 1;
      textarea.value = history[historyCursor] ?? '';
    }
    autoGrow();
    refreshSendState();
    placeCaretAtEnd(textarea);
  };

  const detachKeymap = attachComposerKeymap(textarea, {
    send: doSend,
    historyPrev: recallPrev,
    historyNext: recallNext,
    blur: () => textarea.blur(),
  });

  textarea.addEventListener('input', () => {
    historyCursor = null;
    autoGrow();
    refreshSendState();
  });

  const onSendClick = (): void => {
    doSend();
    textarea.focus();
  };
  const onAttachClick = (): void => {
    if (opts.onAttach) {
      opts.onAttach();
    } else {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      textarea.value = `${textarea.value.slice(0, start)}[[${textarea.value.slice(end)}`;
      textarea.selectionStart = textarea.selectionEnd = start + 2;
      textarea.focus();
      autoGrow();
      refreshSendState();
    }
  };

  sendButton.addEventListener('click', onSendClick);
  attachButton.addEventListener('click', onAttachClick);

  refreshSendState();

  return {
    element: root,
    textarea,
    sendButton,
    attachButton,
    metaStrip,
    focus: () => textarea.focus(),
    blur: () => textarea.blur(),
    setValue: (v: string) => {
      textarea.value = v;
      autoGrow();
      refreshSendState();
    },
    getValue: () => textarea.value,
    dispose: () => {
      detachKeymap();
      sendButton.removeEventListener('click', onSendClick);
      attachButton.removeEventListener('click', onAttachClick);
      root.remove();
    },
  };
}

function placeCaretAtEnd(t: HTMLTextAreaElement): void {
  const end = t.value.length;
  t.selectionStart = t.selectionEnd = end;
}
