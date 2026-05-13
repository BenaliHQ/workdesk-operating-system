# Design tokens

Single source of truth: **[`shared/tokens.css`](../shared/tokens.css)**. Copy that file directly into the plugin's `styles/tokens.css`. This document explains the model and lists every token's role.

## Two-layer token model

1. **Obsidian-native variables** (`--background-primary`, `--text-normal`, `--interactive-accent`, …)
2. **WorkDesk extensions** (`--ws-*`) for zone palettes, motion, shadows, terminal colors, and layout dimensions Obsidian doesn't provide.

Both layers ship in the same `tokens.css`. Theme switches via `.theme-light` or `.theme-dark` on `<body>` — identical contract to Obsidian core.

---

## Spacing scale

Use these only. Never one-off values.

| Token            | px  | Typical use |
|------------------|-----|-------------|
| `--ws-space-1`   | 4   | Icon-button gap, kbd padding |
| `--ws-space-2`   | 8   | Row gap, ribbon-icon gap |
| `--ws-space-3`   | 12  | Card padding, between zone cards |
| `--ws-space-4`   | 16  | Section padding, modal foot |
| `--ws-space-5`   | 24  | Pane padding, settings sections |
| `--ws-space-6`   | 32  | Editor body padding, modal padding |
| `--ws-space-7`   | 48  | Page header padding (spec pages) |
| `--ws-space-8`   | 64  | Reserved for full-page layouts |

## Radius

| Token              | px  | Use |
|--------------------|-----|-----|
| `--ws-radius-row`  | 6   | Tree rows, small chips |
| `--ws-radius-card` | 10  | Zone cards, hero dots |
| `--ws-radius-modal`| 14  | Modals, palette, settings |
| `--ws-radius-pill` | 999 | Pills, tags, status badges |

## Type stack

| Token              | Family fallback chain |
|--------------------|----------------------|
| `--ws-font-sans`   | DM Sans → system-ui → -apple-system → Segoe UI → sans-serif |
| `--ws-font-display`| Manrope → DM Sans → system-ui → sans-serif |
| `--ws-font-mono`   | Geist Mono → JetBrains Mono → ui-monospace → SF Mono → Menlo → monospace |

## Type scale

| Token         | px / line | Typical use |
|---------------|-----------|-------------|
| `--ws-fs-28`  | 28 / 1.15 | Spec-page h1 |
| `--ws-fs-22`  | 22 / 1.18 | Section h2 |
| `--ws-fs-20`  | 20 / 1.20 | Zone hero (.pane-hero h1) |
| `--ws-fs-17`  | 17 / 1.35 | Modal titles |
| `--ws-fs-15`  | 15 / 1.40 | Settings labels |
| `--ws-fs-14`  | 14 / 1.50 | Body default, zone-card title |
| `--ws-fs-13`  | 13 / 1.55 | Tree rows, breadcrumbs |
| `--ws-fs-12`  | 12 / 1.50 | Hero sub, breadcrumbs |
| `--ws-fs-11`  | 11 / 1.45 | Pane labels, counts, kbd |

`--ws-lh-{n}` line-height variables match each `--ws-fs-{n}`.

---

## Color — Obsidian-native variables

### Surfaces

| Token | Light | Dark | Role |
|-------|-------|------|------|
| `--background-primary`        | `#ffffff` | `#2a2723` | Editor surface |
| `--background-primary-alt`    | `#faf9f7` | `#272420` | Alt editor (header areas) |
| `--background-secondary`      | `#faf9f7` | `#211f1c` | Zone pane, right pane |
| `--background-secondary-alt`  | `#f3f1ee` | `#1c1a17` | Ribbon, app frame |

### Text

| Token | Light | Dark | Role |
|-------|-------|------|------|
| `--text-normal`    | `#1a1a1a` | `#ebe5d9` | Body text, headings |
| `--text-muted`     | `#6b6862` | `#a8a094` | Sub-titles, secondary copy |
| `--text-faint`     | `#9a958d` | `#76706a` | Captions, counts, hairlines |
| `--text-accent`    | `#5a6b7a` | `#8a9aa8` | Links, interactive |
| `--text-on-accent` | `#ffffff` | `#1c1a17` | On accent fills |
| `--text-error`     | `#8a4a55` | `#cc8a93` | Errors |
| `--text-success`   | `#4f7a52` | `#8eb892` | Success states |
| `--text-warning`   | `#8a6a2e` | `#cca676` | Warnings |
| `--text-selection` | `slate@.18` | `slate@.22` | Highlighted text |

### Interactive

| Token | Light | Dark | Role |
|-------|-------|------|------|
| `--interactive-accent`       | `#5a6b7a` | `#8a9aa8` | Primary slate — buttons, indicators |
| `--interactive-accent-hover` | `#3f4d5b` | `#a8b8c5` | Hover state |
| `--interactive-normal`       | `#f3f1ee` | `#322e29` | Neutral fill |
| `--interactive-hover`        | `#ebe7e0` | `#3a3530` | Neutral hover |

### Modifiers

| Token | Light | Dark | Role |
|-------|-------|------|------|
| `--background-modifier-hover`        | `#f1efeb` | `#322e29` | Row & button hover |
| `--background-modifier-active-hover` | `#ebe7e0` | `#3a3530` | Active row / pressed |
| `--background-modifier-border`       | `#e9e5df` | `#3a342d` | Standard 1-px hairline |
| `--background-modifier-border-hover` | `#d8d2c8` | `#4a4238` | Hover hairline |
| `--background-modifier-border-focus` | `#5a6b7a` | `#8a9aa8` | Focus ring |
| `--background-modifier-form-field`   | `#ffffff` | `#2a2723` | Input fill |
| `--background-modifier-success`      | `#e6efe6` | `#1f2a20` | Success callout fill |
| `--background-modifier-error`        | `#f4e6e8` | `#2c1e22` | Error callout fill |
| `--background-modifier-message`      | `#f5ecdc` | `#2c241a` | Warning fill |
| `--ws-border-hair` *(WS)*            | `#efece6` | `#2e2924` | Hairlines inside cards |

### Code

| Token | Light | Dark | Role |
|-------|-------|------|------|
| `--code-background` | `#f6f3ed` | `#27241f` | Pre + inline code fill |
| `--code-normal`     | `#2a2a2a` | `#d8d2c4` | Default code text |
| `--code-comment`    | `#9a958d` | `#76706a` | Comments |
| `--code-keyword`    | `#5a6b7a` | `#8a9aa8` | Keywords |
| `--code-string`     | `#4f7a52` | `#8eb892` | Strings |
| `--code-value`      | `#8a6a2e` | `#cca676` | Numbers |

---

## Color — WorkDesk zones

Each zone has a paired `-bg` / `-fg` token. The bg is a low-saturation pastel; the fg is a deeper saturated version of the same hue. Pastels go on hero dots, callout fills, badge backgrounds; fg goes on icons, count text, callout border-left.

| Zone     | `-bg` light | `-fg` light | `-bg` dark | `-fg` dark |
|----------|-------------|-------------|------------|------------|
| atlas    | `#e7eef6`   | `#4a6a8a`   | `#1e2a38`  | `#7fa6cc`  |
| gtd      | `#e6efe6`   | `#4f7a52`   | `#1f2a20`  | `#8eb892`  |
| intel    | `#f5ecdc`   | `#8a6a2e`   | `#2c241a`  | `#cca676`  |
| personal | `#f4e6e8`   | `#8a4a55`   | `#2c1e22`  | `#cc8a93`  |
| system   | `#ececec`   | `#5a5a5a`   | `#2a2622`  | `#a39b91`  |
| config   | `#ece9f3`   | `#5e548a`   | `#252035`  | `#a89bd0`  |
| files    | `#e8e8e6`   | `#4a4a48`   | `#2a2622`  | `#a8a094`  |

Semantic mapping for callouts:
- `note` → atlas
- `success` → gtd
- `warning` → intel
- `error` → personal
- `info` → config

---

## Shadow

Four levels. Soft, paper-like.

| Token | Use |
|-------|-----|
| `--ws-shadow-card`    | Default zone-card surface |
| `--ws-shadow-hover`   | Hover state on cards |
| `--ws-shadow-popover` | Tooltips, hover popovers |
| `--ws-shadow-modal`   | Command palette, settings |

Light values:
```
--ws-shadow-card:    0 1px 0 rgba(20,20,20,0.02), 0 1px 3px  rgba(20,20,20,0.04);
--ws-shadow-hover:   0 1px 0 rgba(20,20,20,0.03), 0 2px 8px  rgba(20,20,20,0.06);
--ws-shadow-popover: 0 1px 0 rgba(20,20,20,0.03), 0 6px 20px rgba(20,20,20,0.10);
--ws-shadow-modal:   0 1px 0 rgba(20,20,20,0.04), 0 12px 36px rgba(20,20,20,0.16);
```

---

## Motion

See [`animations.md`](animations.md) for the full motion guide.

| Token              | Value  | Easing | Use |
|--------------------|--------|--------|-----|
| `--ws-dur-fast`    | 120ms  | ease-out | Button / row hover, color flips |
| `--ws-dur-base`    | 160ms  | ease-out | Card hover, general transitions |
| `--ws-dur-pane`    | 200ms  | ease-out | Pane collapse, grid resize |
| `--ws-dur-modal`   | 220ms  | ease-spring | Modal entrance |
| `--ws-ease-out`    | `cubic-bezier(0.2, 0.7, 0.2, 1)` | Default |
| `--ws-ease-in`     | `cubic-bezier(0.4, 0, 1, 1)` | Exit-only |
| `--ws-ease-spring` | `cubic-bezier(0.34, 1.3, 0.5, 1)` | Modal entrance |

---

## Layout

| Token             | px  | Role |
|-------------------|-----|------|
| `--ws-ribbon-w`   | 64  | Left ribbon column |
| `--ws-pane-w`     | 340 | Zone pane column |
| `--ws-rpane-w`    | 340 | Right pane column |
| `--ws-editor-max` | 720 | Editor center-column max-width |

---

## Z-index scale

| Token            | Value | Use |
|------------------|-------|-----|
| `--ws-z-base`    | 1     | Default |
| `--ws-z-sticky`  | 10    | Edge bumpers, sticky tabs |
| `--ws-z-modal`   | 100   | Scrim + modal |
| `--ws-z-toast`   | 200   | Toasts (future) |

---

## Focus ring

Globally applied via `*:focus-visible`:

```css
*:focus-visible {
  outline: 2px solid var(--background-modifier-border-focus);
  outline-offset: 2px;
  border-radius: 4px;
}
```

Do not override per-component unless the default produces a visible regression (e.g. ribbon icons get a custom ring outside the 36×36 bounds — see `components.md`).
