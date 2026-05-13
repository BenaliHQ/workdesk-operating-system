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
  addCommand(_c: unknown): void {}
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
    get: async (_k: string) => '',
    set: async (_k: string, _v: string) => {},
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
  constructor(_el: HTMLElement) {}
  setName(_n: string): this { return this; }
  setDesc(_d: string): this { return this; }
  addText(_cb: (t: unknown) => unknown): this { return this; }
  addToggle(_cb: (t: unknown) => unknown): this { return this; }
  addDropdown(_cb: (t: unknown) => unknown): this { return this; }
}
export class PluginSettingTab {
  app: App; plugin: unknown;
  containerEl: HTMLElement = document.createElement('div');
  constructor(app: App, plugin: unknown) { this.app = app; this.plugin = plugin; }
  display(): void {}
  hide(): void {}
}
