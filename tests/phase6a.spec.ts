import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { showToast, clearToast, installGlobalToast } from '../src/components/Toast';
import { renderBanner } from '../src/components/Banner';
import {
  renderObjCardSkeleton,
  renderRowSkeleton,
  renderSpinner,
  renderObjCardSkeletons,
  renderRowSkeletons,
} from '../src/components/Skeleton';
import {
  showContextMenu,
  fileMenuItems,
  folderMenuItems,
  wikilinkMenuItems,
  terminalTabMenuItems,
} from '../src/components/ContextMenu';
import { attachEditorDragHover } from '../src/components/DragDropHover';
import { renderTreeRow } from '../src/components/TreeRow';
import { mountTabStrip } from '../src/terminal/tabs';

beforeEach(() => {
  document.body.innerHTML = '';
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('phase 6a · toast stack', () => {
  it('appends a .toast.success to .toast-stack and auto-dismisses', () => {
    const t = showToast('saved', 'success');
    const stack = document.querySelector('.toast-stack');
    expect(stack).not.toBeNull();
    expect(stack?.contains(t)).toBe(true);
    expect(t.classList.contains('success')).toBe(true);
    expect(t.getAttribute('role')).toBe('status');
    vi.advanceTimersByTime(4000);
    vi.advanceTimersByTime(300);
    expect(document.querySelector('.toast.success')).toBeNull();
  });

  it('loading toast is sticky until clearToast', () => {
    const t = showToast('Transcribing…', 'loading', { id: 'stt-1' });
    expect(t.classList.contains('loading')).toBe(true);
    vi.advanceTimersByTime(10_000);
    expect(document.contains(t)).toBe(true);
    clearToast('stt-1');
    vi.advanceTimersByTime(300);
    expect(document.querySelector('[data-id="stt-1"]')).toBeNull();
  });

  it('installGlobalToast attaches window.showToast', () => {
    installGlobalToast();
    expect(typeof (window as unknown as { showToast: unknown }).showToast).toBe('function');
  });
});

describe('phase 6a · banner', () => {
  it('renders .banner.error with action button + role=alert', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    let restartCount = 0;
    renderBanner(host, {
      severity: 'error',
      message: 'Terminal disconnected',
      actions: [{ label: 'Restart', onClick: () => restartCount++ }],
    });
    const banner = host.querySelector('.banner.error');
    expect(banner).not.toBeNull();
    expect(banner?.getAttribute('role')).toBe('alert');
    const btn = banner?.querySelector('.actions button');
    (btn as HTMLButtonElement).click();
    expect(restartCount).toBe(1);
  });
});

describe('phase 6a · skeleton + spinner', () => {
  it('renders skel-obj-card / skel-row / spinner with required classes', () => {
    const obj = renderObjCardSkeleton();
    const row = renderRowSkeleton();
    const spinner = renderSpinner();
    expect(obj.classList.contains('skel-obj-card')).toBe(true);
    expect(obj.classList.contains('skeleton')).toBe(true);
    expect(row.classList.contains('skel-row')).toBe(true);
    expect(spinner.classList.contains('spinner')).toBe(true);
    expect(spinner.getAttribute('role')).toBe('progressbar');
  });

  it('batch helpers append N skeletons to host', () => {
    const host = document.createElement('div');
    renderObjCardSkeletons(host, 5);
    expect(host.querySelectorAll('.skel-obj-card').length).toBe(5);
    renderRowSkeletons(host, 8);
    expect(host.querySelectorAll('.skel-row').length).toBe(8);
  });
});

describe('phase 6a · context menu', () => {
  it('opens at viewport coords and closes on outside click', () => {
    const handle = showContextMenu(120, 200, [{ text: 'Rename', act: () => {} }]);
    expect(handle.element.classList.contains('ws-popover')).toBe(true);
    // Position is conveyed via CSS variables (consumed by .workdesk-context-menu
    // rule) rather than inline left/top, so the menu can be themed and reused
    // without static style assignment. See styles/obsidian-scope.css.
    expect(handle.element.style.getPropertyValue('--wd-x')).toBe('120px');
    expect(handle.element.style.getPropertyValue('--wd-y')).toBe('200px');
    expect(document.querySelector('.ws-popover')).toBe(handle.element);

    vi.advanceTimersByTime(10);
    document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    expect(document.querySelector('.ws-popover')).toBeNull();
  });

  it('item click runs callback then dismisses', () => {
    let renamed = 0;
    const handle = showContextMenu(50, 50, [
      { text: 'Rename', act: () => renamed++ },
      { divider: true },
      { text: 'Delete', danger: true, act: () => {} },
    ]);
    vi.advanceTimersByTime(10);
    const item = handle.element.querySelector('.ws-popover-item') as HTMLButtonElement;
    item.click();
    expect(renamed).toBe(1);
    expect(document.querySelector('.ws-popover')).toBeNull();
  });

  it('Esc closes the menu', () => {
    const handle = showContextMenu(0, 0, [{ text: 'one', act: () => {} }]);
    vi.advanceTimersByTime(10);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.contains(handle.element)).toBe(false);
  });

  it('file menu set contains rename, copy wikilink, delete', () => {
    const items = fileMenuItems({ filePath: 'a.md', fileBasename: 'a.md' }, {
      rename: () => {},
      duplicate: () => {},
      copyWikilink: () => {},
      delete: () => {},
    });
    const texts = items.filter((i) => 'text' in i).map((i) => (i as { text: string }).text);
    expect(texts).toContain('Rename…');
    expect(texts).toContain('Copy wikilink');
    expect(texts.some((t) => t.startsWith('Delete'))).toBe(true);
  });

  it('folder, wikilink, terminal-tab menu sets honor the design contract', () => {
    expect(
      folderMenuItems({ newNote: () => {}, newFolder: () => {} })
        .filter((i) => 'text' in i)
        .map((i) => (i as { text: string }).text),
    ).toContain('New note here');

    const wlItems = wikilinkMenuItems('target-note', { open: () => {}, unlink: () => {} });
    expect((wlItems[0] as { label?: string }).label).toBe('target-note');

    const tabItems = terminalTabMenuItems({ rename: () => {}, endSession: () => {} });
    expect(tabItems.filter((i) => 'text' in i).map((i) => (i as { text: string }).text)).toContain('Rename tab');
  });
});

describe('phase 6a · drag-drop hover', () => {
  it('adds .dragging-over on dragenter and removes on drop', () => {
    const pane = document.createElement('div');
    pane.className = 'editor-pane';
    document.body.appendChild(pane);
    let droppedPath = '';
    attachEditorDragHover(pane, { onPathDropped: (p) => (droppedPath = p) });

    pane.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true }));
    expect(pane.classList.contains('dragging-over')).toBe(true);

    const drop = new DragEvent('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(drop, 'dataTransfer', {
      value: { getData: () => '/vault/atlas/people/jane.md', files: [] },
    });
    pane.dispatchEvent(drop);

    expect(pane.classList.contains('dragging-over')).toBe(false);
    expect(droppedPath).toBe('/vault/atlas/people/jane.md');
  });
});

describe('phase 6a · tree row right-click opens menu', () => {
  it('renders fileMenuItems for a file row', () => {
    const row = renderTreeRow({
      node: { type: 'file', name: 'note.md', depth: 2 },
      pathPrefix: 'atlas/people',
    });
    document.body.appendChild(row);
    const evt = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 100, clientY: 100 });
    row.dispatchEvent(evt);
    const menu = document.querySelector('.ws-popover');
    expect(menu).not.toBeNull();
    expect(menu?.textContent).toContain('Rename');
    expect(menu?.textContent).toContain('Delete');
  });

  it('renders folderMenuItems for a folder row', () => {
    const row = renderTreeRow({
      node: { type: 'folder', name: 'people', depth: 1, expanded: false, count: 12 },
      pathPrefix: 'atlas',
    });
    document.body.appendChild(row);
    row.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    const menu = document.querySelector('.ws-popover');
    expect(menu?.textContent).toContain('New note here');
    expect(menu?.textContent).toContain('Delete folder');
  });
});

describe('phase 6a · terminal tab right-click', () => {
  it('opens terminal tab context menu on right-click', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const strip = mountTabStrip(root, {
      onActivate: () => {},
      onClose: () => {},
      onNew: () => {},
    });
    const tab = strip.addTab({ id: 1, name: 'claude', status: 'idle' });
    tab.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    const menu = document.querySelector('.ws-popover');
    expect(menu?.textContent).toContain('Rename tab');
    expect(menu?.textContent).toContain('End session');
  });
});

describe('phase 6a · styles.css ships the polish CSS', () => {
  // Sanity check: the bundle wires app.css so .toast / .ws-popover / .skeleton rules ship.
  // (Build is asserted in verify.mjs; this spec only documents what the polish gate covers.)
  it('document API surface is wired (no spec assertions here — see verify gate)', () => {
    expect(typeof showToast).toBe('function');
    expect(typeof showContextMenu).toBe('function');
  });
});
