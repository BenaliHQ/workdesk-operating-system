// Vitest setup — installs the Obsidian DOM extensions that the plugin
// relies on at runtime but happy-dom does not ship.

type TagOptsLite = { text?: string; cls?: string } | undefined;

function createElImpl<K extends keyof HTMLElementTagNameMap>(
  this: Document | Element,
  tag: K,
  opts?: TagOptsLite,
): HTMLElementTagNameMap[K] {
  // Duck-type instead of instanceof: happy-dom's Document is not === the
  // global Document constructor, but it has the same shape.
  const isDoc = typeof (this as Document).createElement === 'function' && (this as Element).ownerDocument === null;
  const ownerDoc: Document = isDoc ? (this as Document) : ((this as Element).ownerDocument ?? document);
  const el = ownerDoc.createElement(tag);
  if (opts?.text) el.textContent = opts.text;
  if (opts?.cls) el.className = opts.cls;
  if (!isDoc) (this as Element).appendChild(el);
  return el;
}

function installOnInstance(obj: Document | Element): void {
  const rec = obj as unknown as Record<string, unknown>;
  if (typeof rec.createEl !== 'function') {
    rec.createEl = function (this: Document | Element, tag: string, opts?: TagOptsLite) {
      return createElImpl.call(this, tag as keyof HTMLElementTagNameMap, opts);
    };
    rec.createDiv = function (this: Document | Element, opts?: TagOptsLite) {
      return createElImpl.call(this, 'div', opts);
    };
    rec.createSpan = function (this: Document | Element, opts?: TagOptsLite) {
      return createElImpl.call(this, 'span', opts);
    };
  }
}

// Install on the prototypes happy-dom uses (constructor.prototype catches
// every Element subclass too).
const docProto = Object.getPrototypeOf(document) as Document;
installOnInstance(docProto);

const elProto = Object.getPrototypeOf(document.createElement('div')) as Element;
let p: object | null = elProto;
while (p && p !== Object.prototype) {
  installOnInstance(p as Element);
  p = Object.getPrototypeOf(p) as object | null;
}

// Element extensions: empty / appendText / addClass etc. Patch every
// prototype in the chain up to Node so all element types pick them up.
function installElementExtensions(proto: object): void {
  const rec = proto as Record<string, unknown>;
  if (typeof rec.empty !== 'function') {
    rec.empty = function (this: Element) {
      while (this.firstChild) this.removeChild(this.firstChild);
    };
  }
  if (typeof rec.appendText !== 'function') {
    rec.appendText = function (this: Element, text: string) {
      this.appendChild(this.ownerDocument!.createTextNode(text));
    };
  }
  if (typeof rec.addClass !== 'function') {
    rec.addClass = function (this: Element, cls: string) { this.classList.add(cls); };
    rec.removeClass = function (this: Element, cls: string) { this.classList.remove(cls); };
    rec.toggleClass = function (this: Element, cls: string, on?: boolean) {
      this.classList.toggle(cls, on);
    };
    rec.hasClass = function (this: Element, cls: string) { return this.classList.contains(cls); };
  }
}

let q: object | null = elProto;
while (q && q !== Object.prototype) {
  installElementExtensions(q);
  q = Object.getPrototypeOf(q) as object | null;
}

(globalThis as { activeDocument?: Document }).activeDocument = document;
(globalThis as { activeWindow?: Window & typeof globalThis }).activeWindow = window as Window & typeof globalThis;
