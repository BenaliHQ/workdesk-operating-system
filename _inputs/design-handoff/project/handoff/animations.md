# Motion + animation

WorkDesk's motion vocabulary is tactile, small, and rarely playful. The principle: motion should make the interface feel responsive — never showy.

## Timing tokens

| Token            | Value | Where to use |
|------------------|-------|--------------|
| `--ws-dur-fast`  | 120ms | Button / row hover, color flips, chevron rotation |
| `--ws-dur-base`  | 160ms | Card hover shadow lift, generic transitions |
| `--ws-dur-pane`  | 200ms | Pane collapse, grid column resize, edge-bumper fade |
| `--ws-dur-modal` | 220ms | Modal entrance |

## Easing tokens

| Token              | Value                                  | Use |
|--------------------|----------------------------------------|-----|
| `--ws-ease-out`    | `cubic-bezier(0.2, 0.7, 0.2, 1)`       | Default for entering / settling motion |
| `--ws-ease-in`     | `cubic-bezier(0.4, 0, 1, 1)`           | Exit-only (rare). Don't use for entrance. |
| `--ws-ease-spring` | `cubic-bezier(0.34, 1.3, 0.5, 1)`      | Modal entrance — a tiny spring overshoot |

## Animation inventory

| Element                       | What animates                          | Token | Easing |
|-------------------------------|----------------------------------------|-------|--------|
| `.zone-slot .dot` (hover)     | `transform: scale(1 → 1.04)`           | fast  | ease-out |
| `.zone-slot` background       | bg color hover                         | fast  | ease-out |
| `.ribbon-icon` background/color| bg + color hover                      | fast  | ease-out |
| `.row` background             | hover bg                                | fast  | ease-out |
| `.icon-btn` background/color  | hover                                   | fast  | ease-out |
| `.row .chevron`               | `rotate(0 → 90deg)`                    | fast  | ease-out |
| `.obj` shadow                 | shadow card → shadow-hover             | base  | ease-out |
| `.app` grid-template-columns  | pane collapse / expand                  | pane  | ease-out |
| `.edge-expand`                | opacity 0 → 1 when sibling collapses    | pane  | ease-out |
| `body.focus-on .ribbon` etc.  | opacity 1 → 0.4                        | pane  | ease-out |
| `.scrim`                      | opacity 0 → 1                          | modal | ease-out |
| `.modal`                      | `translateY(8px → 0)` + opacity 0 → 1  | modal | ease-spring |
| `.toggle::after` (thumb)      | `left: 2 → 16`                         | fast  | ease-out |
| `.qc-mic.recording::after`    | `scale(0.95 → 1.25)` + opacity 0.5 → 0 | 1.4s loop | ease-out |
| `.term-input-row .caret`      | opacity blink                          | 1s steps(1) | linear |

## Things that do NOT animate

- Theme switches — instant. Animating across hundreds of CSS variables is jank-prone.
- Text color of body copy.
- Tree row depth / indentation.
- Modal exit (it just disappears with `display: none` on `.scrim` losing `.open`).
- Number counters (no rolling odometer).

## reduced-motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Add this to `app.css`. The interactions still work — they just don't animate.

## Keyframes catalog

```css
@keyframes ws-blink {           /* caret + recording dot */
  50% { opacity: 0; }
}
@keyframes qc-pulse {           /* quick-capture mic ring */
  0%   { transform: scale(0.95); opacity: 0.5; }
  100% { transform: scale(1.25); opacity: 0; }
}
```

That's the entire animation catalog. If a new spec needs a new keyframe, it must be approved against the principle: tactile, small, never showy.
