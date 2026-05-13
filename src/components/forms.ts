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

function settingRow(parent: HTMLElement, label: string, description?: string): HTMLElement {
  const row = document.createElement('div');
  row.className = 'setting';

  const meta = document.createElement('div');
  meta.className = 'setting-meta';
  const labelEl = document.createElement('div');
  labelEl.className = 'label';
  labelEl.textContent = label;
  meta.appendChild(labelEl);
  if (description) {
    const desc = document.createElement('div');
    desc.className = 'desc';
    desc.textContent = description;
    meta.appendChild(desc);
  }
  row.appendChild(meta);

  const control = document.createElement('div');
  control.className = 'control';
  row.appendChild(control);

  parent.appendChild(row);
  return control;
}

export function field(parent: HTMLElement, opts: FieldOptions): HTMLInputElement {
  const control = settingRow(parent, opts.label, opts.description);
  const input = document.createElement('input');
  input.type = opts.type ?? 'text';
  input.className = `field${opts.mono ? ' mono' : ''}`;
  if (opts.initial !== undefined) input.value = opts.initial;
  if (opts.placeholder) input.placeholder = opts.placeholder;
  control.appendChild(input);
  if (opts.onChange) {
    input.addEventListener('input', () => opts.onChange?.(input.value));
  }
  return input;
}

export function toggle(parent: HTMLElement, opts: ToggleOptions): HTMLButtonElement {
  const control = settingRow(parent, opts.label, opts.description);
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'toggle';
  btn.setAttribute('role', 'switch');
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
  control.appendChild(btn);
  return btn;
}

export function select(parent: HTMLElement, opts: SelectOptions): HTMLSelectElement {
  const control = settingRow(parent, opts.label, opts.description);
  const sel = document.createElement('select');
  sel.className = 'select';
  for (const c of opts.choices) {
    const opt = document.createElement('option');
    opt.value = c.value;
    opt.textContent = c.label;
    sel.appendChild(opt);
  }
  if (opts.initial !== undefined) sel.value = opts.initial;
  sel.addEventListener('change', () => opts.onChange?.(sel.value));
  control.appendChild(sel);
  return sel;
}

export function segmented(parent: HTMLElement, opts: SegmentedOptions): HTMLElement {
  const control = settingRow(parent, opts.label, opts.description);
  const group = document.createElement('div');
  group.className = 'segmented';
  group.setAttribute('role', 'tablist');
  let value = opts.initial;
  const buttons: HTMLButtonElement[] = [];
  for (const c of opts.choices) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.value = c.value;
    b.textContent = c.label;
    if (c.value === value) b.classList.add('active');
    b.addEventListener('click', () => {
      value = c.value;
      for (const other of buttons) other.classList.toggle('active', other === b);
      opts.onChange?.(value);
    });
    group.appendChild(b);
    buttons.push(b);
  }
  control.appendChild(group);
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
