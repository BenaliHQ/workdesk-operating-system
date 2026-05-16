// Editor breadcrumb — renders above Obsidian's editor view.
// Shows the active file's path with "/" separators; each segment is a span
// so future revisions can wire per-segment click handlers.

export interface BreadcrumbOpts {
  filePath: string;
  onSegmentClick?: (path: string) => void;
}

export function renderBreadcrumb(opts: BreadcrumbOpts): HTMLElement {
  const el = createDiv();
  el.className = 'breadcrumb';
  el.setAttribute('role', 'navigation');
  el.setAttribute('aria-label', 'File path');

  const parts = opts.filePath.split('/').filter(Boolean);
  parts.forEach((seg, i) => {
    const span = createSpan();
    span.className = 'bc-seg';
    if (i === parts.length - 1) span.classList.add('bc-active');
    span.textContent = seg;
    const subPath = parts.slice(0, i + 1).join('/');
    span.dataset.path = subPath;
    span.addEventListener('click', () => opts.onSegmentClick?.(subPath));
    el.appendChild(span);

    if (i < parts.length - 1) {
      const sep = createSpan();
      sep.className = 'bc-sep';
      sep.textContent = '/';
      el.appendChild(sep);
    }
  });

  return el;
}
