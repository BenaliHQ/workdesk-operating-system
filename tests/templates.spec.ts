import { describe, it, expect } from 'vitest';
import { applyTemplateVariables, formatDate } from '../src/services/templates';

const NOW = new Date(2026, 4, 17, 9, 3, 7); // 2026-05-17 09:03:07 local

describe('templates · formatDate', () => {
  it('substitutes the canonical tokens', () => {
    expect(formatDate(NOW, 'YYYY-MM-DD')).toBe('2026-05-17');
    expect(formatDate(NOW, 'DD/MM/YYYY')).toBe('17/05/2026');
    expect(formatDate(NOW, 'HH:mm:ss')).toBe('09:03:07');
  });

  it('passes unrecognized tokens through literally', () => {
    expect(formatDate(NOW, 'YYYY-WW')).toBe('2026-WW');
  });

  it('renders the canonical daily-filename formats used by operator vaults', () => {
    // YYYY-MM-DD — default in WorkdeskSettings.vault.dailyFilenameFormat.
    expect(formatDate(NOW, 'YYYY-MM-DD')).toBe('2026-05-17');
    // YYYY.MM.DD Daily Note — canary-vault convention; the spaces and the
    // literal "Daily Note" must pass through unchanged.
    expect(formatDate(NOW, 'YYYY.MM.DD Daily Note')).toBe('2026.05.17 Daily Note');
  });
});

describe('templates · applyTemplateVariables', () => {
  const ctx = { now: NOW, title: 'sample-note', dateFormat: 'YYYY-MM-DD', timeFormat: 'HH:mm' };

  it('substitutes default {{date}} and {{time}} using the configured formats', () => {
    expect(applyTemplateVariables('Today is {{date}} at {{time}}.', ctx)).toBe(
      'Today is 2026-05-17 at 09:03.',
    );
  });

  it('honors custom formats inline', () => {
    expect(applyTemplateVariables('{{date:DD-MM-YYYY}} · {{time:HH:mm:ss}}', ctx)).toBe(
      '17-05-2026 · 09:03:07',
    );
  });

  it('substitutes {{title}} with the active file basename', () => {
    expect(applyTemplateVariables('# {{title}}', ctx)).toBe('# sample-note');
  });

  it('handles repeated variables and mixed content', () => {
    const raw = '---\ndate: {{date}}\n---\n# {{title}}\n\nCreated {{date}} {{time}}.';
    expect(applyTemplateVariables(raw, ctx)).toBe(
      '---\ndate: 2026-05-17\n---\n# sample-note\n\nCreated 2026-05-17 09:03.',
    );
  });

  it('leaves a template without variables unchanged', () => {
    expect(applyTemplateVariables('Plain text only.', ctx)).toBe('Plain text only.');
  });
});
