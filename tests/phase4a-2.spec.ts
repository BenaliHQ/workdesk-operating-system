import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { mountComposer } from '../src/terminal/composer';
import { getXtermTheme } from '../src/terminal/theme-bridge';

beforeEach(() => {
  document.body.innerHTML = '';
});

function injectTokens(): void {
  const tokens = readFileSync(resolve(__dirname, '..', 'styles/tokens.css'), 'utf8');
  const style = document.createElement('style');
  style.textContent = tokens;
  document.head.appendChild(style);
}

describe('phase 4a.2 · composer DOM shape', () => {
  it('mounts term-composer with all required parts', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const c = mountComposer(root, { onSend: () => {} });

    expect(c.element.classList.contains('term-composer')).toBe(true);
    expect(root.querySelector('.composer-shell')).not.toBeNull();
    expect(root.querySelector('.composer-prompt')?.textContent).toBe('▌');
    expect(c.textarea.classList.contains('composer-input')).toBe(true);
    expect(c.attachButton.classList.contains('composer-icon')).toBe(true);
    expect(c.sendButton.classList.contains('composer-send')).toBe(true);
    expect(c.metaStrip.classList.contains('composer-meta')).toBe(true);
    expect(root.querySelector('.composer-meta-l')).not.toBeNull();
    expect(root.querySelector('.composer-meta-r')).not.toBeNull();
  });
});

describe('phase 4a.2 · send wiring', () => {
  it('send button click forwards textarea + clears', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const calls: string[] = [];
    const c = mountComposer(root, { onSend: (t) => calls.push(t) });
    c.setValue('hello');
    c.sendButton.click();
    expect(calls).toEqual(['hello']);
    expect(c.getValue()).toBe('');
  });

  it('send button is disabled when input is empty', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const c = mountComposer(root, { onSend: () => {} });
    expect(c.sendButton.disabled).toBe(true);
    c.setValue('x');
    expect(c.sendButton.disabled).toBe(false);
    expect(c.sendButton.classList.contains('has-input')).toBe(true);
  });
});

describe('phase 4a.2 · keymap', () => {
  function press(target: HTMLElement, init: KeyboardEventInit): void {
    target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }));
  }

  it('Enter sends and clears', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const calls: string[] = [];
    const c = mountComposer(root, { onSend: (t) => calls.push(t) });
    c.setValue('one');
    press(c.textarea, { key: 'Enter' });
    expect(calls).toEqual(['one']);
    expect(c.getValue()).toBe('');
  });

  it('Cmd+Enter (⌘↵) sends as well', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const calls: string[] = [];
    const c = mountComposer(root, { onSend: (t) => calls.push(t) });
    c.setValue('two');
    press(c.textarea, { key: 'Enter', metaKey: true });
    expect(calls).toEqual(['two']);
  });

  it('Shift+Enter does NOT send (textarea handles newline)', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const calls: string[] = [];
    const c = mountComposer(root, { onSend: (t) => calls.push(t) });
    c.setValue('line1');
    const evt = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true, cancelable: true });
    c.textarea.dispatchEvent(evt);
    expect(calls).toEqual([]);
    expect(evt.defaultPrevented).toBe(false);
  });

  it('↑ recalls most recent message into the textarea', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const c = mountComposer(root, { onSend: () => {} });
    c.setValue('first');
    press(c.textarea, { key: 'Enter' });
    c.setValue('second');
    press(c.textarea, { key: 'Enter' });
    expect(c.getValue()).toBe('');
    press(c.textarea, { key: 'ArrowUp' });
    expect(c.getValue()).toBe('second');
    press(c.textarea, { key: 'ArrowUp' });
    expect(c.getValue()).toBe('first');
    press(c.textarea, { key: 'ArrowDown' });
    expect(c.getValue()).toBe('second');
    press(c.textarea, { key: 'ArrowDown' });
    expect(c.getValue()).toBe('');
  });

  it('Esc blurs the textarea', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const c = mountComposer(root, { onSend: () => {} });
    c.textarea.focus();
    expect(document.activeElement).toBe(c.textarea);
    press(c.textarea, { key: 'Escape' });
    expect(document.activeElement).not.toBe(c.textarea);
  });
});

describe('phase 4a.2 · attach falls back to inserting [[', () => {
  it('clicking attach inserts [[ at cursor when no handler', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const c = mountComposer(root, { onSend: () => {} });
    c.setValue('foo');
    c.textarea.selectionStart = c.textarea.selectionEnd = 3;
    c.attachButton.click();
    expect(c.getValue()).toBe('foo[[');
  });

  it('custom onAttach overrides the default', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    let calls = 0;
    const c = mountComposer(root, { onSend: () => {}, onAttach: () => calls++ });
    c.attachButton.click();
    expect(calls).toBe(1);
    expect(c.getValue()).toBe('');
  });
});

describe('phase 4a.2 · ANSI palette resolves to tokens', () => {
  it('getXtermTheme reads --ws-term-* values when tokens are present', () => {
    injectTokens();
    document.body.classList.remove('theme-dark');
    const theme = getXtermTheme();
    expect(typeof theme.background).toBe('string');
    expect(typeof theme.foreground).toBe('string');
    expect(typeof theme.red).toBe('string');
    expect(typeof theme.green).toBe('string');
    expect(typeof theme.blue).toBe('string');
    expect((theme.red as string).length).toBeGreaterThan(0);
    expect((theme.green as string).length).toBeGreaterThan(0);
    expect((theme.blue as string).length).toBeGreaterThan(0);
  });

  it('returns 16 distinct ANSI slot values', () => {
    const theme = getXtermTheme();
    const slots = [
      theme.black, theme.red, theme.green, theme.yellow,
      theme.blue, theme.magenta, theme.cyan, theme.white,
      theme.brightBlack, theme.brightRed, theme.brightGreen, theme.brightYellow,
      theme.brightBlue, theme.brightMagenta, theme.brightCyan, theme.brightWhite,
    ];
    expect(slots.length).toBe(16);
    for (const v of slots) expect(typeof v).toBe('string');
  });
});
