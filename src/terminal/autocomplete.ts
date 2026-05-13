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

  const root = document.createElement('div');
  root.className = 'term-autocomplete';
  root.setAttribute('role', 'listbox');

  const queryEl = document.createElement('div');
  queryEl.className = 'tac-query';
  root.appendChild(queryEl);

  const listEl = document.createElement('ul');
  listEl.className = 'tac-list';
  root.appendChild(listEl);

  const footerEl = document.createElement('div');
  footerEl.className = 'tac-footer';
  footerEl.innerHTML = '<kbd>↑↓</kbd> nav · <kbd>↵</kbd> insert · <kbd>esc</kbd> close';
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
    listEl.innerHTML = '';
    filtered.forEach((entry, i) => {
      const li = document.createElement('li');
      li.className = 'tac-item';
      if (i === selected) li.classList.add('selected');
      li.dataset.index = String(i);

      const name = document.createElement('span');
      name.className = 'tac-name';
      name.textContent = entry.name;
      li.appendChild(name);

      if (entry.folder && entry.folder.length > 0) {
        const folder = document.createElement('span');
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
    root.style.position = 'absolute';
    root.style.left = `${pos.x}px`;
    root.style.top = `${pos.y}px`;
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
