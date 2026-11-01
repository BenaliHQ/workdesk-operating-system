// Evaluates the production main.js the way Obsidian mobile loads it: no
// Node/Electron globals, a `require` that only resolves `obsidian` and
// `@codemirror/*`, and an `obsidian` module without the desktop-only
// FileSystemAdapter export. Then runs the plugin lifecycle as a phone and a
// tablet.
//
// Set WORKDESK_MOBILE_BUNDLE=/path/to/main.js to also run these checks
// against an already-built artifact (e.g. a published release asset).
//
// This is a stubbed simulation, not a device run: it cannot reproduce
// WebKit, Capacitor or real Obsidian API behavior.

import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import * as obsidian from 'obsidian';
import { __setPlatformDesktop } from './stubs/obsidian';
// @ts-expect-error -- plain .mjs helper shared with esbuild.config.mjs.
import { mainBundleOptions } from '../scripts/bundle-options.mjs';

const nodeRequire = createRequire(import.meta.url);
const repoRoot = resolve(__dirname, '..');
const externalBundlePath = process.env.WORKDESK_MOBILE_BUNDLE;

const bundles: Record<string, string> = {};

beforeAll(async () => {
  const opts = mainBundleOptions() as Record<string, unknown>;
  const result = await build({
    ...opts,
    absWorkingDir: repoRoot,
    write: false,
    logLevel: 'silent',
  });
  bundles.source = result.outputFiles[0]!.text;
  if (externalBundlePath) bundles.external = readFileSync(externalBundlePath, 'utf8');
}, 60_000);

afterEach(() => {
  __setPlatformDesktop(true);
  document.body.replaceChildren();
});

interface LoadedPlugin {
  app: obsidian.App;
  manifest: Record<string, string>;
  onload(): Promise<void>;
  onunload(): void;
  registerView(type: string, factory: unknown): void;
}

interface Evaluated {
  Plugin: new () => LoadedPlugin;
  requested: string[];
  /** `obsidian` exports the bundle read that the test stub does not define. */
  missingExports: Set<string>;
}

function evaluateOnMobile(code: string): Evaluated {
  const mobileObsidian: Record<string, unknown> = { ...obsidian, FileSystemAdapter: undefined };
  const missingExports = new Set<string>();
  const tracked = new Proxy(mobileObsidian, {
    get(target, key) {
      if (typeof key === 'string' && !(key in target) && key !== '__esModule' && key !== 'then') {
        missingExports.add(key);
      }
      return target[key as string];
    },
  });
  const requested: string[] = [];
  const mobileRequire = (id: string): unknown => {
    requested.push(id);
    if (id === 'obsidian') return tracked;
    if (id.startsWith('@codemirror/')) return nodeRequire(id);
    throw new Error(`Cannot find module '${id}' (not available on Obsidian mobile)`);
  };
  const mod: { exports: Record<string, unknown> } = { exports: {} };
  // Shadow the Node globals Obsidian mobile does not have.
  // eslint-disable-next-line @typescript-eslint/no-implied-eval -- evaluating the built bundle is the point of this test.
  new Function('module', 'exports', 'require', 'process', 'Buffer', 'global', '__dirname', '__filename', code)(
    mod, mod.exports, mobileRequire, undefined, undefined, undefined, undefined, undefined,
  );
  const Plugin = (mod.exports.default ?? mod.exports) as new () => LoadedPlugin;
  return { Plugin, requested, missingExports };
}

const targets = ['source', ...(externalBundlePath ? ['external'] : [])];
const devices = [
  { name: 'iPhone', isPhone: true },
  { name: 'iPad', isPhone: false },
];

describe.each(targets)('%s bundle on Obsidian mobile', (target) => {
  it('has no regex lookbehind (a parse error on iOS before 16.4 that stops the whole plugin)', () => {
    expect(bundles[target]).not.toMatch(/\(\?<[=!]/);
  });

  it.each(devices)('evaluates on $name without requiring any Node or Electron module', ({ isPhone }) => {
    __setPlatformDesktop(false, { isPhone });
    const { Plugin, requested, missingExports } = evaluateOnMobile(bundles[target]!);
    expect(typeof Plugin).toBe('function');
    expect(new Set(requested)).toEqual(new Set(['obsidian', '@codemirror/view', '@codemirror/state']));
    expect([...missingExports]).toEqual([]);
  });

  for (const layoutReady of [true, false]) {
    it.each(devices)(
      `loads and unloads on $name (layout ${layoutReady ? 'ready: enabled from settings' : 'pending: app startup'})`,
      async ({ isPhone }) => {
        __setPlatformDesktop(false, { isPhone });
        const { Plugin, requested, missingExports } = evaluateOnMobile(bundles[target]!);
        const plugin = new Plugin();
        plugin.app = new obsidian.App();
        const queued: Array<() => void> = [];
        if (!layoutReady) plugin.app.workspace.onLayoutReady = (cb: () => void) => { queued.push(cb); };
        const views: string[] = [];
        plugin.registerView = (type: string) => { views.push(type); };

        await plugin.onload();
        for (const cb of queued) cb();
        await new Promise((r) => setTimeout(r, 0));

        expect(views).toEqual(['workdesk-zone', 'workdesk-html']);
        const commandIds = Object.keys(plugin.app.commands.commands);
        expect(commandIds).toContain('workdesk:capture:voice-memo');
        expect(commandIds.some((id) => id.includes(':terminal:'))).toBe(false);
        expect(requested.every((id) => id === 'obsidian' || id.startsWith('@codemirror/'))).toBe(true);
        expect([...missingExports]).toEqual([]);

        plugin.onunload();
      },
    );
  }
});
