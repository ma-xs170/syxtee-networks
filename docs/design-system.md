# Direction artistique SYXTEE

Noir et blanc, technique, sobre. Trois modes : Auto (système), Sombre, Clair. Tout passe par les tokens de `src/app/globals.css`, jamais de couleur figée dans les composants.

## Tokens
| Token | Sombre | Clair |
|---|---|---|
| `--background` | #000000 | #fafafa |
| `--foreground` | #f5f5f5 | #0a0a0a |
| `--muted` | #8a8a8a | #5c5c5c |
| `--surface` / `--surface-2` | #0a0a0a / #141414 | #f0f0f0 / #e6e6e6 |
| `--line` / `--line-strong` | blanc 10 % / 20 % | noir 12 % / 25 % |
| `--accent` (encre) / `--on-accent` | #ffffff / #000000 | #0a0a0a / #fafafa |
| `--live` | #ff3b30 | #d92b20 |

`--live` est la seule couleur : états en direct uniquement. Dans les SVG, utiliser `currentColor`, `var(--foreground)` ou `var(--background)`. Logos blancs : classe `ink-img`.

## Typographie
Geist Sans, Geist Mono pour labels. `h-hero` (h1), `h-section` (h2), `label-mono`.

## Formes
Boutons et pastilles `rounded-full`, cartes `panel` (16 px), grands cadres `panel-lg` (24 px).

## Boutons
`btn btn-primary` (encre pleine), `btn btn-secondary` (contour), `btn-sm`. Libellé unique par intention.

## Mouvement
Transform et opacité seulement, `prefers-reduced-motion` coupe tout.
