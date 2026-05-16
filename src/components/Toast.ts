// Toast — bottom-right notification stack.
//
// Fire via `window.showToast(message, severity, opts)`. Loading toasts are
// sticky (manual clear via opts.id + clearToast); the rest auto-dismiss after
// `opts.duration` ms (default 4000). The stack is column-reverse so newer
// toasts push older ones up — older toasts visually fall off the bottom.

export type ToastSeverity = 'success' | 'error' | 'info' | 'loading';

export interface ToastOptions {
  title?: string;
  sub?: string;
  /** Milliseconds before auto-dismiss. 0 (default for loading) = sticky. */
  duration?: number;
  /** Stable id for sticky toasts so they can be cleared via clearToast. */
  id?: string;
}

const STACK_CLASS = 'toast-stack';
const DEFAULT_DURATION = 4000;
const stickyById = new Map<string, HTMLElement>();

function ensureStack(): HTMLElement {
  let stack = activeDocument.querySelector<HTMLElement>(`.${STACK_CLASS}`);
  if (!stack) {
    stack = createDiv();
    stack.className = STACK_CLASS;
    activeDocument.body.appendChild(stack);
  }
  return stack;
}

export function showToast(
  message: string,
  severity: ToastSeverity = 'info',
  opts: ToastOptions = {},
): HTMLElement {
  if (opts.id) {
    const existing = stickyById.get(opts.id);
    if (existing) existing.remove();
  }

  const stack = ensureStack();
  const toast = createDiv();
  toast.className = `toast ${severity}`;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  if (opts.id) toast.dataset.id = opts.id;

  const glyph = createSpan();
  glyph.className = 'glyph';
  glyph.setAttribute('aria-hidden', 'true');
  glyph.textContent = severity === 'success' ? '✓' : severity === 'error' ? '!' : severity === 'loading' ? '◐' : 'ℹ';
  toast.appendChild(glyph);

  const body = createSpan();
  body.className = 'body';
  if (opts.title) {
    const t = createEl('strong');
    t.textContent = opts.title;
    body.appendChild(t);
    const m = createSpan();
    m.textContent = message;
    body.appendChild(m);
  } else {
    body.textContent = message;
  }
  if (opts.sub) {
    const sub = createSpan();
    sub.className = 'sub';
    sub.textContent = opts.sub;
    body.appendChild(sub);
  }
  toast.appendChild(body);

  const close = createEl('button');
  close.className = 'close';
  close.setAttribute('aria-label', 'Dismiss');
  close.textContent = '×';
  close.addEventListener('click', () => dismissToast(toast));
  toast.appendChild(close);

  stack.appendChild(toast);

  const sticky = severity === 'loading' || opts.duration === 0 || (opts.id && opts.duration === undefined);
  if (!sticky) {
    const ms = opts.duration ?? DEFAULT_DURATION;
    window.setTimeout(() => dismissToast(toast), ms);
  }
  if (opts.id) stickyById.set(opts.id, toast);

  return toast;
}

export function dismissToast(toast: HTMLElement): void {
  if (!toast.isConnected) return;
  const id = toast.dataset.id;
  if (id) stickyById.delete(id);
  toast.classList.add('leaving');
  window.setTimeout(() => {
    toast.remove();
  }, 220);
}

export function clearToast(id: string): void {
  const t = stickyById.get(id);
  if (t) dismissToast(t);
}

export function installGlobalToast(): void {
  const w = window as unknown as { showToast?: typeof showToast; clearToast?: typeof clearToast };
  w.showToast = showToast;
  w.clearToast = clearToast;
}
