// Tab activity indicator — binary "new output since you last looked"
// signal per terminal session, applied to the sidebar tab strip.
// Modeled on vin's `.has-activity` pulse (internetvin-terminal/main.ts:1525,
// styles.css:687). Vin only wires it for fullscreen tabs; we extend it
// to the sidebar.
//
// Note: fullscreen tabs already get `.has-activity` via vin's own
// FullscreenManager.setupActivityCallbacks (vendored, unchanged). Our CSS
// rule scopes the pulse to `.vin-terminal-tab` (sidebar) AND
// `.vin-fs-tab` (fullscreen) — vin sets the class on fullscreen tabs,
// our code sets it on sidebar tabs.
//
// Architectural principles:
// - Zero vendor modifications. We attach an ADDITIVE
//   `process.stdout/stderr.on('data', ...)` listener (Node EventEmitters
//   support multiple listeners), so we coexist with vin's
//   `setActivityCallback` slot.
// - No global document watching. The MutationObserver scope is narrow
//   (per-view tabBarEl, childList only) to avoid contention with
//   Obsidian's frequent body-level UI mutations.

import { TerminalView } from '../vendor/workdesk-terminal';

type TerminalSessionLike = TerminalView['sessions'][number];

interface ProcessWithStreams {
  stdout?: { on(evt: 'data', cb: () => void): void } | null;
  stderr?: { on(evt: 'data', cb: () => void): void } | null;
}

// Per-session activity flag. A session has "activity" when stdout has
// arrived since the user last focused that tab.
const ACTIVITY: WeakSet<TerminalSessionLike> = new WeakSet();
// Idempotency: don't attach the stdout listener twice to the same session.
const LISTENING: WeakSet<TerminalSessionLike> = new WeakSet();
const OBSERVED_VIEWS: WeakSet<TerminalView> = new WeakSet();

function attachActivityListener(view: TerminalView, session: TerminalSessionLike): void {
  if (LISTENING.has(session)) return;
  LISTENING.add(session);

  const onChunk = (): void => {
    // Don't flag the currently-focused session — by definition, the user
    // is already looking at it.
    if (session === view.activeSession) return;
    if (ACTIVITY.has(session)) return;
    ACTIVITY.add(session);
    paintTab(view, session);
  };

  const proc = (session as unknown as { process?: ProcessWithStreams }).process;
  proc?.stdout?.on('data', onChunk);
  proc?.stderr?.on('data', onChunk);
}

function paintTab(view: TerminalView, session: TerminalSessionLike): void {
  const idx = view.sessions.indexOf(session);
  if (idx < 0) return;
  const tab = view.tabBarEl?.querySelectorAll('.vin-terminal-tab')[idx];
  if (!tab) return;
  if (ACTIVITY.has(session)) tab.classList.add('has-activity');
  else tab.classList.remove('has-activity');
}

function syncAllTabs(view: TerminalView): void {
  // Re-apply the class for every session based on the current ACTIVITY
  // flag. Called once per tab-strip rebuild (vin's renderTabs swaps the
  // whole tabs-scroll container). For whichever session is now active,
  // clear the flag — the user has now seen it.
  const tabs = view.tabBarEl?.querySelectorAll('.vin-terminal-tab');
  if (!tabs) return;
  view.sessions.forEach((session, idx) => {
    attachActivityListener(view, session);
    if (session === view.activeSession) ACTIVITY.delete(session);
    const tab = tabs[idx];
    if (!tab) return;
    if (ACTIVITY.has(session)) tab.classList.add('has-activity');
    else tab.classList.remove('has-activity');
  });
}

export function installStatusObserver(view: TerminalView): void {
  if (OBSERVED_VIEWS.has(view)) return;
  OBSERVED_VIEWS.add(view);
  const target = view.tabBarEl;
  if (!target) return;
  // childList only — no subtree, no attributes. Vin's renderTabs always
  // swaps the direct child (`vin-terminal-tabs-scroll`) when rebuilding
  // the tab strip, so we catch every tab event (new, switch, rename,
  // close) without observing class changes (which would feedback-loop
  // with our own classList.add/remove calls).
  const observer = new MutationObserver(() => syncAllTabs(view));
  observer.observe(target, { childList: true });
  syncAllTabs(view);
  view.register(() => observer.disconnect());
}

// Test-only helpers.
export const _internal = {
  hasActivity(session: TerminalSessionLike): boolean {
    return ACTIVITY.has(session);
  },
  reset(): void {
    // No global state to reset; the WeakSets clear naturally as test
    // sessions go out of scope. Kept for API symmetry with prior revs.
  },
};
