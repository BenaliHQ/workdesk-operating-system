// Focus mode — ⌘⇧F toggles `body.focus-on` and collapses Obsidian's left
// and right sidebars via the workspace API. Restoring the prior collapsed
// state on exit so toggling off doesn't surprise the operator with sidebars
// they had deliberately closed.
//
// Persisted via `settings.focus.completed`. The boolean tracks whether the
// operator left focus mode on at last reload, so we restore the same state
// on next plugin load.

import type { WorkdeskSettings } from '../settings';

export interface FocusController {
  isOn(): boolean;
  toggle(): boolean;
  on(): void;
  off(): void;
  restore(): void;
}

export interface WorkspaceSidedockLike {
  collapsed: boolean;
  collapse(): void;
  expand(): void;
}

export interface WorkspaceLike {
  leftSplit?: WorkspaceSidedockLike;
  rightSplit?: WorkspaceSidedockLike;
}

export interface FocusOptions {
  /** Obsidian's workspace. Optional so tests can omit if only checking class state. */
  workspace?: WorkspaceLike;
  /** Body element. Defaults to document.body. */
  bodyEl?: HTMLElement;
  settings: WorkdeskSettings;
  saveSettings: () => Promise<void> | void;
}

export function createFocusController(opts: FocusOptions): FocusController {
  const body = opts.bodyEl ?? document.body;
  let priorLeftCollapsed = opts.workspace?.leftSplit?.collapsed ?? false;
  let priorRightCollapsed = opts.workspace?.rightSplit?.collapsed ?? false;

  function applyOn(): void {
    priorLeftCollapsed = opts.workspace?.leftSplit?.collapsed ?? false;
    priorRightCollapsed = opts.workspace?.rightSplit?.collapsed ?? false;
    body.classList.add('focus-on');
    opts.workspace?.leftSplit?.collapse();
    opts.workspace?.rightSplit?.collapse();
  }

  function applyOff(): void {
    body.classList.remove('focus-on');
    if (!priorLeftCollapsed) opts.workspace?.leftSplit?.expand();
    if (!priorRightCollapsed) opts.workspace?.rightSplit?.expand();
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
