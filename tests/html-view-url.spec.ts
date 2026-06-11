// Unit tests for the fileUrlForVaultFile helper in HtmlView.
// Covers: non-FileSystemAdapter (returns null), simple path, path with spaces,
// path with hash character — all via the stub FileSystemAdapter.

import { describe, it, expect } from 'vitest';
import { FileSystemAdapter } from 'obsidian';
import { fileUrlForVaultFile } from '../src/views/HtmlView';

describe('fileUrlForVaultFile', () => {
  it('returns null for a non-FileSystemAdapter adapter', () => {
    expect(fileUrlForVaultFile({}, 'atlas/page.html')).toBeNull();
  });

  it('returns a correct absolute file:// URL for a simple path', () => {
    const adapter = new FileSystemAdapter();
    adapter.basePath = '/Users/op/vault';
    expect(fileUrlForVaultFile(adapter, 'atlas/page.html')).toBe(
      'file:///Users/op/vault/atlas/page.html'
    );
  });

  it('percent-encodes spaces in the path', () => {
    const adapter = new FileSystemAdapter();
    adapter.basePath = '/Users/op/vault';
    const url = fileUrlForVaultFile(adapter, 'atlas/My Page.html');
    expect(url).not.toBeNull();
    expect(url!.startsWith('file:///')).toBe(true);
    expect(url!).toContain('My%20Page.html');
  });

  it('percent-encodes # in the path', () => {
    const adapter = new FileSystemAdapter();
    adapter.basePath = '/Users/op/vault';
    const url = fileUrlForVaultFile(adapter, 'atlas/a#b.html');
    expect(url).not.toBeNull();
    expect(url!.startsWith('file:///')).toBe(true);
    expect(url!).toContain('a%23b.html');
  });
});
