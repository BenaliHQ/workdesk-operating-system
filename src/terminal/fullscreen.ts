// Fullscreen toggle for the terminal pane.
//
// Adds .term-fullscreen onto the `.app` element when active. Esc exits.
// Builds a vertical session rail (232px left) with a "New session" button
// at the bottom. Hides the right-tabs strip via CSS while active.

export interface FullscreenSession {
  id: number;
  name: string;
  active: boolean;
}

export interface FullscreenOptions {
  appEl: HTMLElement;
  sessions(): FullscreenSession[];
  onActivate(id: number): void;
  onNew(): void;
  onExit(): void;
}

export interface FullscreenHandle {
  enter(): void;
  exit(): void;
  isActive(): boolean;
  refresh(): void;
  dispose(): void;
}

export function createFullscreenToggle(opts: FullscreenOptions): FullscreenHandle {
  let railEl: HTMLElement | null = null;
  let active = false;

  const onKeyDown = (e: KeyboardEvent): void => {
    if (!active) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      api.exit();
    }
  };

  const renderRail = (): void => {
    if (!railEl) return;
    railEl.innerHTML = '';
    const label = document.createElement('div');
    label.className = 'fs-rail-label';
    label.textContent = 'SESSIONS';
    railEl.appendChild(label);

    for (const s of opts.sessions()) {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'fs-session-row';
      row.dataset.session = String(s.id);
      if (s.active) row.classList.add('is-active');

      const dot = document.createElement('span');
      dot.className = 'fs-dot';
      row.appendChild(dot);

      const name = document.createElement('span');
      name.className = 'fs-session-name';
      name.textContent = s.name;
      row.appendChild(name);

      row.addEventListener('click', () => opts.onActivate(s.id));
      railEl.appendChild(row);
    }

    const newBtn = document.createElement('button');
    newBtn.type = 'button';
    newBtn.className = 'fs-new-session';
    newBtn.textContent = '+ New session';
    newBtn.addEventListener('click', () => opts.onNew());
    railEl.appendChild(newBtn);
  };

  const api: FullscreenHandle = {
    enter() {
      if (active) return;
      active = true;
      opts.appEl.classList.add('term-fullscreen');
      railEl = document.createElement('aside');
      railEl.className = 'fs-session-rail';
      opts.appEl.appendChild(railEl);
      renderRail();
      document.addEventListener('keydown', onKeyDown);
    },
    exit() {
      if (!active) return;
      active = false;
      opts.appEl.classList.remove('term-fullscreen');
      railEl?.remove();
      railEl = null;
      document.removeEventListener('keydown', onKeyDown);
      opts.onExit();
    },
    isActive: () => active,
    refresh: renderRail,
    dispose() {
      if (active) api.exit();
    },
  };

  return api;
}
