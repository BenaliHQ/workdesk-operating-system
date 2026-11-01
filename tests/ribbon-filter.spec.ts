import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// "Hide non-WorkDesk ribbon icons" against the ribbon DOM Obsidian 1.14.5
// actually builds (verified in app.js from obsidian-1.14.5.asar):
//   - Ribbon: div.workspace-ribbon.side-dock-ribbon.mod-left
//       > div.side-dock-actions > div.clickable-icon.side-dock-ribbon-action
//       > div.side-dock-settings
//   - Mobile (Platform.isMobile → phone AND iPad): the left split is a
//     mobile drawer whose recomputeChildrenDimensions() moves the left
//     ribbon into .workspace-drawer-inner, removes `workspace-ribbon` and adds
//     `workspace-drawer-ribbon` on every rerender.

const HIDE_CLASS = 'workdesk-hide-native-ribbon-icons';
const css = readFileSync(resolve(__dirname, '..', 'styles', 'obsidian-scope.css'), 'utf8');

function ribbonAction(workdesk: boolean): HTMLElement {
  const el = document.createElement('div');
  el.className = 'clickable-icon side-dock-ribbon-action';
  if (workdesk) el.classList.add('workdesk-icon');
  return el;
}

function buildRibbon(): { ribbon: HTMLElement; workdesk: HTMLElement; native: HTMLElement; otherPlugin: HTMLElement } {
  const ribbon = document.createElement('div');
  ribbon.className = 'workspace-ribbon side-dock-ribbon mod-left';
  const actions = ribbon.appendChild(document.createElement('div'));
  actions.className = 'side-dock-actions';
  const workdesk = actions.appendChild(ribbonAction(true));
  const native = actions.appendChild(ribbonAction(false));
  const otherPlugin = actions.appendChild(ribbonAction(false));
  ribbon.appendChild(document.createElement('div')).className = 'side-dock-settings';
  return { ribbon, workdesk, native, otherPlugin };
}

/** Mirrors the mobile drawer's recomputeChildrenDimensions() for the left side. */
function renderIntoMobileDrawer(ribbon: HTMLElement): { inner: HTMLElement; vaultSwitcher: HTMLElement; headerIcon: HTMLElement } {
  const drawer = document.body.querySelector<HTMLElement>('.workspace-drawer.mod-left') ?? document.body.appendChild(document.createElement('div'));
  drawer.className = 'workspace-drawer mod-left';
  const inner = drawer.querySelector<HTMLElement>('.workspace-drawer-inner') ?? drawer.appendChild(document.createElement('div'));
  inner.className = 'workspace-drawer-inner';
  const header = document.createElement('div');
  header.className = 'workspace-drawer-header';
  const headerIcon = header.appendChild(document.createElement('div'));
  headerIcon.className = 'clickable-icon';
  const tabs = document.createElement('div');
  tabs.className = 'workspace-drawer-tab-container';
  const vaultSwitcher = tabs.appendChild(document.createElement('div'));
  vaultSwitcher.className = 'workspace-drawer-vault-switcher';
  ribbon.classList.remove('workspace-ribbon');
  ribbon.classList.add('workspace-drawer-ribbon');
  inner.replaceChildren(ribbon, header, tabs);
  return { inner, vaultSwitcher, headerIcon };
}

const hidden = (el: HTMLElement): boolean => getComputedStyle(el).display === 'none';

describe('hide non-WorkDesk ribbon icons', () => {
  beforeEach(() => {
    const style = document.head.appendChild(document.createElement('style'));
    style.id = 'ribbon-filter-under-test';
    style.textContent = css;
  });

  afterEach(() => {
    document.getElementById('ribbon-filter-under-test')?.remove();
    document.body.replaceChildren();
    document.body.classList.remove(HIDE_CLASS);
  });

  it('desktop ribbon: hides native and other-plugin icons, keeps WorkDesk icons', () => {
    const { ribbon, workdesk, native, otherPlugin } = buildRibbon();
    document.body.appendChild(ribbon);
    document.body.classList.add(HIDE_CLASS);
    expect(hidden(native)).toBe(true);
    expect(hidden(otherPlugin)).toBe(true);
    expect(hidden(workdesk)).toBe(false);
  });

  it('mobile drawer ribbon (phone + iPad): hides native and other-plugin icons, keeps WorkDesk icons', () => {
    const { ribbon, workdesk, native, otherPlugin } = buildRibbon();
    renderIntoMobileDrawer(ribbon);
    expect(ribbon.classList.contains('workspace-ribbon')).toBe(false);
    document.body.classList.add(HIDE_CLASS);
    expect(hidden(native)).toBe(true);
    expect(hidden(otherPlugin)).toBe(true);
    expect(hidden(workdesk)).toBe(false);
  });

  it('mobile drawer rerender keeps the filter applied', () => {
    const { ribbon, workdesk, native } = buildRibbon();
    document.body.classList.add(HIDE_CLASS);
    renderIntoMobileDrawer(ribbon);
    renderIntoMobileDrawer(ribbon);
    expect(hidden(native)).toBe(true);
    expect(hidden(workdesk)).toBe(false);
  });

  it('toggle off restores every icon on desktop and mobile', () => {
    const desktop = buildRibbon();
    document.body.appendChild(desktop.ribbon);
    const mobile = buildRibbon();
    renderIntoMobileDrawer(mobile.ribbon);
    document.body.classList.add(HIDE_CLASS);
    document.body.classList.remove(HIDE_CLASS);
    for (const r of [desktop, mobile]) {
      expect(hidden(r.native)).toBe(false);
      expect(hidden(r.otherPlugin)).toBe(false);
      expect(hidden(r.workdesk)).toBe(false);
    }
  });

  it('leaves drawer header controls and the vault switcher alone', () => {
    const { ribbon } = buildRibbon();
    const { vaultSwitcher, headerIcon } = renderIntoMobileDrawer(ribbon);
    document.body.classList.add(HIDE_CLASS);
    expect(hidden(vaultSwitcher)).toBe(false);
    expect(hidden(headerIcon)).toBe(false);
  });
});
