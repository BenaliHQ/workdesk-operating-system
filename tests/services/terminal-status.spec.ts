import { describe, it, expect, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';
import {
  installStatusObserver,
  _internal,
} from '../../src/services/terminal-status';

// ────────── Helpers — fake TerminalView/Session ──────────

interface FakeProcess {
  stdout: EventEmitter;
  stderr: EventEmitter;
}
interface FakeSession {
  process: FakeProcess;
}
interface FakeView {
  sessions: FakeSession[];
  activeSession: FakeSession | null;
  tabBarEl: HTMLElement;
  register(cb: () => void): void;
  _disposers: Array<() => void>;
}

function makeSession(): FakeSession {
  return {
    process: { stdout: new EventEmitter(), stderr: new EventEmitter() },
  };
}

function buildTabStrip(view: FakeView, activeIdx: number | null): void {
  // Simulate vin's renderTabs(): empty tabBarEl, create a fresh
  // tabs-scroll container as a direct child of tabBarEl, then create
  // each tab inside that container.
  view.tabBarEl.replaceChildren();
  const tabsScroll = document.createElement('div');
  tabsScroll.className = 'vin-terminal-tabs-scroll';
  view.tabBarEl.appendChild(tabsScroll);
  view.sessions.forEach((_session, i) => {
    const tab = document.createElement('div');
    tab.className = 'vin-terminal-tab';
    if (i === activeIdx) tab.classList.add('is-active');
    const label = document.createElement('span');
    label.className = 'tab-label';
    label.textContent = `zsh ${i + 1}`;
    tab.appendChild(label);
    tabsScroll.appendChild(tab);
  });
}

function makeView(sessionCount: number, activeIdx: number | null = 0): FakeView {
  const tabBarEl = document.createElement('div');
  tabBarEl.className = 'vin-terminal-tab-bar';
  document.body.appendChild(tabBarEl);
  const sessions: FakeSession[] = [];
  for (let i = 0; i < sessionCount; i++) sessions.push(makeSession());
  const disposers: Array<() => void> = [];
  const view: FakeView = {
    sessions,
    activeSession: activeIdx !== null ? sessions[activeIdx] : null,
    tabBarEl,
    register(cb) { disposers.push(cb); },
    _disposers: disposers,
  };
  // Build initial tab DOM the same way vin's renderTabs would.
  buildTabStrip(view, activeIdx);
  return view;
}

const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 10));

const sessionTab = (view: FakeView, idx: number): Element =>
  view.tabBarEl.querySelectorAll('.vin-terminal-tab')[idx];

// ────────── Behavior tests ──────────

describe('installStatusObserver — binary activity', () => {
  beforeEach(() => {
    document.body.replaceChildren();
    _internal.reset();
  });

  it('stdout on inactive session adds .has-activity to its tab', async () => {
    const view = makeView(2, 0);
    installStatusObserver(view as unknown as Parameters<typeof installStatusObserver>[0]);
    view.sessions[1].process.stdout.emit('data', Buffer.from('any output'));
    await tick();
    expect(sessionTab(view, 0).classList.contains('has-activity')).toBe(false);
    expect(sessionTab(view, 1).classList.contains('has-activity')).toBe(true);
  });

  it('stderr counts as activity too', async () => {
    const view = makeView(2, 0);
    installStatusObserver(view as unknown as Parameters<typeof installStatusObserver>[0]);
    view.sessions[1].process.stderr.emit('data', Buffer.from('any err output'));
    await tick();
    expect(sessionTab(view, 1).classList.contains('has-activity')).toBe(true);
  });

  it('stdout on the focused session does NOT flag activity', async () => {
    const view = makeView(2, 0);
    installStatusObserver(view as unknown as Parameters<typeof installStatusObserver>[0]);
    view.sessions[0].process.stdout.emit('data', Buffer.from('foreground output'));
    await tick();
    expect(sessionTab(view, 0).classList.contains('has-activity')).toBe(false);
  });

  it('user switching to a flagged tab clears its activity', async () => {
    const view = makeView(2, 0);
    installStatusObserver(view as unknown as Parameters<typeof installStatusObserver>[0]);
    view.sessions[1].process.stdout.emit('data', Buffer.from('background output'));
    await tick();
    expect(sessionTab(view, 1).classList.contains('has-activity')).toBe(true);

    // Simulate vin's switchTo: update activeSession, then renderTabs
    // (which swaps the tabs-scroll container). Our childList observer
    // sees the swap and re-syncs; the active session's flag clears.
    view.activeSession = view.sessions[1];
    buildTabStrip(view, 1);
    await tick();
    expect(sessionTab(view, 1).classList.contains('has-activity')).toBe(false);
  });

  it('multi-chunk activity is idempotent (no churn re-adding the class)', async () => {
    const view = makeView(2, 0);
    installStatusObserver(view as unknown as Parameters<typeof installStatusObserver>[0]);
    view.sessions[1].process.stdout.emit('data', Buffer.from('chunk 1'));
    view.sessions[1].process.stdout.emit('data', Buffer.from('chunk 2'));
    view.sessions[1].process.stdout.emit('data', Buffer.from('chunk 3'));
    await tick();
    expect(sessionTab(view, 1).classList.contains('has-activity')).toBe(true);
    expect(_internal.hasActivity(view.sessions[1] as unknown as Parameters<typeof _internal.hasActivity>[0])).toBe(true);
  });

  it('tab DOM rebuild restores .has-activity from the in-memory flag', async () => {
    const view = makeView(2, 0);
    installStatusObserver(view as unknown as Parameters<typeof installStatusObserver>[0]);
    view.sessions[1].process.stdout.emit('data', Buffer.from('background output'));
    await tick();
    expect(sessionTab(view, 1).classList.contains('has-activity')).toBe(true);

    // Rebuild — e.g., after a rename. Tab 0 is still active. Tab 1's
    // activity flag is still set in memory, so the rebuilt tab should
    // pick it back up.
    buildTabStrip(view, 0);
    await tick();
    expect(sessionTab(view, 1).classList.contains('has-activity')).toBe(true);
  });

  it('per-view isolation: stdout on view A does not flag view B tabs', async () => {
    const viewA = makeView(1, null);  // no active session → any stdout flags
    const viewB = makeView(1, 0);
    installStatusObserver(viewA as unknown as Parameters<typeof installStatusObserver>[0]);
    installStatusObserver(viewB as unknown as Parameters<typeof installStatusObserver>[0]);
    viewA.sessions[0].process.stdout.emit('data', Buffer.from('output to A'));
    await tick();
    expect(sessionTab(viewA, 0).classList.contains('has-activity')).toBe(true);
    expect(sessionTab(viewB, 0).classList.contains('has-activity')).toBe(false);
  });

  it('installing twice is idempotent (no double-attach)', async () => {
    const view = makeView(2, 0);
    installStatusObserver(view as unknown as Parameters<typeof installStatusObserver>[0]);
    installStatusObserver(view as unknown as Parameters<typeof installStatusObserver>[0]);
    view.sessions[1].process.stdout.emit('data', Buffer.from('once'));
    await tick();
    expect(sessionTab(view, 1).classList.contains('has-activity')).toBe(true);
  });
});
