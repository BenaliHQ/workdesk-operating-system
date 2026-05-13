// TerminalSession — owns one xterm.js Terminal + a python3 PTY subprocess.
//
// Reshaped from src/vendor/terminal/main.ts ::class TerminalSession to drop
// upstream UI-side concerns (drop badges, dropzones) that the plugin handles
// in src/terminal/dropzone.ts (phase 4B). The PTY contract — helper script,
// resize escape sequence, environment scrub — is preserved byte-exact.

import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import type { ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PTY_HELPER_PY, buildResizeSequence } from './pty-helper';
import { getXtermTheme } from './theme-bridge';

const FONT_FAMILY =
  "'Geist Mono', 'SF Mono', 'IBM Plex Mono', ui-monospace, 'Cascadia Code', monospace";

export interface TerminalSessionOptions {
  cwd: string;
  cols?: number;
  rows?: number;
  shell?: string;
  fontSize?: number;
  lineHeight?: number;
}

let nextSessionId = 1;

export class TerminalSession {
  readonly id: number;
  name: string;
  readonly containerEl: HTMLElement;
  readonly terminal: Terminal;
  readonly fitAddon: FitAddon;
  process: ChildProcess | null = null;
  private helperScriptPath: string;
  private destroyed = false;
  private dataListeners: Array<(chunk: string) => void> = [];

  constructor(parent: HTMLElement, opts: TerminalSessionOptions) {
    this.id = nextSessionId++;
    this.name = `zsh ${this.id}`;

    this.containerEl = parent.createDiv({ cls: 'workdesk-term-session' });

    this.terminal = new Terminal({
      cursorBlink: true,
      fontSize: opts.fontSize ?? 13,
      lineHeight: opts.lineHeight ?? 1.55,
      letterSpacing: 0.3,
      fontFamily: FONT_FAMILY,
      fontWeight: '400',
      fontWeightBold: '600',
      theme: getXtermTheme(),
      allowProposedApi: true,
    });

    this.fitAddon = new FitAddon();
    this.terminal.loadAddon(this.fitAddon);
    this.terminal.open(this.containerEl);

    this.helperScriptPath = writeHelperScript();
    this.spawnPty(opts);
  }

  private spawnPty(opts: TerminalSessionOptions): void {
    // Defer require until runtime so happy-dom unit tests that don't touch
    // the PTY can still construct a TerminalSession harness in isolation.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { spawn } = require('child_process') as typeof import('child_process');
    const cleanEnv = { ...process.env } as Record<string, string | undefined>;
    delete cleanEnv['CLAUDECODE'];

    this.process = spawn('python3', [this.helperScriptPath], {
      cwd: opts.cwd,
      env: {
        ...cleanEnv,
        TERM: 'xterm-256color',
        LANG: cleanEnv['LANG'] ?? 'en_US.UTF-8',
        VIN_TERM_COLS: String(opts.cols ?? 80),
        VIN_TERM_ROWS: String(opts.rows ?? 24),
      } as NodeJS.ProcessEnv,
    });

    this.terminal.onData((data: string) => {
      this.process?.stdin?.write(data);
    });

    this.process.stdout?.on('data', (data: Buffer) => {
      const chunk = data.toString('utf8');
      this.terminal.write(chunk);
      for (const cb of this.dataListeners) cb(chunk);
    });

    this.process.stderr?.on('data', (data: Buffer) => {
      const chunk = data.toString('utf8');
      this.terminal.write(chunk);
      for (const cb of this.dataListeners) cb(chunk);
    });

    this.process.on('exit', () => {
      if (this.destroyed) return;
      this.terminal.write('\r\n[Process exited]\r\n');
    });

    this.terminal.onResize(({ cols, rows }) => {
      this.process?.stdin?.write(buildResizeSequence(cols, rows));
    });
  }

  onData(cb: (chunk: string) => void): { dispose(): void } {
    this.dataListeners.push(cb);
    return {
      dispose: () => {
        this.dataListeners = this.dataListeners.filter((f) => f !== cb);
      },
    };
  }

  write(data: string): void {
    this.process?.stdin?.write(data);
  }

  fit(): void {
    try {
      this.fitAddon.fit();
    } catch {
      // Ignore — container not yet laid out.
    }
  }

  applyTheme(): void {
    this.terminal.options.theme = getXtermTheme();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    try {
      this.process?.kill('SIGTERM');
    } catch {
      // Ignore — already exited.
    }
    this.terminal.dispose();
    this.containerEl.remove();
    try {
      fs.unlinkSync(this.helperScriptPath);
    } catch {
      // Ignore — best-effort cleanup.
    }
  }
}

function writeHelperScript(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'workdesk-pty-'));
  const file = path.join(dir, 'pty-helper.py');
  fs.writeFileSync(file, PTY_HELPER_PY, { mode: 0o600 });
  return file;
}
