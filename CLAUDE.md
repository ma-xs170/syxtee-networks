@AGENTS.md

## Design

- For any design task, apply the `design-taste-frontend` skill (`.claude/skills/design-taste-frontend`) in "Redesign - Preserve" mode: audit the existing page first (brand tokens, IA, patterns to keep), then run its Final Pre-Flight Check before shipping.
- The SYXTEE brand always wins over the skill:
  - soft dark grey (not pure black) + one red accent, three modes (Auto / Sombre / Clair) driven by tokens in `globals.css` (`--background`, `--surface`, `--foreground`, `--accent` = red, `--on-accent`). Neutral hovers/borders use `foreground/NN`, never `accent/NN`. Never hardcode `text-white`, `bg-black`, `#000`, `#fff` in SVG: use the tokens so both themes work. Wireframe (filaire) lines in ink color;
  - `font-mono` for labels, tags and technical metadata;
  - `--live` stays reserved for live / on-air states (dot, EN LIVE badge); red `--accent` is for primary actions;
  - `Highlight` effect on key words in headlines;
  - hand-drawn wireframe SVG illustrations (`src/components/illustrations`) instead of photos.
- Allowed exceptions to the skill: mono uppercase labels and numbered sections when the page justifies them; wireframe SVGs replace the "real images" rule; the live red dot is a real state, not decoration.
- Kept from the skill: one accent color, WCAG AA contrast on buttons and forms, no CTA wrapping on desktop, one label per CTA intent, bento grids with no empty cells, `prefers-reduced-motion` support, no `window.addEventListener('scroll')`, `min-h-dvh` instead of `h-screen`.
