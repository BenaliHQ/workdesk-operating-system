// Pulls a single secret value from Infisical via the CLI.
//
// Authentication uses the operator's existing `infisical login` session —
// the plugin doesn't manage credentials itself. Args are passed as an
// array so there's no shell-string assembly; secret name and project ID
// are URL-safe by Infisical's own rules so they're already safe to pass
// verbatim, but the array form keeps that promise honest.
//
// Returns the trimmed secret value on success. Throws on any failure
// (binary missing, auth expired, secret not found, env not present) with
// a message suitable for surfacing in a toast.

import { spawn } from 'child_process';

const DEFAULT_BIN = '/opt/homebrew/bin/infisical';
const DEFAULT_TIMEOUT_MS = 10_000;

export interface InfisicalFetchOptions {
  projectId: string;
  secretName: string;
  environment: string;
  /** Override the binary path. Defaults to Homebrew location. */
  binary?: string;
  /** Override the spawn function (test injection). */
  spawnFn?: typeof spawn;
  /** Override the kill-after timeout. */
  timeoutMs?: number;
}

export async function fetchInfisicalSecret(opts: InfisicalFetchOptions): Promise<string> {
  if (!opts.projectId.trim()) throw new Error('Infisical project ID is not set.');
  if (!opts.secretName.trim()) throw new Error('Infisical secret name is not set.');
  if (!opts.environment.trim()) throw new Error('Infisical environment is not set.');

  const bin = opts.binary ?? DEFAULT_BIN;
  const spawnImpl = opts.spawnFn ?? spawn;
  const args = [
    'secrets',
    'get',
    opts.secretName,
    `--projectId=${opts.projectId}`,
    `--env=${opts.environment}`,
    '--plain',
  ];

  return new Promise<string>((resolve, reject) => {
    const child = spawnImpl(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    // eslint-disable-next-line obsidianmd/prefer-active-window-timers -- service runs outside a window context (Node child_process), activeWindow may not exist in tests.
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`Infisical CLI timed out after ${opts.timeoutMs ?? DEFAULT_TIMEOUT_MS}ms.`));
    }, opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);

    child.stdout?.on('data', (chunk: Buffer | string) => { stdout += chunk.toString(); });
    child.stderr?.on('data', (chunk: Buffer | string) => { stderr += chunk.toString(); });
    child.on('error', (err: Error) => {
      // eslint-disable-next-line obsidianmd/prefer-active-window-timers -- pairs with setTimeout above.
      clearTimeout(timer);
      const hint = err.message.includes('ENOENT')
        ? `Infisical CLI not found at ${bin}. Install with: npm install -g @infisical/cli`
        : err.message;
      reject(new Error(hint));
    });
    child.on('close', (code: number | null) => {
      // eslint-disable-next-line obsidianmd/prefer-active-window-timers -- pairs with setTimeout above.
      clearTimeout(timer);
      if (code !== 0) {
        const msg = stderr.trim() || stdout.trim() || `Infisical CLI exited with code ${code}`;
        reject(new Error(friendlyError(msg)));
        return;
      }
      const value = stdout.trim();
      if (!value) {
        reject(new Error(`Infisical returned an empty value for ${opts.secretName}.`));
        return;
      }
      resolve(value);
    });
  });
}

function friendlyError(raw: string): string {
  if (/not.*logged.*in|login.*required|unauthorized/i.test(raw)) {
    return 'Infisical CLI is not authenticated. Run `infisical login` in a terminal.';
  }
  if (/secret.*not.*found|404/i.test(raw)) {
    return 'Secret not found in this project + environment. Check the name and env.';
  }
  if (/project.*not.*found/i.test(raw)) {
    return 'Project ID not recognized by Infisical.';
  }
  return raw.split('\n')[0];
}
