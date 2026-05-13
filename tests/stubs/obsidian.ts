// Minimal Obsidian API surface for unit tests. Records calls so tests can
// assert against them. Real Obsidian behavior is verified in the manual
// smoke test (tests/manual-checklist.md); this stub only covers the shape
// the plugin's compile-time code references.

export class Plugin {
  app: App = new App();
  manifest = { id: 'workdeskos-plugin' } as { id: string };
  private _data: unknown = null;
  async loadData(): Promise<unknown> { return this._data; }
  async saveData(v: unknown): Promise<void> { this._data = v; }
  registerView(_type: string, _factory: unknown): void {}
  registerExtensions(_exts: string[], _viewType: string): void {}
  registerDomEvent(_el: Element | Document | Window, _evt: string, _cb: unknown): void {}
  registerEditorExtension(_ext: unknown): void {}
  addCommand(c: { id: string; name: string; callback?: () => void; hotkeys?: unknown }): void {
    this.app.commands.commands[c.id] = c;
  }
  addSettingTab(_tab: unknown): void {}
  addRibbonIcon(_icon: string, _title: string, _cb: unknown): HTMLElement {
    return document.createElement('div');
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

export class Workspace {
  layoutReady = true;
  on(_evt: string, _cb: unknown): void {}
  getLeavesOfType(_t: string): WorkspaceLeaf[] { return []; }
  getLeaf(_split?: boolean): WorkspaceLeaf { return new WorkspaceLeaf(); }
  async openLinkText(_link: string, _src: string, _newLeaf?: boolean): Promise<void> {}
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
  async read(_f: TFile): Promise<string> { return ''; }
  async cachedRead(_f: TFile): Promise<string> { return ''; }
  getAbstractFileByPath(_p: string): TAbstractFile | null { return null; }
  getMarkdownFiles(): TFile[] { return []; }
  getFiles(): TFile[] { return []; }
  getRoot(): TFolder { return new TFolder(); }
  on(_evt: string, _cb: unknown): void {}
}

export class Notice { constructor(_msg: string, _ms?: number) {} }
export function setIcon(_el: HTMLElement, _name: string): void {}
export function addIcon(_name: string, _svg: string): void {}

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
