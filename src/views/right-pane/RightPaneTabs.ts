// Right-pane tab strip (Backlinks · Outline · Calendar · Terminal).
//
// Only one tab body is visible at a time. Default active is Terminal.

export type RightPaneId = 'backlinks' | 'outline' | 'calendar' | 'terminal';

export interface RightPaneTabsOptions {
  initial?: RightPaneId;
  onActivate(id: RightPaneId): void;
}

export interface RightPaneTabsHandle {
  element: HTMLElement;
  setActive(id: RightPaneId): void;
  active(): RightPaneId;
}

const ORDER: RightPaneId[] = ['backlinks', 'outline', 'calendar', 'terminal'];
const LABEL: Record<RightPaneId, string> = {
  backlinks: 'Backlinks',
  outline: 'Outline',
  calendar: 'Calendar',
  terminal: 'Terminal',
};

export function mountRightPaneTabs(parent: HTMLElement, opts: RightPaneTabsOptions): RightPaneTabsHandle {
  let activeId: RightPaneId = opts.initial ?? 'terminal';
  const root = activeDocument.createDiv();
  root.className = 'right-tabs';

  const buttons = new Map<RightPaneId, HTMLButtonElement>();
  for (const id of ORDER) {
    const btn = activeDocument.createEl('button');
    btn.type = 'button';
    btn.className = 'right-tab';
    btn.dataset.tab = id;
    btn.textContent = LABEL[id];
    if (id === activeId) btn.classList.add('active');
    btn.addEventListener('click', () => api.setActive(id));
    root.appendChild(btn);
    buttons.set(id, btn);
  }

  parent.appendChild(root);

  const api: RightPaneTabsHandle = {
    element: root,
    setActive(id) {
      activeId = id;
      for (const [tid, btn] of buttons.entries()) {
        btn.classList.toggle('active', tid === id);
      }
      // Surface the active tab on the parent right-pane so CSS can show/hide
      // the composer per design's `.right-pane.tab-{name}` selectors.
      const rp = parent.closest('.right-pane');
      if (rp instanceof HTMLElement) {
        for (const t of ORDER) rp.classList.remove(`tab-${t}`);
        rp.classList.add(`tab-${id}`);
      }
      opts.onActivate(id);
    },
    active: () => activeId,
  };
  return api;
}
