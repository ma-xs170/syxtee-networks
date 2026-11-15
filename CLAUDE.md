@AGENTS.md

## Design

- For any design task, apply the `design-taste-frontend` skill (`.claude/skills/design-taste-frontend`) in "Redesign - Preserve" mode: audit the existing page first (brand tokens, IA, patterns to keep), then run its Final Pre-Flight Check before shipping.
- The SYXTEE brand always wins over the skill:
  - soft dark grey (not pure black) + one red accent, three modes (Auto / Sombre / Clair) driven by tokens in `globals.css` (`--background`, `--surface`, `--foreground`, `--accent` = red, `--on-accent`). Neutral hovers/borders use `foreground/NN`, never `accent/NN`. Never hardcode `text-white`, `bg-black`, `#000`, `#fff` in SVG: use the tokens so both themes work. Wireframe (filaire) lines in ink color;
  - `font-mono` for labels, tags and technical metadata;
  - `--live` stays reserved for live / on-air states (dot, EN LIVE badge); red `--accent` is for primary actions;
  - no highlight effect on headline words (removed on 2026-10-24, `Highlight` renders plain text);
  - hand-drawn wireframe SVG illustrations (`src/components/illustrations`) instead of photos.
- Allowed exceptions to the skill: mono uppercase labels and numbered sections when the page justifies them; wireframe SVGs replace the "real images" rule; the live red dot is a real state, not decoration.
- Kept from the skill: one accent color, WCAG AA contrast on buttons and forms, no CTA wrapping on desktop, one label per CTA intent, bento grids with no empty cells, `prefers-reduced-motion` support, no `window.addEventListener('scroll')`, `min-h-dvh` instead of `h-screen`.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.
