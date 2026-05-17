// Minimal Obsidian API surface for unit tests. Records calls so tests can
// assert against them. Real Obsidian behavior is verified in the manual
// smoke test (tests/manual-checklist.md); this stub only covers the shape
// the plugin's compile-time code references.

export class Plugin {
  app: App = new App();
  manifest = { id: 'workdesk-operating-system', dir: '.obsidian/plugins/workdesk-operating-system' } as { id: string; dir: string };
  private _data: unknown = null;
  _ribbonCalls: Array<{ icon: string; title: string }> = [];
  _ribbonElements: HTMLElement[] = [];
  async loadData(): Promise<unknown> { return this._data; }
  async saveData(v: unknown): Promise<void> { this._data = v; }
  registerView(_type: string, _factory: unknown): void {}
  registerExtensions(_exts: string[], _viewType: string): void {}
  registerDomEvent(_el: Element | Document | Window, _evt: string, _cb: unknown): void {}
  registerEditorExtension(_ext: unknown): void {}
  registerEvent(_evtRef: unknown): void {}
  register(_cb: () => unknown): void {}
  addCommand(c: { id: string; name: string; callback?: () => void; hotkeys?: unknown }): void {
    this.app.commands.commands[c.id] = c;
  }
  addSettingTab(_tab: unknown): void {}
  addRibbonIcon(icon: string, title: string, cb: (evt: MouseEvent) => unknown): HTMLElement {
    this._ribbonCalls.push({ icon, title });
    const el = document.createElement('div');
    el.classList.add('side-dock-ribbon-action');
    el.dataset.iconName = icon;
    el.addEventListener('click', (e) => { cb(e as MouseEvent); });
    this._ribbonElements.push(el);
    return el;
  }
  async onload(): Promise<void> {}
  async onunload(): Promise<void> {}
}

export class App {
  workspace = new Workspace();
  vault = new Vault();
  commands = { commands: {} as Record<string, unknown>, executeCommandById: (_id: string) => true };
  secretStorage = {
    _store: new Map<string, string>(),
    _getCalls: [] as string[],
    _setCalls: [] as Array<{ id: string; value: string }>,
    getSecret(id: string): string | null {
      this._getCalls.push(id);
      return this._store.get(id) ?? null;
    },
    setSecret(id: string, value: string): void {
      this._setCalls.push({ id, value });
      this._store.set(id, value);
    },
    listSecrets(): string[] {
      return Array.from(this._store.keys());
    },
  };
}

export class WorkspaceSidedock {
  collapsed = false;
  _collapseCalls = 0;
  _expandCalls = 0;
  collapse(): void { this.collapsed = true; this._collapseCalls += 1; }
  expand(): void { this.collapsed = false; this._expandCalls += 1; }
}

export class Workspace {
  layoutReady = true;
  leftSplit: WorkspaceSidedock = new WorkspaceSidedock();
  rightSplit: WorkspaceSidedock = new WorkspaceSidedock();
  _getLeftLeafCalls = 0;
  _getRightLeafCalls = 0;
  _getLeafTabCalls = 0;
  _setViewStateCalls: Array<{ type: string }> = [];
  _revealLeafCalls = 0;
  _openLinkTextCalls: Array<{ link: string; src: string; newLeaf: boolean }> = [];
  _seededLeavesByType: Record<string, Array<{ view: unknown; setViewState: (s: { type: string }) => Promise<void> }>> = {};

  on(_evt: string, _cb: unknown): unknown { return { _evt: _evt, _cb: _cb }; }
  onLayoutReady(cb: () => void): void { cb(); }

  _seedLeaf(type: string, viewMock: unknown): void {
    this._seededLeavesByType[type] = this._seededLeavesByType[type] ?? [];
    this._seededLeavesByType[type]!.push({
      view: viewMock,
      setViewState: async (s: { type: string }) => { this._setViewStateCalls.push(s); },
    });
  }

  getLeavesOfType(type: string): WorkspaceLeaf[] {
    const seeded = this._seededLeavesByType[type] ?? [];
    return seeded as unknown as WorkspaceLeaf[];
  }

  getLeftLeaf(_split: boolean): WorkspaceLeaf | null {
    this._getLeftLeafCalls += 1;
    const view = {
      setZones: (..._args: unknown[]) => { /* mock */ },
      setActiveZone: (..._args: unknown[]) => { /* mock */ },
    };
    const stub = {
      view,
      setViewState: async (s: { type: string }) => { this._setViewStateCalls.push(s); },
    };
    this._seededLeavesByType['workdesk-zone'] = this._seededLeavesByType['workdesk-zone'] ?? [];
    this._seededLeavesByType['workdesk-zone']!.push(stub);
    return stub as unknown as WorkspaceLeaf;
  }

  getRightLeaf(_split: boolean): WorkspaceLeaf | null {
    this._getRightLeafCalls += 1;
    const view = { openNewSession: () => { /* mock */ } };
    const stub = {
      view,
      setViewState: async (s: { type: string }) => { this._setViewStateCalls.push(s); },
    };
    this._seededLeavesByType['workdesk-terminal'] = this._seededLeavesByType['workdesk-terminal'] ?? [];
    this._seededLeavesByType['workdesk-terminal']!.push(stub);
    return stub as unknown as WorkspaceLeaf;
  }

  getLeaf(_mode?: boolean | 'tab' | 'split'): WorkspaceLeaf {
    this._getLeafTabCalls += 1;
    const stub = {
      view: {},
      setViewState: async (s: { type: string }) => { this._setViewStateCalls.push(s); },
    };
    return stub as unknown as WorkspaceLeaf;
  }

  async revealLeaf(_leaf: unknown): Promise<void> {
    this._revealLeafCalls += 1;
  }

  async openLinkText(link: string, src: string, newLeaf?: boolean): Promise<void> {
    this._openLinkTextCalls.push({ link, src, newLeaf: !!newLeaf });
  }

  getActiveViewOfType<T>(_ctor: new (...args: never[]) => T): T | null { return null; }
}

export class WorkspaceLeaf {
  view: View | null = null;
  async setViewState(_s: { type: string; active?: boolean }): Promise<void> {}
}

export class View {
  containerEl: HTMLElement = document.createElement('div');
  contentEl: HTMLElement = document.createElement('div');
  getViewType(): string { return 'stub-view'; }
  getDisplayText(): string { return 'Stub'; }
  getIcon(): string { return 'file'; }
  async onload(): Promise<void> {}
  async onunload(): Promise<void> {}
}

export class ItemView extends View {
  leaf: WorkspaceLeaf;
  constructor(leaf: WorkspaceLeaf) { super(); this.leaf = leaf; }
}

export class FileView extends ItemView {
  file: TFile | null = null;
  allowNoFile = false;
  async onLoadFile(_f: TFile): Promise<void> {}
  async onUnloadFile(_f: TFile): Promise<void> {}
}

export class TFile { path = ''; basename = ''; extension = 'md'; name = ''; }
export class TFolder { path = ''; name = ''; children: Array<TFile | TFolder> = []; }
export class TAbstractFile { path = ''; name = ''; }

export class Vault {
  _createCalls: Array<{ path: string; data: string }> = [];
  _appendCalls: Array<{ path: string; data: string }> = [];
  _files = new Map<string, string>();
  adapter = {
    exists: async (p: string): Promise<boolean> => this._files.has(p),
    read: async (p: string): Promise<string> => this._files.get(p) ?? '',
    write: async (p: string, data: string): Promise<void> => {
      this._files.set(p, data);
    },
    append: async (p: string, data: string): Promise<void> => {
      const prior = this._files.get(p) ?? '';
      this._files.set(p, prior + data);
      this.__owner._appendCalls.push({ path: p, data });
    },
  };
  __owner = this;
  async read(_f: TFile): Promise<string> { return ''; }
  async cachedRead(_f: TFile): Promise<string> { return ''; }
  async create(path: string, data: string): Promise<TFile> {
    this._createCalls.push({ path, data });
    this._files.set(path, data);
    const f = new TFile();
    f.path = path;
    return f;
  }
  async createFolder(_path: string): Promise<void> {}
  getAbstractFileByPath(_p: string): TAbstractFile | null { return null; }
  getMarkdownFiles(): TFile[] { return []; }
  getFiles(): TFile[] { return []; }
  getRoot(): TFolder { return new TFolder(); }
  on(_evt: string, _cb: unknown): void {}
}

export class Notice { constructor(_msg: string, _ms?: number) {} }
export function setIcon(_el: HTMLElement, _name: string): void {}

// FileSystemAdapter — desktop adapter type. Real Obsidian narrows
// app.vault.adapter via `instanceof FileSystemAdapter`; the stub lets that
// guard fall through to the test fallback path.
export class FileSystemAdapter {
  getBasePath(): string { return ''; }
}

// Minimal YAML loader using JSON-only subset. Tests that exercise the zone
// scanner stub their own data, so the loader only needs to handle the test
// fixtures' shapes. parseYaml in real Obsidian uses js-yaml under the hood.
export function parseYaml(input: string): unknown {
  // Lightweight YAML — supports the subset used by fixtures/zones.yaml +
  // fixtures/object-icons.yaml. Empty strings → undefined.
  if (!input.trim()) return undefined;
  // Lazy require so the dep stays test-only.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const yaml = require('js-yaml') as { load(s: string): unknown };
  return yaml.load(input);
}
export function stringifyYaml(input: unknown): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const yaml = require('js-yaml') as { dump(o: unknown): string };
  return yaml.dump(input);
}

// Module-level addIcon registry — Obsidian's addIcon is a top-level export.
const _iconCalls: Array<{ name: string; svg: string }> = [];
export function addIcon(name: string, svg: string): void {
  _iconCalls.push({ name, svg });
}
export function _getIconCalls(): ReadonlyArray<{ name: string; svg: string }> {
  return _iconCalls;
}
export function _resetTestStubs(): void {
  _iconCalls.length = 0;
}

export interface RequestUrlParam {
  url: string;
  method?: string;
  contentType?: string;
  body?: string | ArrayBuffer;
  headers?: Record<string, string>;
  throw?: boolean;
}
export interface RequestUrlResponse {
  status: number;
  text: string;
  json?: unknown;
  headers?: Record<string, string>;
}

let _requestUrlImpl: ((p: RequestUrlParam) => Promise<RequestUrlResponse>) | null = null;
export function __setRequestUrlMock(fn: ((p: RequestUrlParam) => Promise<RequestUrlResponse>) | null): void {
  _requestUrlImpl = fn;
}
export async function requestUrl(p: RequestUrlParam): Promise<RequestUrlResponse> {
  if (_requestUrlImpl) return _requestUrlImpl(p);
  return { status: 200, text: '{}', json: {} };
}

export class Setting {
  containerEl: HTMLElement;
  constructor(containerEl: HTMLElement) {
    this.containerEl = containerEl;
  }
  setName(n: string): this {
    const el = document.createElement('div');
    el.className = 'setting-item-name';
    el.textContent = n;
    this.containerEl.appendChild(el);
    return this;
  }
  setDesc(d: string): this {
    const el = document.createElement('div');
    el.className = 'setting-item-description';
    el.textContent = d;
    this.containerEl.appendChild(el);
    return this;
  }
  addText(cb: (t: { setValue: (v: string) => unknown; onChange: (fn: (v: string) => void) => unknown }) => unknown): this {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'setting-text';
    this.containerEl.appendChild(input);
    cb({
      setValue: (v) => { input.value = v; return input; },
      onChange: (fn) => { input.addEventListener('input', () => fn(input.value)); return input; },
    });
    return this;
  }
  addToggle(cb: (t: { setValue: (v: boolean) => unknown; onChange: (fn: (v: boolean) => void) => unknown }) => unknown): this {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'setting-toggle';
    this.containerEl.appendChild(input);
    cb({
      setValue: (v) => { input.checked = v; return input; },
      onChange: (fn) => { input.addEventListener('change', () => fn(input.checked)); return input; },
    });
    return this;
  }
  addDropdown(cb: (t: { addOption: (v: string, n: string) => unknown; setValue: (v: string) => unknown; onChange: (fn: (v: string) => void) => unknown }) => unknown): this {
    const select = document.createElement('select');
    select.className = 'setting-select';
    this.containerEl.appendChild(select);
    cb({
      addOption: (v, n) => {
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = n;
        select.appendChild(opt);
        return select;
      },
      setValue: (v) => { select.value = v; return select; },
      onChange: (fn) => { select.addEventListener('change', () => fn(select.value)); return select; },
    });
    return this;
  }
}
export class PluginSettingTab {
  app: App; plugin: unknown;
  containerEl: HTMLElement = document.createElement('div');
  constructor(app: App, plugin: unknown) { this.app = app; this.plugin = plugin; }
  display(): void {}
  hide(): void {}
}

export class Modal {
  app: App;
  containerEl: HTMLElement = document.createElement('div');
  contentEl: HTMLElement = document.createElement('div');
  titleEl: HTMLElement = document.createElement('div');
  scope = { register: (_mods: string[], _key: string, _cb: () => void) => {} };
  constructor(app: App) {
    this.app = app;
    this.containerEl.appendChild(this.titleEl);
    this.containerEl.appendChild(this.contentEl);
  }
  open(): void {
    document.body.appendChild(this.containerEl);
    this.onOpen();
  }
  close(): void {
    this.onClose();
    this.containerEl.remove();
  }
  onOpen(): void {}
  onClose(): void {}
}

export class SuggestModal<T> extends Modal {
  // Minimal happy-dom stub for vendored vin's OutputCaptureModal. Tests only
  // import the class so the module loads; they don't open the modal or
  // exercise suggestion rendering.
  inputEl: HTMLInputElement = document.createElement('input');
  resultContainerEl: HTMLElement = document.createElement('div');
  setPlaceholder(_text: string): void {}
  emptyStateText = '';
  getSuggestions(_query: string): T[] | Promise<T[]> { return []; }
  renderSuggestion(_value: T, _el: HTMLElement): void {}
  onChooseSuggestion(_value: T, _evt: MouseEvent | KeyboardEvent): void {}
}

export class Menu {
  private items: Array<{ title: string; callback: () => void }> = [];
  addItem(cb: (item: {
    setTitle: (t: string) => unknown;
    setIcon: (n: string) => unknown;
    onClick: (fn: () => void) => unknown;
  }) => void): this {
    let title = '';
    let onClick = (): void => {};
    cb({
      setTitle: (t: string) => { title = t; return this; },
      setIcon: (_n: string) => this,
      onClick: (fn: () => void) => { onClick = fn; return this; },
    });
    this.items.push({ title, callback: onClick });
    return this;
  }
  showAtMouseEvent(_evt: MouseEvent): void {}
  showAtPosition(_pos: { x: number; y: number }): void {}
  hide(): void {}
}

export class SecretComponent {
  containerEl: HTMLElement;
  app: App;
  private value = '';
  private input: HTMLInputElement;
  constructor(app: App, containerEl: HTMLElement) {
    this.app = app;
    this.containerEl = containerEl;
    this.input = document.createElement('input');
    this.input.type = 'password';
    this.input.className = 'setting-secret';
    containerEl.appendChild(this.input);
  }
  setValue(v: string): this {
    this.value = v;
    this.input.value = v;
    return this;
  }
  getValue(): string {
    return this.value;
  }
  onChange(cb: (v: string) => void): this {
    this.input.addEventListener('input', () => {
      this.value = this.input.value;
      cb(this.value);
    });
    return this;
  }
}
