// ⌘K command palette. Fuse.js-filtered modal that lists every command whose
// id begins with `workdesk:`. Matches design's `.cmd-palette` § components.md.

import { Modal, type App } from 'obsidian';
import Fuse from 'fuse.js';
import { COMMAND_ID_PREFIX } from '../constants';

interface ObsidianCommand {
  id: string;
  name: string;
  hotkeys?: Array<{ modifiers: string[]; key: string }>;
}

interface PaletteEntry {
  id: string;
  name: string;
  group: string;
  hotkey?: string;
}

export class CommandPalette extends Modal {
  private input!: HTMLInputElement;
  private listEl!: HTMLElement;
  private results: PaletteEntry[] = [];
  private selected = 0;
  private fuse: Fuse<PaletteEntry>;
  private allEntries: PaletteEntry[] = [];

  constructor(app: App) {
    super(app);
    this.allEntries = collectCommands(app);
    this.fuse = new Fuse(this.allEntries, {
      keys: ['name', 'id'],
      threshold: 0.4,
    });
  }

  onOpen(): void {
    this.contentEl.replaceChildren();
    this.contentEl.classList.add('cmd-palette');

    const inputRow = createDiv();
    inputRow.className = 'cmd-input-row';
    this.contentEl.appendChild(inputRow);

    const glyph = createSpan();
    glyph.className = 'cmd-glyph';
    glyph.textContent = '⌕';
    inputRow.appendChild(glyph);

    this.input = createEl('input');
    this.input.className = 'cmd-input';
    this.input.placeholder = 'Type a command…';
    inputRow.appendChild(this.input);

    const pill = createSpan();
    pill.className = 'cmd-pill';
    const pillKbd = createEl('kbd');
    // eslint-disable-next-line obsidianmd/ui/sentence-case -- ⌘K is a shortcut glyph, not sentence text.
    pillKbd.textContent = '⌘K';
    pill.appendChild(pillKbd);
    inputRow.appendChild(pill);

    this.listEl = createDiv();
    this.listEl.className = 'cmd-list';
    this.contentEl.appendChild(this.listEl);

    const footer = createDiv();
    footer.className = 'cmd-footer';
    appendKbdHint(footer, [
      { keys: ['↑↓'], label: 'navigate' },
      { keys: ['↵'], label: 'select' },
      { keys: ['esc'], label: 'close' },
    ]);
    this.contentEl.appendChild(footer);

    this.input.addEventListener('input', () => this.refilter());
    this.input.addEventListener('keydown', (e) => this.handleKey(e));

    this.refilter();
    this.input.focus();
  }

  onClose(): void {
    this.contentEl.replaceChildren();
  }

  refilter(): void {
    const q = this.input.value.trim();
    if (q.length === 0) {
      this.results = this.allEntries.slice(0, 50);
    } else {
      this.results = this.fuse.search(q).slice(0, 50).map((r) => r.item);
    }
    if (this.selected >= this.results.length) this.selected = Math.max(0, this.results.length - 1);
    this.renderList();
  }

  results_for_test(): PaletteEntry[] {
    return this.results;
  }

  private renderList(): void {
    this.listEl.replaceChildren();
    if (this.results.length === 0) {
      const empty = createDiv();
      empty.className = 'cmd-empty';
      empty.textContent = 'No commands match.';
      this.listEl.appendChild(empty);
      return;
    }
    const groups = new Map<string, PaletteEntry[]>();
    for (const entry of this.results) {
      const arr = groups.get(entry.group) ?? [];
      arr.push(entry);
      groups.set(entry.group, arr);
    }
    let i = 0;
    for (const [group, entries] of groups.entries()) {
      const heading = createDiv();
      heading.className = 'cmd-group';
      heading.textContent = group;
      this.listEl.appendChild(heading);
      for (const entry of entries) {
        const row = createDiv();
        row.className = 'cmd-item';
        if (i === this.selected) row.classList.add('selected');
        row.dataset.id = entry.id;

        const name = createSpan();
        name.className = 'cmd-name';
        name.textContent = entry.name;
        row.appendChild(name);

        if (entry.hotkey) {
          const hk = createSpan();
          hk.className = 'hk';
          const hkKbd = createEl('kbd');
          hkKbd.textContent = entry.hotkey;
          hk.appendChild(hkKbd);
          row.appendChild(hk);
        }

        row.addEventListener('click', () => {
          this.selected = i;
          this.runSelected();
        });
        this.listEl.appendChild(row);
        i++;
      }
    }
  }

  private handleKey(e: KeyboardEvent): void {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.selected = Math.min(this.results.length - 1, this.selected + 1);
      this.renderList();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.selected = Math.max(0, this.selected - 1);
      this.renderList();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      this.runSelected();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
    }
  }

  private runSelected(): void {
    const entry = this.results[this.selected];
    if (!entry) return;
    const commands = (this.app as unknown as { commands: { executeCommandById(id: string): boolean } }).commands;
    commands.executeCommandById(entry.id);
    this.close();
  }
}

function collectCommands(app: App): PaletteEntry[] {
  const commands = (app as unknown as { commands?: { commands?: Record<string, ObsidianCommand> } }).commands;
  const map = commands?.commands ?? {};
  const prefix = `${COMMAND_ID_PREFIX}:`;
  const out: PaletteEntry[] = [];
  for (const [id, def] of Object.entries(map)) {
    if (!id.startsWith(prefix)) continue;
    const group = deriveGroup(id);
    const hotkey = def.hotkeys?.[0] ? formatHotkey(def.hotkeys[0]) : undefined;
    out.push({ id, name: def.name, group, hotkey });
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

function deriveGroup(id: string): string {
  const parts = id.split(':');
  if (parts.length < 3) return 'General';
  const segment = parts[1] ?? 'general';
  return segment[0]?.toUpperCase() + segment.slice(1);
}

function formatHotkey(hk: { modifiers: string[]; key: string }): string {
  return `${hk.modifiers.join('+')}+${hk.key}`;
}

function appendKbdHint(
  el: HTMLElement,
  items: Array<{ keys: string[]; label: string }>,
): void {
  items.forEach((item, idx) => {
    if (idx > 0) el.appendText(' · ');
    for (const k of item.keys) {
      const kbd = createEl('kbd');
      kbd.textContent = k;
      el.appendChild(kbd);
    }
    el.appendText(` ${item.label}`);
  });
}
