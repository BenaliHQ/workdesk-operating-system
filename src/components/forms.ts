// Shared form components for Settings — .field, .select, .toggle, .segmented, .btn.
//
// These mirror the CSS classes defined in styles/app.css so the runtime DOM
// matches the design spec without any per-section duplication.

export interface FieldOptions {
  label: string;
  description?: string;
  initial?: string;
  placeholder?: string;
  mono?: boolean;
  type?: 'text' | 'password' | 'number';
  onChange?(value: string): void;
}

export interface ToggleOptions {
  label: string;
  description?: string;
  initial?: boolean;
  onChange?(value: boolean): void;
}

export interface SelectOptions {
  label: string;
  description?: string;
  initial?: string;
  choices: Array<{ value: string; label: string }>;
  onChange?(value: string): void;
}

export interface SegmentedOptions {
  label: string;
  description?: string;
  initial: string;
  choices: Array<{ value: string; label: string }>;
  onChange?(value: string): void;
}

export interface ButtonOptions {
  label: string;
  variant?: 'primary' | 'ghost' | 'danger';
  onClick(): void;
}

let _settingIdCounter = 0;
function nextId(prefix: string): string {
  _settingIdCounter += 1;
  return `${prefix}-${_settingIdCounter}`;
}

interface SettingRowHandle {
  control: HTMLElement;
  labelId: string;
  describedById?: string;
}

function settingRow(parent: HTMLElement, label: string, description?: string): SettingRowHandle {
  const row = document.createElement('div');
  row.className = 'setting';
  row.setAttribute('role', 'group');

  const meta = document.createElement('div');
  meta.className = 'setting-meta';
  const labelEl = document.createElement('div');
  labelEl.className = 'label';
  labelEl.textContent = label;
  const labelId = nextId('ws-setting-label');
  labelEl.id = labelId;
  meta.appendChild(labelEl);
  let describedById: string | undefined;
  if (description) {
    const desc = document.createElement('div');
    desc.className = 'desc';
    desc.textContent = description;
    describedById = nextId('ws-setting-desc');
    desc.id = describedById;
    meta.appendChild(desc);
  }
  row.setAttribute('aria-labelledby', labelId);
  row.appendChild(meta);

  const control = document.createElement('div');
  control.className = 'control';
  row.appendChild(control);

  parent.appendChild(row);
  return { control, labelId, describedById };
}

function applyAria(el: HTMLElement, label: string, handle: SettingRowHandle): void {
  el.setAttribute('aria-label', label);
  el.setAttribute('aria-labelledby', handle.labelId);
  if (handle.describedById) el.setAttribute('aria-describedby', handle.describedById);
}

export function field(parent: HTMLElement, opts: FieldOptions): HTMLInputElement {
  const handle = settingRow(parent, opts.label, opts.description);
  const input = document.createElement('input');
  input.type = opts.type ?? 'text';
  input.className = `field${opts.mono ? ' mono' : ''}`;
  input.id = nextId('ws-field');
  applyAria(input, opts.label, handle);
  if (opts.initial !== undefined) input.value = opts.initial;
  if (opts.placeholder) input.placeholder = opts.placeholder;
  handle.control.appendChild(input);
  if (opts.onChange) {
    input.addEventListener('input', () => opts.onChange?.(input.value));
  }
  return input;
}

export function toggle(parent: HTMLElement, opts: ToggleOptions): HTMLButtonElement {
  const handle = settingRow(parent, opts.label, opts.description);
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'toggle';
  btn.setAttribute('role', 'switch');
  applyAria(btn, opts.label, handle);
  let value = opts.initial ?? false;
  const refresh = (): void => {
    btn.setAttribute('aria-checked', value ? 'true' : 'false');
    btn.classList.toggle('is-on', value);
  };
  refresh();
  btn.addEventListener('click', () => {
    value = !value;
    refresh();
    opts.onChange?.(value);
  });
  handle.control.appendChild(btn);
  return btn;
}

export function select(parent: HTMLElement, opts: SelectOptions): HTMLSelectElement {
  const handle = settingRow(parent, opts.label, opts.description);
  const sel = document.createElement('select');
  sel.className = 'select';
  applyAria(sel, opts.label, handle);
  for (const c of opts.choices) {
    const opt = document.createElement('option');
    opt.value = c.value;
    opt.textContent = c.label;
    sel.appendChild(opt);
  }
  if (opts.initial !== undefined) sel.value = opts.initial;
  sel.addEventListener('change', () => opts.onChange?.(sel.value));
  handle.control.appendChild(sel);
  return sel;
}

export function segmented(parent: HTMLElement, opts: SegmentedOptions): HTMLElement {
  const handle = settingRow(parent, opts.label, opts.description);
  const group = document.createElement('div');
  group.className = 'segmented';
  group.setAttribute('role', 'radiogroup');
  group.setAttribute('aria-labelledby', handle.labelId);
  let value = opts.initial;
  const buttons: HTMLButtonElement[] = [];
  for (const c of opts.choices) {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', c.value === value ? 'true' : 'false');
    b.setAttribute('aria-label', `${opts.label}: ${c.label}`);
    b.dataset.value = c.value;
    b.textContent = c.label;
    if (c.value === value) b.classList.add('active');
    b.addEventListener('click', () => {
      value = c.value;
      for (const other of buttons) {
        const matches = other === b;
        other.classList.toggle('active', matches);
        other.setAttribute('aria-checked', matches ? 'true' : 'false');
      }
      opts.onChange?.(value);
    });
    group.appendChild(b);
    buttons.push(b);
  }
  handle.control.appendChild(group);
  return group;
}

export function button(parent: HTMLElement, opts: ButtonOptions): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `btn${opts.variant ? ` ${opts.variant}` : ''}`;
  b.textContent = opts.label;
  b.addEventListener('click', () => opts.onClick());
  parent.appendChild(b);
  return b;
}

export function sectionLabel(parent: HTMLElement, text: string): HTMLElement {
  const el = document.createElement('div');
  el.className = 'settings-section-label';
  el.textContent = text;
  parent.appendChild(el);
  return el;
}
