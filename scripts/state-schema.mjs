// zod schema for STATE.json. Used by every script that reads/writes state.
import { z } from 'zod';

const PhaseStatus = z.enum(['PENDING', 'IN_PROGRESS', 'PASS', 'FAIL', 'PARTIAL']);

const Checkpoint = z
  .object({
    step_id: z.string(),
    last_completed: z.string(),
    files_written: z.array(z.string()),
    next_step_hint: z.string(),
  })
  .nullable();

const Phase = z.object({
  status: PhaseStatus,
  commit: z.string().nullable(),
  verified_at: z.string().nullable(),
  checkpoint: Checkpoint,
  error: z.string().optional(),
  partial_files: z.array(z.string()).optional(),
});

const PhaseIds = z.enum(['0', '1', '2', '3', '4a.1', '4a.2', '4b', '5a', '5b', '6a', '6b']);

const FontShas = z.object({
  'dm-sans-400': z.string(),
  'dm-sans-500': z.string(),
  'dm-sans-600': z.string(),
  'manrope-500': z.string(),
  'manrope-600': z.string(),
  'manrope-700': z.string(),
  'geist-mono-400': z.string(),
  'geist-mono-500': z.string(),
});

const Decisions = z.object({
  token_namespace: z.literal('ws'),
  command_prefix: z.literal('workdesk'),
  stt_provider: z.string(),
  stt_multi_provider: z.boolean(),
  stt_key_storage: z.string(),
  claude_binary: z.string(),
  drag_drop_temp: z.string(),
  onboarding_enabled: z.boolean(),
  onboarding_done_item_waived: z.boolean(),
  two_week_dogfood_waived_from_auto_verify: z.boolean(),
  platform: z.literal('macos-desktop-only'),
  vault_workdesk_css_coexist: z.boolean(),
  carry_forward_v0: z.boolean(),
  terminal_vendoring: z.literal('verbatim'),
  terminal_upstream_sha: z.string(),
  context7_required: z.boolean(),
  context7_fallback: z.string(),
  tokens_css_sha256: z.string(),
  app_css_sha256: z.string(),
  icons_js_sha256: z.string(),
  vendored_terminal_main_sha256: z.string(),
  font_shas: FontShas.partial(),
  first_run_gate: z.string(),
  stt_key_api: z.string(),
  min_app_version: z.literal('1.11.4'),
  added_deps: z.array(z.object({ name: z.string(), version: z.string(), reason: z.string(), added_in_session: z.string(), added_in_phase: z.string() })),
  context7_available: z.boolean(),
});

const Runtime = z.object({
  node: z.string(),
  pnpm: z.string(),
  python3_path: z.string(),
  python3_version: z.string(),
});

export const StateSchema = z.object({
  schema: z.literal(2),
  plugin_id: z.literal('workdeskos-plugin'),
  repo_path: z.string(),
  last_session: z.string(),
  phases: z.record(PhaseIds, Phase),
  decisions: Decisions,
  runtime: Runtime,
  log: z.string(),
});

export function readState(fs, path) {
  const raw = JSON.parse(fs.readFileSync(path, 'utf8'));
  return StateSchema.parse(raw);
}

export function writeStateAtomic(fs, path, state) {
  StateSchema.parse(state);
  fs.writeFileSync(`${path}.tmp`, JSON.stringify(state, null, 2));
  fs.renameSync(`${path}.tmp`, path);
}
