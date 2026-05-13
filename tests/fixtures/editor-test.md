---
type: fixture
purpose: phase-3 markdown rendering smoke test
---

# Editor fixture

This file exercises every documented markdown element so the phase 3 verify
gate can assert decorations land on `.wikilink` and `.tag` spans.

A wikilink to [[example-project]] and another to [[jane-doe|Jane]] inside a
paragraph. A standalone #project tag and an inline #important tag.

> [!note]
> A note callout.

> [!warning]
> A warning callout.

- [ ] open task
- [x] done task

```ts
const x: number = 1;
```

| key | value |
|---|---|
| author | Jane |

Closing paragraph with one more [[atlas-link]] and #lastTag.
