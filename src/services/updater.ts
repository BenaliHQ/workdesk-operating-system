// In-plugin updater. Pulls the latest GitHub Release for this plugin,
// compares against the installed manifest.version, downloads the three
// asset files (main.js, manifest.json, styles.css), and writes them
// directly into the plugin folder. Then prompts the operator to reload
// Obsidian so the new code is actually loaded into the renderer.
//
// Self-contained — does not depend on BRAT. Uses Obsidian's `requestUrl`
// to bypass CORS (Electron main-process fetch) and to follow GitHub's
// 302-to-S3 redirects on asset downloads.

import { requestUrl, type Plugin } from 'obsidian';
import { showToast } from '../components/Toast';
import { UpdateReadyModal } from '../modals/UpdateReady';
import { findRecentClaudeSessions, formatResumeNote } from './claude-sessions';
import { VIEW_TYPE_WORKDESK_TERMINAL } from '../constants';

const INBOX_DIR = 'gtd/inbox';

const REPO = 'BenaliHQ/workdesk-operating-system';
const RELEASES_URL = `https://api.github.com/repos/${REPO}/releases/latest`;
const ASSET_NAMES = ['main.js', 'manifest.json', 'styles.css'] as const;
const TOAST_ID = 'workdesk-os-updater';

interface GitHubAsset {
  name: string;
  browser_download_url: string;
}
interface GitHubRelease {
  tag_name: string;
  html_url: string;
  assets: GitHubAsset[];
}

/** Compares two semver strings. Returns >0 if a > b, <0 if a < b, 0 if equal. */
function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((s) => Number.parseInt(s, 10));
  const pb = b.split('.').map((s) => Number.parseInt(s, 10));
  for (let i = 0; i < 3; i++) {
    const ai = pa[i] ?? 0;
    const bi = pb[i] ?? 0;
    if (Number.isNaN(ai) || Number.isNaN(bi)) return 0;
    if (ai !== bi) return ai - bi;
  }
  return 0;
}

export async function checkAndUpdate(plugin: Plugin): Promise<void> {
  const currentVersion = plugin.manifest.version;
  showToast('Checking for WorkDesk updates…', 'loading', { id: TOAST_ID });

  // 1. Fetch latest release metadata.
  let release: GitHubRelease;
  try {
    const res = await requestUrl({
      url: RELEASES_URL,
      method: 'GET',
      headers: { Accept: 'application/vnd.github+json' },
    });
    release = JSON.parse(res.text) as GitHubRelease;
  } catch (err) {
    showToast(`Update check failed: ${String(err)}`, 'error', { id: TOAST_ID, duration: 8000 });
    return;
  }

  const latestVersion = release.tag_name.replace(/^v/, '');

  // 2. Already current.
  if (compareVersions(latestVersion, currentVersion) <= 0) {
    showToast(`WorkDesk is up to date (v${currentVersion}).`, 'success', {
      id: TOAST_ID,
      duration: 4000,
    });
    return;
  }

  // 3. Verify the release has the assets we need.
  const assetByName = new Map(release.assets.map((a) => [a.name, a]));
  for (const name of ASSET_NAMES) {
    if (!assetByName.has(name)) {
      showToast(
        `Release v${latestVersion} is missing ${name}. Cannot self-update — pull manually or wait for the next release.`,
        'error',
        { id: TOAST_ID, duration: 12000 },
      );
      return;
    }
  }

  // 4. Download each asset's body into memory.
  showToast(`Downloading v${latestVersion}…`, 'loading', { id: TOAST_ID });
  const contents: Record<string, string> = {};
  for (const name of ASSET_NAMES) {
    const asset = assetByName.get(name);
    if (!asset) continue; // unreachable; checked above.
    try {
      const res = await requestUrl({ url: asset.browser_download_url, method: 'GET' });
      contents[name] = res.text;
    } catch (err) {
      showToast(`Download of ${name} failed: ${String(err)}`, 'error', {
        id: TOAST_ID,
        duration: 12000,
      });
      return;
    }
  }

  // 5. Sanity-check the downloaded manifest before overwriting on disk.
  let downloadedManifest: { version?: string };
  try {
    downloadedManifest = JSON.parse(contents['manifest.json'] ?? '{}') as { version?: string };
  } catch {
    showToast(
      'Downloaded manifest.json is not valid JSON. Aborting to avoid corrupting the install.',
      'error',
      { id: TOAST_ID, duration: 12000 },
    );
    return;
  }
  if (downloadedManifest.version !== latestVersion) {
    showToast(
      `Manifest version (${String(downloadedManifest.version)}) does not match release tag (${latestVersion}). Aborting.`,
      'error',
      { id: TOAST_ID, duration: 12000 },
    );
    return;
  }

  // 6. Write to plugin folder.
  const pluginDir = plugin.manifest.dir;
  if (!pluginDir) {
    showToast(
      'Plugin directory unknown — cannot write update. Run BRAT or copy main.js + manifest.json + styles.css manually.',
      'error',
      { id: TOAST_ID, duration: 12000 },
    );
    return;
  }
  const adapter = plugin.app.vault.adapter;
  try {
    for (const name of ASSET_NAMES) {
      await adapter.write(`${pluginDir}/${name}`, contents[name] ?? '');
    }
  } catch (err) {
    showToast(`Could not write update to disk: ${String(err)}`, 'error', {
      id: TOAST_ID,
      duration: 12000,
    });
    return;
  }

  // 7. Capture state that the reload will kill: open terminal panes +
  //    recent Claude Code sessions. If any sessions exist, write a resume
  //    note to gtd/inbox/ so the operator can paste the commands into
  //    fresh terminals after reload.
  const terminalCount = plugin.app.workspace.getLeavesOfType(VIEW_TYPE_WORKDESK_TERMINAL).length;
  const sessions = findRecentClaudeSessions();
  let resumeNotePath: string | null = null;
  if (sessions.length > 0) {
    const { filename, content } = formatResumeNote(sessions, currentVersion, latestVersion);
    const adapter = plugin.app.vault.adapter;
    try {
      if (!(await adapter.exists(INBOX_DIR))) {
        await adapter.mkdir(INBOX_DIR);
      }
      const candidate = `${INBOX_DIR}/${filename}`;
      await adapter.write(candidate, content);
      resumeNotePath = candidate;
    } catch (err) {
      console.warn('[workdesk-operating-system] could not write resume note', err);
      // Non-fatal — surface the modal anyway, just without the link.
    }
  }

  // 8. Files are on disk — Obsidian still has the old code in memory until
  //    the renderer reloads. Prompt operator.
  showToast(`Installed v${latestVersion}.`, 'success', { id: TOAST_ID, duration: 4000 });
  new UpdateReadyModal(plugin.app, {
    fromVersion: currentVersion,
    toVersion: latestVersion,
    releaseUrl: release.html_url,
    terminalCount,
    sessionCount: sessions.length,
    resumeNotePath,
  }).open();
}
