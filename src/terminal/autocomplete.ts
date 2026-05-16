// [[ autocomplete popup. Mounts a .term-autocomplete element anchored to a
// position (typically the xterm cursor coordinates). Filters a candidate
// list against the partial query after `[[` and emits the selection.

export interface AutocompleteEntry {
  name: string;
  folder?: string;
}

export interface AutocompleteOptions {
  candidates: AutocompleteEntry[];
  anchor: { x: number; y: number } | (() => { x: number; y: number });
  onAccept(entry: AutocompleteEntry): void;
  onDismiss(): void;
  limit?: number;
}

export interface AutocompleteHandle {
  element: HTMLElement;
  setQuery(q: string): void;
  results(): AutocompleteEntry[];
  selectedIndex(): number;
  moveSelection(delta: number): void;
  accept(): void;
  dismiss(): void;
}

export function mountAutocomplete(parent: HTMLElement, opts: AutocompleteOptions): AutocompleteHandle {
  const limit = opts.limit ?? 5;
  let query = '';
  let filtered: AutocompleteEntry[] = [];
  let selected = 0;

  const root = activeDocument.createDiv();
  root.className = 'term-autocomplete';
  root.setAttribute('role', 'listbox');

  const queryEl = activeDocument.createDiv();
  queryEl.className = 'tac-query';
  root.appendChild(queryEl);

  const listEl = activeDocument.createEl('ul');
  listEl.className = 'tac-list';
  root.appendChild(listEl);

  const footerEl = activeDocument.createDiv();
  footerEl.className = 'tac-footer';
  appendKbdFooter(footerEl, [
    { keys: ['↑↓'], label: 'nav' },
    { keys: ['↵'], label: 'insert' },
    { keys: ['esc'], label: 'close' },
  ]);
  root.appendChild(footerEl);

  parent.appendChild(root);
  positionRoot();

  const filter = (): AutocompleteEntry[] => {
    if (query.length === 0) return opts.candidates.slice(0, limit);
    const q = query.toLowerCase();
    return opts.candidates
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, limit);
  };

  const render = (): void => {
    queryEl.textContent = `[[${query}`;
    listEl.empty();
    filtered.forEach((entry, i) => {
      const li = activeDocument.createEl('li');
      li.className = 'tac-item';
      if (i === selected) li.classList.add('selected');
      li.dataset.index = String(i);

      const name = activeDocument.createSpan();
      name.className = 'tac-name';
      name.textContent = entry.name;
      li.appendChild(name);

      if (entry.folder && entry.folder.length > 0) {
        const folder = activeDocument.createSpan();
        folder.className = 'tac-folder';
        folder.textContent = entry.folder;
        li.appendChild(folder);
      }

      li.addEventListener('click', () => {
        selected = i;
        api.accept();
      });
      listEl.appendChild(li);
    });
  };

  function positionRoot(): void {
    const pos = typeof opts.anchor === 'function' ? opts.anchor() : opts.anchor;
    root.addClass('wd-autocomplete-popover');
    root.style.setProperty('--wd-x', `${pos.x}px`);
    root.style.setProperty('--wd-y', `${pos.y}px`);
  }

  function appendKbdFooter(
    el: HTMLElement,
    items: Array<{ keys: string[]; label: string }>,
  ): void {
    items.forEach((item, idx) => {
      if (idx > 0) el.appendText(' · ');
      for (const k of item.keys) {
        const kbd = activeDocument.createEl('kbd');
        kbd.textContent = k;
        el.appendChild(kbd);
      }
      el.appendText(` ${item.label}`);
    });
  }

  const api: AutocompleteHandle = {
    element: root,
    setQuery(q) {
      query = q;
      filtered = filter();
      if (selected >= filtered.length) selected = Math.max(0, filtered.length - 1);
      render();
    },
    results: () => filtered,
    selectedIndex: () => selected,
    moveSelection(delta) {
      if (filtered.length === 0) return;
      selected = (selected + delta + filtered.length) % filtered.length;
      render();
    },
    accept() {
      const entry = filtered[selected];
      if (!entry) return;
      opts.onAccept(entry);
      api.dismiss();
    },
    dismiss() {
      root.remove();
      opts.onDismiss();
    },
  };

  api.setQuery('');
  return api;
}
