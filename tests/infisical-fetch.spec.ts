import { describe, it, expect } from 'vitest';
import { EventEmitter } from 'events';
import { fetchInfisicalSecret } from '../src/services/infisical-fetch';

class FakeChild extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  killed = false;
  kill(signal?: string): boolean {
    this.killed = true;
    this.emit('close', signal === 'SIGKILL' ? 137 : 0);
    return true;
  }
}

interface SpawnLog { bin: string; args: readonly string[]; }

function makeSpawn(behavior: (child: FakeChild) => void): {
  spawn: (bin: string, args: readonly string[]) => FakeChild;
  log: SpawnLog[];
} {
  const log: SpawnLog[] = [];
  const spawn = (bin: string, args: readonly string[]): FakeChild => {
    log.push({ bin, args });
    const child = new FakeChild();
    setTimeout(() => behavior(child), 0);
    return child;
  };
  return { spawn, log };
}

describe('fetchInfisicalSecret', () => {
  it('passes args as an array, returns the trimmed stdout value', async () => {
    const { spawn, log } = makeSpawn((child) => {
      child.stdout.emit('data', Buffer.from('gsk_test_token_value\n'));
      child.emit('close', 0);
    });

    const value = await fetchInfisicalSecret({
      projectId: 'df755029-aaaa-bbbb',
      secretName: 'PERSONAL_GROQ_WHISPER_API_KEY',
      environment: 'prod',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test injection
      spawnFn: spawn as any,
    });

    expect(value).toBe('gsk_test_token_value');
    expect(log).toHaveLength(1);
    expect(log[0]!.args).toEqual([
      'secrets',
      'get',
      'PERSONAL_GROQ_WHISPER_API_KEY',
      '--projectId=df755029-aaaa-bbbb',
      '--env=prod',
      '--plain',
    ]);
  });

  it('rejects with a friendly message when the CLI is not logged in', async () => {
    const { spawn } = makeSpawn((child) => {
      child.stderr.emit('data', Buffer.from('Error: not logged in\n'));
      child.emit('close', 1);
    });

    await expect(
      fetchInfisicalSecret({
        projectId: 'p',
        secretName: 's',
        environment: 'prod',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test injection
        spawnFn: spawn as any,
      }),
    ).rejects.toThrow(/not authenticated/i);
  });

  it('rejects when a secret is not found in the requested env', async () => {
    const { spawn } = makeSpawn((child) => {
      child.stderr.emit('data', Buffer.from('secret not found in env=prod\n'));
      child.emit('close', 1);
    });

    await expect(
      fetchInfisicalSecret({
        projectId: 'p',
        secretName: 'MISSING',
        environment: 'prod',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test injection
        spawnFn: spawn as any,
      }),
    ).rejects.toThrow(/secret not found/i);
  });

  it('rejects with a helpful message when the binary is missing', async () => {
    const { spawn } = makeSpawn((child) => {
      const err = new Error('spawn ENOENT') as Error & { code: string };
      err.code = 'ENOENT';
      child.emit('error', err);
    });

    await expect(
      fetchInfisicalSecret({
        projectId: 'p',
        secretName: 's',
        environment: 'prod',
        binary: '/nonexistent/infisical',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test injection
        spawnFn: spawn as any,
      }),
    ).rejects.toThrow(/not found at \/nonexistent\/infisical/);
  });

  it('rejects on empty stdout even with a zero exit code', async () => {
    const { spawn } = makeSpawn((child) => {
      child.stdout.emit('data', Buffer.from('   \n'));
      child.emit('close', 0);
    });

    await expect(
      fetchInfisicalSecret({
        projectId: 'p',
        secretName: 'EMPTY',
        environment: 'prod',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test injection
        spawnFn: spawn as any,
      }),
    ).rejects.toThrow(/empty value for EMPTY/);
  });

  it('rejects up-front when required inputs are missing', async () => {
    await expect(
      fetchInfisicalSecret({ projectId: '', secretName: 'x', environment: 'prod' }),
    ).rejects.toThrow(/project ID is not set/);

    await expect(
      fetchInfisicalSecret({ projectId: 'p', secretName: '', environment: 'prod' }),
    ).rejects.toThrow(/secret name is not set/);

    await expect(
      fetchInfisicalSecret({ projectId: 'p', secretName: 'x', environment: '' }),
    ).rejects.toThrow(/environment is not set/);
  });
});
