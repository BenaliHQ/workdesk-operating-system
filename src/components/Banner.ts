// Banner — persistent inline notice with optional action buttons.
//
// CSS lives in app.css (.banner.error / .warning / .info). This component
// owns the markup + behavior; callers mount the returned element and call
// `dismiss()` (or remove the element directly) when the cause clears.

export type BannerSeverity = 'error' | 'warning' | 'info';

export interface BannerAction {
  label: string;
  onClick: () => void;
}

export interface BannerOptions {
  severity?: BannerSeverity;
  glyph?: string;
  message: string;
  actions?: BannerAction[];
  dismissible?: boolean;
}

export interface BannerHandle {
  element: HTMLElement;
  setMessage(message: string): void;
  dismiss(): void;
}

export function renderBanner(host: HTMLElement, opts: BannerOptions): BannerHandle {
  const el = document.createElement('div');
  const severity = opts.severity ?? 'info';
  el.className = `banner ${severity}`;
  el.setAttribute('role', severity === 'error' ? 'alert' : 'status');

  const glyph = document.createElement('span');
  glyph.className = 'glyph';
  glyph.setAttribute('aria-hidden', 'true');
  glyph.textContent = opts.glyph ?? (severity === 'error' ? '!' : severity === 'warning' ? '△' : 'ℹ');
  el.appendChild(glyph);

  const body = document.createElement('div');
  body.className = 'body';
  body.textContent = opts.message;
  el.appendChild(body);

  if (opts.actions && opts.actions.length) {
    const actions = document.createElement('div');
    actions.className = 'actions';
    for (const action of opts.actions) {
      const btn = document.createElement('button');
      btn.textContent = action.label;
      btn.addEventListener('click', action.onClick);
      actions.appendChild(btn);
    }
    el.appendChild(actions);
  }

  if (opts.dismissible) {
    const close = document.createElement('button');
    close.className = 'banner-close';
    close.setAttribute('aria-label', 'Dismiss banner');
    close.textContent = '×';
    close.addEventListener('click', () => el.remove());
    el.appendChild(close);
  }

  host.appendChild(el);

  return {
    element: el,
    setMessage(message: string) {
      body.textContent = message;
    },
    dismiss() {
      el.remove();
    },
  };
}
