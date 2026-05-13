// Focus mode — ⌘⇧F toggles `body.focus-on` + `.app.no-left.no-right`.
//
// Persisted via `settings.focus.completed`. The boolean tracks whether the
// operator left focus mode on at last reload, so we restore the same state
// on next plugin load. Esc exits focus when no modal is open (handled by
// the caller in main.ts so we don't need a hard global listener here).

import type { WorkdeskSettings } from '../settings';

export interface FocusController {
  isOn(): boolean;
  toggle(): boolean;
  on(): void;
  off(): void;
  restore(): void;
}

export interface FocusOptions {
  appEl: HTMLElement;
  bodyEl?: HTMLElement;
  settings: WorkdeskSettings;
  saveSettings: () => Promise<void> | void;
}

export function createFocusController(opts: FocusOptions): FocusController {
  const body = opts.bodyEl ?? document.body;
  const app = opts.appEl;
  let priorNoLeft = app.classList.contains('no-left');
  let priorNoRight = app.classList.contains('no-right');

  function applyOn(): void {
    priorNoLeft = app.classList.contains('no-left');
    priorNoRight = app.classList.contains('no-right');
    body.classList.add('focus-on');
    app.classList.add('no-left', 'no-right');
  }

  function applyOff(): void {
    body.classList.remove('focus-on');
    if (!priorNoLeft) app.classList.remove('no-left');
    if (!priorNoRight) app.classList.remove('no-right');
  }

  async function persist(value: boolean): Promise<void> {
    opts.settings.focus.completed = value;
    await opts.saveSettings();
  }

  return {
    isOn(): boolean {
      return body.classList.contains('focus-on');
    },
    toggle(): boolean {
      const next = !body.classList.contains('focus-on');
      if (next) applyOn();
      else applyOff();
      void persist(next);
      return next;
    },
    on(): void {
      if (!body.classList.contains('focus-on')) {
        applyOn();
        void persist(true);
      }
    },
    off(): void {
      if (body.classList.contains('focus-on')) {
        applyOff();
        void persist(false);
      }
    },
    restore(): void {
      if (opts.settings.focus.completed) applyOn();
    },
  };
}
