// Generic context menu (`.ws-popover`).
//
// `showContextMenu(x, y, items)` renders a fixed-position popover at the
// coordinates, auto-flipping if it would overflow the viewport. Closes on
// outside click or Esc. Each item runs its `act` callback then dismisses.

export type MenuItem =
  | { divider: true }
  | { label: string }
  | {
      icon?: string;
      text: string;
      kbd?: string;
      danger?: boolean;
      act: () => void;
    };

export interface ContextMenuHandle {
  element: HTMLElement;
  close(): void;
}

let activeMenu: ContextMenuHandle | null = null;

export function showContextMenu(x: number, y: number, items: MenuItem[]): ContextMenuHandle {
  if (activeMenu) activeMenu.close();

  const menu = document.createElement('div');
  menu.className = 'ws-popover';
  menu.setAttribute('role', 'menu');
  menu.style.position = 'fixed';
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;

  for (const item of items) {
    menu.appendChild(renderItem(item, () => close()));
  }

  document.body.appendChild(menu);

  // Flip if overflowing the viewport.
  const rect = menu.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (rect.right > vw) menu.style.left = `${Math.max(8, x - rect.width)}px`;
  if (rect.bottom > vh) menu.style.top = `${Math.max(8, y - rect.height)}px`;

  const onDocClick = (evt: MouseEvent) => {
    if (!menu.contains(evt.target as Node)) close();
  };
  const onKey = (evt: KeyboardEvent) => {
    if (evt.key === 'Escape') {
      evt.stopPropagation();
      close();
    }
  };
  // Defer so the click that opened the menu doesn't immediately close it.
  window.setTimeout(() => {
    document.addEventListener('mousedown', onDocClick, true);
    document.addEventListener('keydown', onKey, true);
  }, 0);

  function close(): void {
    document.removeEventListener('mousedown', onDocClick, true);
    document.removeEventListener('keydown', onKey, true);
    menu.remove();
    if (activeMenu?.element === menu) activeMenu = null;
  }

  const handle: ContextMenuHandle = { element: menu, close };
  activeMenu = handle;
  return handle;
}

function renderItem(item: MenuItem, dismiss: () => void): HTMLElement {
  if ('divider' in item) {
    const d = document.createElement('div');
    d.className = 'ws-popover-divider';
    return d;
  }
  if (!('text' in item) && 'label' in item) {
    const label = document.createElement('div');
    label.className = 'ws-popover-label';
    label.textContent = item.label;
    return label;
  }
  const it = item as Exclude<MenuItem, { divider: true } | { label: string }>;
  const row = document.createElement('button');
  row.type = 'button';
  row.className = 'ws-popover-item';
  row.setAttribute('role', 'menuitem');
  if (it.danger) row.classList.add('danger');

  const glyph = document.createElement('span');
  glyph.className = 'glyph';
  glyph.setAttribute('aria-hidden', 'true');
  glyph.textContent = it.icon ?? '';
  row.appendChild(glyph);

  const text = document.createElement('span');
  text.textContent = it.text;
  row.appendChild(text);

  if (it.kbd) {
    const k = document.createElement('span');
    k.className = 'kbd-hint';
    k.textContent = it.kbd;
    row.appendChild(k);
  }

  row.addEventListener('click', () => {
    it.act();
    dismiss();
  });
  return row;
}

export interface MenuTarget {
  filePath?: string;
  fileBasename?: string;
  folderPath?: string;
  wikilinkTarget?: string;
  terminalTabId?: number;
}

export function fileMenuItems(target: MenuTarget, handlers: {
  rename?: () => void;
  duplicate?: () => void;
  reveal?: () => void;
  copyWikilink?: () => void;
  copyMarkdownLink?: () => void;
  delete?: () => void;
}): MenuItem[] {
  const items: MenuItem[] = [];
  if (handlers.rename) items.push({ text: 'Rename…', kbd: 'F2', act: handlers.rename });
  if (handlers.duplicate) items.push({ text: 'Duplicate', act: handlers.duplicate });
  if (handlers.reveal) items.push({ text: 'Reveal in Finder', act: handlers.reveal });
  items.push({ divider: true });
  if (handlers.copyWikilink) items.push({ text: 'Copy wikilink', act: handlers.copyWikilink });
  if (handlers.copyMarkdownLink) items.push({ text: 'Copy markdown link', act: handlers.copyMarkdownLink });
  items.push({ divider: true });
  if (handlers.delete) {
    items.push({ text: `Delete ${target.fileBasename ?? 'file'}`, danger: true, act: handlers.delete });
  }
  return items;
}

export function folderMenuItems(handlers: {
  newNote?: () => void;
  newFolder?: () => void;
  rename?: () => void;
  reveal?: () => void;
  delete?: () => void;
}): MenuItem[] {
  const items: MenuItem[] = [];
  if (handlers.newNote) items.push({ text: 'New note here', act: handlers.newNote });
  if (handlers.newFolder) items.push({ text: 'New folder', act: handlers.newFolder });
  items.push({ divider: true });
  if (handlers.rename) items.push({ text: 'Rename…', kbd: 'F2', act: handlers.rename });
  if (handlers.reveal) items.push({ text: 'Reveal in Finder', act: handlers.reveal });
  items.push({ divider: true });
  if (handlers.delete) items.push({ text: 'Delete folder', danger: true, act: handlers.delete });
  return items;
}

export function wikilinkMenuItems(target: string, handlers: {
  open?: () => void;
  openInNewPane?: () => void;
  copyText?: () => void;
  renameTarget?: () => void;
  unlink?: () => void;
}): MenuItem[] {
  const items: MenuItem[] = [{ label: target }];
  if (handlers.open) items.push({ text: 'Open', act: handlers.open });
  if (handlers.openInNewPane) items.push({ text: 'Open in new pane', act: handlers.openInNewPane });
  items.push({ divider: true });
  if (handlers.copyText) items.push({ text: 'Copy link text', act: handlers.copyText });
  if (handlers.renameTarget) items.push({ text: 'Rename target…', act: handlers.renameTarget });
  items.push({ divider: true });
  if (handlers.unlink) items.push({ text: 'Unlink', danger: true, act: handlers.unlink });
  return items;
}

export function terminalTabMenuItems(handlers: {
  rename?: () => void;
  exportTranscript?: () => void;
  endSession?: () => void;
}): MenuItem[] {
  const items: MenuItem[] = [];
  if (handlers.rename) items.push({ text: 'Rename tab', kbd: 'F2', act: handlers.rename });
  if (handlers.exportTranscript) items.push({ text: 'Export transcript…', act: handlers.exportTranscript });
  items.push({ divider: true });
  if (handlers.endSession) items.push({ text: 'End session', danger: true, act: handlers.endSession });
  return items;
}
