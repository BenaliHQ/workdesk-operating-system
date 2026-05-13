// Calendar panel — month grid + recent daily notes list.

import type { App } from 'obsidian';

export interface CalendarOptions {
  monthCursor: Date;
  today?: Date;
  selected?: Date;
  notesByDate?: Map<string, string>;
  onSelect?(date: Date): void;
  onNavigate?(delta: number): void;
  onTodayClick?(): void;
  recentNotes?: Array<{ name: string; relative: string; path: string }>;
}

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export function renderCalendar(parent: HTMLElement, opts: CalendarOptions): HTMLElement {
  parent.replaceChildren();
  parent.classList.add('cal-body');
  parent.dataset.pane = 'calendar';

  const head = el('div', 'cal-head');
  const month = el('span', 'month');
  month.textContent = opts.monthCursor.toLocaleString(undefined, { month: 'long' });
  head.appendChild(month);
  const year = el('span', 'year');
  year.textContent = String(opts.monthCursor.getFullYear());
  head.appendChild(year);

  const nav = el('div', 'nav');
  const prev = button('icon-btn', '‹');
  prev.addEventListener('click', () => opts.onNavigate?.(-1));
  nav.appendChild(prev);
  const todayBtn = button('btn ghost', 'Today');
  todayBtn.addEventListener('click', () => opts.onTodayClick?.());
  nav.appendChild(todayBtn);
  const next = button('icon-btn', '›');
  next.addEventListener('click', () => opts.onNavigate?.(1));
  nav.appendChild(next);
  head.appendChild(nav);
  parent.appendChild(head);

  const dowRow = el('div', 'cal-dow');
  for (const d of DOW) {
    const cell = document.createElement('div');
    cell.textContent = d;
    dowRow.appendChild(cell);
  }
  parent.appendChild(dowRow);

  const grid = el('div', 'cal-grid');
  const days = buildMonthGrid(opts.monthCursor);
  const today = opts.today ?? new Date();
  for (const d of days) {
    const cell = button('cal-cell', String(d.date.getDate()));
    cell.dataset.date = isoDate(d.date);
    if (d.outOfMonth) cell.classList.add('out-of-month');
    if (sameDay(d.date, today)) cell.classList.add('today');
    if (opts.selected && sameDay(d.date, opts.selected)) cell.classList.add('selected');
    const note = opts.notesByDate?.get(isoDate(d.date));
    if (note) {
      cell.classList.add('has-note');
      cell.dataset.note = note;
    }
    cell.addEventListener('click', () => opts.onSelect?.(d.date));
    grid.appendChild(cell);
  }
  parent.appendChild(grid);

  if (opts.recentNotes && opts.recentNotes.length > 0) {
    const section = el('div', 'cal-section');
    const label = el('div', 'cal-section-label');
    label.textContent = 'RECENT DAILY NOTES';
    section.appendChild(label);
    for (const note of opts.recentNotes) {
      const row = el('div', 'cal-note');
      row.dataset.path = note.path;
      const dot = el('span', 'dot');
      row.appendChild(dot);
      const name = el('span', 'name');
      name.textContent = note.name;
      row.appendChild(name);
      const rel = el('span', 'rel');
      rel.textContent = note.relative;
      row.appendChild(rel);
      section.appendChild(row);
    }
    parent.appendChild(section);
  }

  return parent;
}

function el(tag: string, cls: string): HTMLElement {
  const e = document.createElement(tag);
  e.className = cls;
  return e;
}

function button(cls: string, text: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = cls;
  b.textContent = text;
  return b;
}

interface MonthCell { date: Date; outOfMonth: boolean }

function buildMonthGrid(cursor: Date): MonthCell[] {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);
  const startDay = firstOfMonth.getDay();
  const mondayOffset = (startDay + 6) % 7;
  const cells: MonthCell[] = [];
  const start = new Date(year, month, 1 - mondayOffset);
  const total = mondayOffset + lastOfMonth.getDate();
  const rows = Math.ceil(total / 7);
  for (let i = 0; i < rows * 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push({ date: d, outOfMonth: d.getMonth() !== month });
  }
  return cells;
}

function isoDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export async function loadRecentDailyNotes(app: App, limit = 5): Promise<Array<{ name: string; relative: string; path: string }>> {
  const out: Array<{ name: string; relative: string; path: string }> = [];
  const files = app.vault.getMarkdownFiles();
  const daily = files
    .filter((f) => /personal\/daily\/\d{4}-\d{2}-\d{2}\.md$/.test(f.path))
    .sort((a, b) => b.path.localeCompare(a.path))
    .slice(0, limit);
  for (const f of daily) {
    out.push({ name: f.basename, relative: relativeAge(f.basename), path: f.path });
  }
  return out;
}

function relativeAge(basename: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(basename);
  if (!m || !m[1] || !m[2] || !m[3]) return basename;
  const date = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`);
  const days = Math.round((Date.now() - date.getTime()) / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.round(days / 7)}w ago`;
  return `${Math.round(days / 30)}mo ago`;
}
