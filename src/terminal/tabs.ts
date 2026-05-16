// Tab strip above the terminal canvas. Each .term-tab carries data-status
// and data-tab. Click → switch; × → close; + → new; double-click → rename.

import { showContextMenu, terminalTabMenuItems } from '../components/ContextMenu';
import type { TabStatus } from './status-parser';

export interface TabDescriptor {
  id: number;
  name: string;
  status: TabStatus;
}

export interface TabStripOptions {
  onActivate(id: number): void;
  onClose(id: number): void;
  onNew(): void;
  onRename?(id: number, name: string): void;
  onExportTranscript?(id: number): void;
}

export interface TabStripHandle {
  element: HTMLElement;
  addTab(tab: TabDescriptor): HTMLElement;
  removeTab(id: number): void;
  setStatus(id: number, status: TabStatus): void;
  setActive(id: number): void;
  rename(id: number, name: string): void;
  list(): TabDescriptor[];
  dispose(): void;
}

export function mountTabStrip(parent: HTMLElement, opts: TabStripOptions): TabStripHandle {
  const root = activeDocument.createDiv();
  root.className = 'term-tabs';
  parent.appendChild(root);

  interface TabEntry { desc: TabDescriptor; el: HTMLButtonElement }
  const tabs = new Map<number, TabEntry>();
  let activeId: number | null = null;

  const newButton = activeDocument.createEl('button');
  newButton.type = 'button';
  newButton.className = 'term-tab tt-new';
  newButton.textContent = '+';
  newButton.setAttribute('aria-label', 'New terminal tab');
  newButton.addEventListener('click', () => opts.onNew());

  const placeNewButton = (): void => {
    if (root.lastElementChild !== newButton) {
      root.appendChild(newButton);
    }
  };

  const renderTab = (desc: TabDescriptor): HTMLButtonElement => {
    const el = activeDocument.createEl('button');
    el.type = 'button';
    el.className = 'term-tab';
    el.dataset.tab = String(desc.id);
    el.dataset.status = desc.status;

    const name = activeDocument.createSpan();
    name.className = 'tt-name';
    name.textContent = desc.name;
    el.appendChild(name);

    const closeBtn = activeDocument.createSpan();
    closeBtn.className = 'tt-x';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.textContent = '×';
    el.appendChild(closeBtn);

    el.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).classList.contains('tt-x')) return;
      opts.onActivate(desc.id);
    });
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      opts.onClose(desc.id);
    });
    name.addEventListener('dblclick', () => {
      // eslint-disable-next-line no-alert -- inline rename UX; TODO: replace with Modal for parity with Obsidian conventions.
      const next = window.prompt('Rename tab', desc.name);
      if (next && next.trim().length > 0) {
        api.rename(desc.id, next.trim());
      }
    });

    el.addEventListener('contextmenu', (evt) => {
      evt.preventDefault();
      const items = terminalTabMenuItems({
        rename: () => {
          // eslint-disable-next-line no-alert -- inline rename UX; TODO: replace with Modal for parity with Obsidian conventions.
          const next = window.prompt('Rename tab', desc.name);
          if (next && next.trim().length > 0) api.rename(desc.id, next.trim());
        },
        exportTranscript: opts.onExportTranscript ? () => opts.onExportTranscript?.(desc.id) : undefined,
        endSession: () => opts.onClose(desc.id),
      });
      showContextMenu(evt.clientX, evt.clientY, items);
    });

    return el;
  };

  const api: TabStripHandle = {
    element: root,
    addTab(desc) {
      const el = renderTab(desc);
      root.insertBefore(el, newButton);
      tabs.set(desc.id, { desc, el });
      placeNewButton();
      if (activeId === null) api.setActive(desc.id);
      return el;
    },
    removeTab(id) {
      const entry = tabs.get(id);
      if (!entry) return;
      entry.el.remove();
      tabs.delete(id);
      if (activeId === id) {
        const nextResult = tabs.values().next();
        const nextEntry: TabEntry | undefined = nextResult.done ? undefined : nextResult.value;
        activeId = nextEntry ? nextEntry.desc.id : null;
        if (activeId !== null) api.setActive(activeId);
      }
    },
    setStatus(id, status) {
      const entry = tabs.get(id);
      if (!entry) return;
      entry.desc.status = status;
      entry.el.dataset.status = status;
    },
    setActive(id) {
      activeId = id;
      for (const [tid, { el }] of tabs.entries()) {
        el.classList.toggle('active', tid === id);
      }
    },
    rename(id, name) {
      const entry = tabs.get(id);
      if (!entry) return;
      entry.desc.name = name;
      const nameEl = entry.el.querySelector('.tt-name');
      if (nameEl) nameEl.textContent = name;
      opts.onRename?.(id, name);
    },
    list() {
      return Array.from(tabs.values()).map((e) => ({ ...e.desc }));
    },
    dispose() {
      root.remove();
    },
  };

  placeNewButton();
  return api;
}
