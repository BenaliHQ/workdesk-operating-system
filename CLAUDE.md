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

## UI visual-verification gate — never tag before a screenshot

**Rule:** For any release that changes user-visible styling — callouts, links, panes, modals, ribbon, fonts, colors, spacing, borders — the release script does not run until the operator has confirmed the visual rendering, with a screenshot, of what's about to ship. Build-pipeline green (typecheck / vitest / lint / phase7 verify) is necessary but not sufficient. The actual painted result is the contract.

This rule exists because tag-and-push is the **only irreversible step** in the release flow. Once a tag exists, BRAT propagates the assets to every operator's vault on next refresh. Walking that back means cutting a follow-up release that reverses the broken change — there is no clean revert. So the gate sits *before* tag-and-push, where the cost of being wrong is one re-run, not a downstream impact.

### The flow

For any UI-touching change:

1. **Make the edit on a branch.** Commit + push + open the PR as usual.
2. **`pnpm build`.** Confirms typecheck + bundle.
3. **`pnpm preview-callouts`** (or another preview script if the change is outside callouts). Renders a static HTML page that mocks Obsidian's DOM with the freshly-built `styles.css`, captures a headless-Chrome screenshot to `_inputs/callout-preview-<timestamp>.png`.
4. **Surface that screenshot to the operator.** Drop the PNG path in the conversation. Do not paraphrase — let the operator see the pixels.
5. **Wait for an explicit "looks right."** "OK" or "ship it" with no acknowledgment of the screenshot does not count — the operator must signal they saw the image.
6. **(Optional but recommended) install built artifacts into the operator's live vault** (`cp main.js styles.css <vault>/.obsidian/plugins/workdesk-operating-system/`) so the operator can reload Obsidian and confirm the in-host rendering matches the preview screenshot. The preview uses headless Chrome's font loader, not Obsidian's — minor visual drift is possible; the in-vault check catches it.
7. **Then: merge PR → `pnpm release`.** The tag goes out only after step 5 (and ideally 6).

### What the preview script covers and what it doesn't

`scripts/preview-callouts.mjs` covers callouts (six role colors) and wikilinks (internal + external) on a mocked `body.theme-light.workdesk-os-active` with the plugin's container hierarchy applied so the scoped token reassignments fire. It does not cover:

- Zone panes, ribbon, terminal, command palette, modals — add a new preview script for those surfaces when needed (one screenshot per visual region is fine; the preview pattern composes).
- Dark theme — preview-callouts only renders `.theme-light` today. Operators on dark mode get checked in-host.
- Real font rendering — headless Chrome's font shaping differs slightly from Obsidian's Electron runtime. Use step 6 to catch drift.

### What NOT to do

- Do not skip preview-callouts on a "small CSS change." `border-radius: 8px` vs `10px` is the kind of change that lints clean and ships wrong.
- Do not run `pnpm release` until step 5 has happened. The CLAUDE.md release-discipline rule above says "cut a release after landing changes" — this rule scopes *when* that release fires.
- Do not paraphrase the screenshot in conversation ("looks borderless to me"). The operator's eyes are the gate; your description is not a substitute.
- Do not declare the gate satisfied with build-pipeline checks alone. Programmatic verification is necessary but not sufficient for visual changes — this is the lesson named in the 2026-05-24 visual design pass session log, and it bit again on 2026-05-26 (v1.7.1 shipped a borderless callout the operator hadn't asked for). The gate exists because that pattern keeps recurring.

### Source

Operator instruction 2026-05-26 after the v1.7.1 misship: "I want to have this established and standardized so I trust that what we work on and I say to merge and release it[s] actually what people experience on the other end."
