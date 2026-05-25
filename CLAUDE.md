# Workdesk Operating System — Plugin Repo Instructions

## Release discipline — always cut a release after landing changes

**Rule:** After every merge to `main` that lands behavior or visible UI changes, cut a release. Do not leave shipped changes sitting on `main` — BRAT pulls from GitHub Release tags, not from `main` HEAD, so any operator running `/update` (or BRAT's "Check for updates") will receive the OLD release until a new one is tagged.

This applies even if the operator only said "merge" or "ship" — finishing the ship workflow means a tag exists and the release assets are live.

### How

```bash
# Populate CHANGELOG [Unreleased] with what landed in the PR(s).
# Commit + push that change first; the release script refuses to run on an empty [Unreleased].

npm run release minor     # or patch / major — match the change's semver impact
# scripts/release.mjs handles: version bump (manifest.json + versions.json),
# CHANGELOG section rename, build sanity check, commit, tag, push.
# CI (.github/workflows/release.yml) builds main.js + styles.css and attaches
# them to the GitHub Release.
```

### Verify

After the script returns:

```bash
gh release view v<new-version> --json url,assets -q '.url, (.assets[] | .name)'
```

Should list `main.js`, `manifest.json`, `styles.css`, `versions.json`. If any are missing, CI failed — investigate before declaring done.

### Skip only when

- The merge is doc-only (README, CHANGELOG fixups, comment tweaks) that doesn't affect operators' Obsidian experience.
- The merge is a chore that explicitly says "no release" (e.g., CI tweaks, internal scripts).

If in doubt, cut the release.

### What NOT to do

- Do not skip the CHANGELOG `[Unreleased]` population. The release script will refuse, and skipping it loses the audit trail of what shipped.
- Do not hand-roll the version bump in `manifest.json` — the release script syncs `manifest.json`, `versions.json`, and CHANGELOG atomically.
- Do not amend the `chore: release v<X>` commit — if a release is wrong, fix it forward with the next release.
- Do not cut a release with a dirty working tree. The script refuses, but the discipline is to commit fixes separately first.

### Source

Operator instruction 2026-05-25: "anytime we are at it, I'm telling you to update the plugin repo. I want you to also do that so that it's not just happening in the repo. If someone were to update it, they would actually go for it."
