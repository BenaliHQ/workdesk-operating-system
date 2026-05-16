// Statusbar below the terminal canvas.
//
// Segments per design § terminal-statusbar: model · context use bar · session
// length · cost · skills count · ready/busy indicator.

export interface StatusbarState {
  model: string;
  contextPct: number;
  sessionLength: string;
  cost: string;
  skillsCount: number;
  ready: boolean;
}

export interface StatusbarHandle {
  element: HTMLElement;
  update(patch: Partial<StatusbarState>): void;
  dispose(): void;
}

const DEFAULT_STATE: StatusbarState = {
  model: 'opus 4.7',
  contextPct: 0,
  sessionLength: '0m 0s',
  cost: '$0.00',
  skillsCount: 0,
  ready: true,
};

export function mountStatusbar(parent: HTMLElement, initial?: Partial<StatusbarState>): StatusbarHandle {
  const state: StatusbarState = { ...DEFAULT_STATE, ...initial };
  const root = activeDocument.createDiv();
  root.className = 'terminal-statusbar';

  const segModel = makeSegment('sb-model', state.model);
  const segContext = makeContextBar(state.contextPct);
  const segSession = makeSegment('sb-session', `⏱ ${state.sessionLength}`);
  const segCost = makeSegment('sb-cost', `⚡ ${state.cost}`);

  const spacer = activeDocument.createSpan();
  spacer.className = 'sb-spacer';

  const segSkills = makeSegment('sb-skills', `${state.skillsCount} skills`);
  const segReady = makeReady(state.ready);

  root.append(segModel, segContext.element, segSession, segCost, spacer, segSkills, segReady);
  parent.appendChild(root);

  return {
    element: root,
    update(patch) {
      Object.assign(state, patch);
      if (patch.model !== undefined) segModel.textContent = state.model;
      if (patch.contextPct !== undefined) segContext.setPct(state.contextPct);
      if (patch.sessionLength !== undefined) segSession.textContent = `⏱ ${state.sessionLength}`;
      if (patch.cost !== undefined) segCost.textContent = `⚡ ${state.cost}`;
      if (patch.skillsCount !== undefined) segSkills.textContent = `${state.skillsCount} skills`;
      if (patch.ready !== undefined) {
        segReady.dataset.ready = state.ready ? '1' : '0';
        segReady.textContent = state.ready ? '✓ ready' : '○ busy';
      }
    },
    dispose() {
      root.remove();
    },
  };
}

function makeSegment(cls: string, text: string): HTMLSpanElement {
  const el = activeDocument.createSpan();
  el.className = `sb-segment ${cls}`;
  el.textContent = text;
  return el;
}

function makeContextBar(pct: number): { element: HTMLElement; setPct(p: number): void } {
  const wrapper = activeDocument.createSpan();
  wrapper.className = 'sb-segment sb-context';

  const label = activeDocument.createSpan();
  label.className = 'sb-context-label';
  wrapper.appendChild(label);

  const track = activeDocument.createSpan();
  track.className = 'sb-context-track';
  const fill = activeDocument.createSpan();
  fill.className = 'sb-context-fill';
  track.appendChild(fill);
  wrapper.appendChild(track);

  const setPct = (p: number): void => {
    const clamped = Math.max(0, Math.min(100, p));
    label.textContent = `${clamped}%`;
    fill.style.width = `${clamped}%`;
  };
  setPct(pct);

  return { element: wrapper, setPct };
}

function makeReady(ready: boolean): HTMLSpanElement {
  const el = activeDocument.createSpan();
  el.className = 'sb-segment sb-ready';
  el.dataset.ready = ready ? '1' : '0';
  el.textContent = ready ? '✓ ready' : '○ busy';
  return el;
}
