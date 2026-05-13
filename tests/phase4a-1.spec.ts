import { describe, it, expect } from 'vitest';
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PTY_HELPER_PY, buildResizeSequence } from '../src/terminal/pty-helper';
import { getXtermTheme, getAnsiKeys } from '../src/terminal/theme-bridge';
import { TerminalSession } from '../src/terminal/session';

describe('phase 4a.1 · vendored contract', () => {
  it('TerminalSession class import resolves', () => {
    expect(TerminalSession).toBeDefined();
    expect(typeof TerminalSession).toBe('function');
  });

  it('buildResizeSequence emits the OSC R; format used by the helper', () => {
    expect(buildResizeSequence(80, 24)).toBe('\x1b]R;80;24\x07');
  });
});

describe('phase 4a.1 · theme-bridge', () => {
  it('returns all 16 ANSI keys plus background/foreground/cursor/selection', () => {
    const theme = getXtermTheme();
    const ansi = getAnsiKeys();
    for (const k of ansi) {
      expect(theme).toHaveProperty(k);
      expect(typeof theme[k as keyof typeof theme]).toBe('string');
      expect((theme[k as keyof typeof theme] as string).length).toBeGreaterThan(0);
    }
    for (const k of ['background', 'foreground', 'cursor', 'selectionBackground']) {
      expect(theme).toHaveProperty(k);
    }
    expect(ansi.length).toBe(16);
  });
});

describe('phase 4a.1 · PTY spawn smoke test', () => {
  it(
    'python3 + vendored helper roundtrips `echo ok` through zsh',
    async () => {
      const dir = mkdtempSync(join(tmpdir(), 'workdesk-pty-test-'));
      const script = join(dir, 'pty-helper.py');
      writeFileSync(script, PTY_HELPER_PY, { mode: 0o600 });

      const child = spawn('python3', [script], {
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          LANG: 'en_US.UTF-8',
          VIN_TERM_COLS: '80',
          VIN_TERM_ROWS: '24',
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let output = '';
      child.stdout.on('data', (b: Buffer) => {
        output += b.toString('utf8');
      });

      // Wait for the initial prompt to appear, then send the command.
      await waitFor(() => output.length > 0, 4000);
      child.stdin.write('echo ok\r');
      await waitFor(() => /\bok\b/.test(output), 6000);

      expect(output).toMatch(/\bok\b/);

      child.stdin.write('exit\r');
      child.kill('SIGTERM');
      await new Promise<void>((res) => child.on('exit', () => res()));

      try {
        unlinkSync(script);
        rmdirSync(dir);
      } catch {
        // Ignore cleanup races.
      }
    },
    15000,
  );
});

async function waitFor(pred: () => boolean, timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (pred()) return;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error(`waitFor timed out after ${timeoutMs}ms`);
}
