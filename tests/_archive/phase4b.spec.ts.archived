import { describe, it, expect, beforeEach } from 'vitest';
import { mountTabStrip } from '../src/terminal/tabs';
import { parseStatusFromChunk, reduceStatus, type TabStatus } from '../src/terminal/status-parser';
import { mountStatusbar } from '../src/terminal/statusbar';
import { createFullscreenToggle } from '../src/terminal/fullscreen';
import { mountAutocomplete } from '../src/terminal/autocomplete';
import { attachDropzone, shellEscape } from '../src/terminal/dropzone';
import { renderBacklinks } from '../src/views/right-pane/Backlinks';
import { parseHeadings, renderOutline } from '../src/views/right-pane/Outline';
import { renderCalendar } from '../src/views/right-pane/Calendar';
import { mountRightPaneTabs } from '../src/views/right-pane/RightPaneTabs';

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('phase 4b · tab strip statuses', () => {
  it('cycles data-status through all five values', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const strip = mountTabStrip(root, {
      onActivate: () => {},
      onClose: () => {},
      onNew: () => {},
    });
    const tab = strip.addTab({ id: 7, name: 'claude', status: 'idle' });
    const statuses: TabStatus[] = ['idle', 'working', 'done', 'waiting', 'error'];
    for (const s of statuses) {
      strip.setStatus(7, s);
      expect(tab.dataset.status).toBe(s);
    }
  });

  it('renders new (+) button after tabs', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const strip = mountTabStrip(root, { onActivate: () => {}, onClose: () => {}, onNew: () => {} });
    strip.addTab({ id: 1, name: 'one', status: 'idle' });
    strip.addTab({ id: 2, name: 'two', status: 'idle' });
    const all = root.querySelectorAll('.term-tab');
    expect(all.length).toBe(3);
    expect(all[2]?.classList.contains('tt-new')).toBe(true);
  });
});

describe('phase 4b · status parser', () => {
  it('● transitions to working', () => {
    expect(parseStatusFromChunk('● running tool', 'idle')).toBe('working');
  });
  it('⎿ transitions to done', () => {
    expect(parseStatusFromChunk('⎿ result', 'working')).toBe('done');
  });
  it('working → done sequence via reducer', () => {
    expect(reduceStatus(['● tool', '… progress', '⎿ result'], 'idle')).toBe('done');
  });
  it('Error: lifts to error', () => {
    expect(parseStatusFromChunk('Error: oh no', 'idle')).toBe('error');
  });
});

describe('phase 4b · statusbar', () => {
  it('renders all required segments and updates pct/cost/skills/ready', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const sb = mountStatusbar(root, { model: 'opus 4.7', contextPct: 12, cost: '$0.01', skillsCount: 18 });
    expect(root.querySelector('.terminal-statusbar')).not.toBeNull();
    expect(root.querySelector('.sb-context')).not.toBeNull();
    expect(root.querySelector('.sb-ready')?.getAttribute('data-ready')).toBe('1');
    sb.update({ ready: false, contextPct: 87 });
    expect(root.querySelector('.sb-ready')?.getAttribute('data-ready')).toBe('0');
    expect((root.querySelector('.sb-context-fill') as HTMLElement).style.width).toBe('87%');
  });
});

describe('phase 4b · fullscreen', () => {
  it('enter adds .term-fullscreen and exit removes it', () => {
    const app = document.createElement('div');
    app.className = 'app';
    document.body.appendChild(app);

    const fs = createFullscreenToggle({
      appEl: app,
      sessions: () => [{ id: 1, name: 'zsh 1', active: true }],
      onActivate: () => {},
      onNew: () => {},
      onExit: () => {},
    });
    fs.enter();
    expect(app.classList.contains('term-fullscreen')).toBe(true);
    expect(app.querySelector('.fs-session-rail')).not.toBeNull();
    fs.exit();
    expect(app.classList.contains('term-fullscreen')).toBe(false);
  });

  it('Esc exits fullscreen when active', () => {
    const app = document.createElement('div');
    app.className = 'app';
    document.body.appendChild(app);
    let exited = 0;
    const fs = createFullscreenToggle({
      appEl: app,
      sessions: () => [],
      onActivate: () => {},
      onNew: () => {},
      onExit: () => { exited++; },
    });
    fs.enter();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(app.classList.contains('term-fullscreen')).toBe(false);
    expect(exited).toBe(1);
  });
});

describe('phase 4b · [[ autocomplete', () => {
  it('shows ≥1 match for `exam` query when candidates include example-project', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const ac = mountAutocomplete(root, {
      candidates: [
        { name: 'example-project', folder: 'atlas/projects' },
        { name: 'jane-doe', folder: 'atlas/people' },
        { name: 'example-concept', folder: 'intel/concepts' },
      ],
      anchor: { x: 100, y: 100 },
      onAccept: () => {},
      onDismiss: () => {},
    });
    ac.setQuery('exam');
    const results = ac.results();
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.map((r) => r.name)).toContain('example-project');
  });

  it('moveSelection wraps and accept fires onAccept with selected entry', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const accepted: string[] = [];
    const ac = mountAutocomplete(root, {
      candidates: [
        { name: 'one' },
        { name: 'two' },
        { name: 'three' },
      ],
      anchor: { x: 0, y: 0 },
      onAccept: (entry) => accepted.push(entry.name),
      onDismiss: () => {},
    });
    ac.setQuery('');
    ac.moveSelection(1);
    ac.accept();
    expect(accepted).toEqual(['two']);
  });
});

describe('phase 4b · dropzone shell-escape', () => {
  it('wraps paths with spaces in single quotes', () => {
    expect(shellEscape('/path/with spaces.md')).toBe("'/path/with spaces.md'");
  });
  it('leaves safe paths unquoted', () => {
    expect(shellEscape('/safe/path.md')).toBe('/safe/path.md');
  });
  it("escapes single quotes inside path", () => {
    expect(shellEscape("/path/with'quote.md")).toBe("'/path/with'\\''quote.md'");
  });
  it('emits term-drop-over while dragging and clears on drop', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const calls: string[] = [];
    attachDropzone({ element: el, onPathDropped: (p) => calls.push(p) });

    el.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true }));
    expect(el.classList.contains('term-drop-over')).toBe(true);
    el.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true }));
    expect(el.classList.contains('term-drop-over')).toBe(false);
  });
});

describe('phase 4b · right-pane tab strip', () => {
  it('renders Backlinks, Outline, Calendar, Terminal in order', () => {
    const rp = document.createElement('div');
    rp.className = 'right-pane';
    document.body.appendChild(rp);
    const host = rp.appendChild(document.createElement('div'));
    const handle = mountRightPaneTabs(host, { onActivate: () => {} });
    const labels = Array.from(handle.element.querySelectorAll('.right-tab')).map((b) => (b as HTMLElement).textContent);
    expect(labels).toEqual(['Backlinks', 'Outline', 'Calendar', 'Terminal']);
    handle.setActive('outline');
    expect(rp.classList.contains('tab-outline')).toBe(true);
  });
});

describe('phase 4b · right-pane bodies', () => {
  it('Backlinks renders one .rp-link per entry with em on the matched term', () => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);
    renderBacklinks(parent, [
      { notePath: 'atlas/projects/a.md', noteName: 'a', excerpt: 'Linked to b in body', matchText: 'b' },
      { notePath: 'atlas/people/c.md', noteName: 'c', excerpt: 'no match', matchText: 'b' },
    ]);
    expect(parent.querySelectorAll('.rp-link').length).toBe(2);
    expect(parent.querySelector('em')?.textContent).toBe('b');
  });

  it('Outline parses headings ignoring code fences', () => {
    const md = '# A\n\n```\n# not-a-heading\n```\n\n## B\n\n### C\n';
    const out = parseHeadings(md);
    expect(out.map((e) => e.text)).toEqual(['A', 'B', 'C']);
    expect(out[0]?.level).toBe(1);
    expect(out[2]?.level).toBe(3);
  });

  it('Outline render emits one .rp-outline-row per heading', () => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);
    renderOutline(parent, [
      { level: 1, text: 'A', line: 0 },
      { level: 2, text: 'B', line: 5 },
    ]);
    const rows = parent.querySelectorAll('.rp-outline-row');
    expect(rows.length).toBe(2);
    expect(rows[1]?.classList.contains('h2')).toBe(true);
  });

  it('Calendar renders dow + grid + today highlight', () => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);
    const today = new Date(2026, 4, 13); // May 13, 2026
    renderCalendar(parent, {
      monthCursor: today,
      today,
      onSelect: () => {},
      onNavigate: () => {},
    });
    expect(parent.classList.contains('cal-body')).toBe(true);
    expect(parent.querySelector('.cal-head')).not.toBeNull();
    expect(parent.querySelectorAll('.cal-dow > div').length).toBe(7);
    expect(parent.querySelector('.cal-cell.today')?.textContent).toBe('13');
  });

  it('Calendar marks cells with .has-note when notesByDate has the date', () => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);
    const cursor = new Date(2026, 4, 1);
    const notes = new Map<string, string>([['2026-05-15', 'personal/daily/2026-05-15.md']]);
    renderCalendar(parent, { monthCursor: cursor, notesByDate: notes });
    const cell = parent.querySelector('[data-date="2026-05-15"]') as HTMLElement;
    expect(cell.classList.contains('has-note')).toBe(true);
    expect(cell.dataset.note).toBe('personal/daily/2026-05-15.md');
  });
});
