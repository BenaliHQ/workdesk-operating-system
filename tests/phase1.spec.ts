import { describe, it, expect } from 'vitest';
import { clampWidth } from '../src/layout/splitters';

// Phase 1 ribbon tests deleted in M4 (phase 7).
// The plugin no longer mounts a custom WorkdeskRibbon — see
// `tests/phase7.spec.ts` for the addRibbonIcon × 12 coverage that replaced it.

describe('phase 1 · splitter clamps', () => {
  it('clamps left pane to [240, 560]', () => {
    expect(clampWidth('left', 100)).toBe(240);
    expect(clampWidth('left', 700)).toBe(560);
    expect(clampWidth('left', 340)).toBe(340);
  });

  it('clamps right pane to [280, 600]', () => {
    expect(clampWidth('right', 100)).toBe(280);
    expect(clampWidth('right', 700)).toBe(600);
    expect(clampWidth('right', 340)).toBe(340);
  });

  it('respects editor minimum when a viewport is supplied', () => {
    // viewport 900, right min 280, editor min 360 → left cap ≈ 260
    const w = clampWidth('left', 500, 900);
    expect(w).toBeLessThanOrEqual(900 - 360 - 280);
  });
});
