// Skeleton + Spinner — loading affordances.
//
// CSS lives in app.css (.skeleton, .skel-row, .skel-obj-card, .spinner).
// Mount via `renderObjCardSkeletons` / `renderRowSkeletons` / `renderSpinner`.

export function renderObjCardSkeleton(): HTMLElement {
  const el = createDiv();
  el.className = 'skel-obj-card skeleton';
  el.setAttribute('aria-hidden', 'true');
  return el;
}

export function renderRowSkeleton(): HTMLElement {
  const el = createDiv();
  el.className = 'skel-row skeleton';
  el.setAttribute('aria-hidden', 'true');
  return el;
}

export function renderObjCardSkeletons(host: HTMLElement, count: number): HTMLElement[] {
  const out: HTMLElement[] = [];
  for (let i = 0; i < count; i++) {
    const el = renderObjCardSkeleton();
    host.appendChild(el);
    out.push(el);
  }
  return out;
}

export function renderRowSkeletons(host: HTMLElement, count: number): HTMLElement[] {
  const out: HTMLElement[] = [];
  for (let i = 0; i < count; i++) {
    const el = renderRowSkeleton();
    host.appendChild(el);
    out.push(el);
  }
  return out;
}

export function renderSpinner(): HTMLElement {
  const el = createSpan();
  el.className = 'spinner';
  el.setAttribute('role', 'progressbar');
  el.setAttribute('aria-label', 'Loading');
  return el;
}
