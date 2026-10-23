# Studio component guidance

Import these; do not fork or hand-roll replacements. Missing a prop? Extend
the component here, backward compatible.

- **`PromptBox`** (`prompt-box.tsx`): composition primitive
  (`Root / ModeRail / Mode / Body / Field / Actions / Pill / Uploads / Upload /
  Generate`). **`StudioPromptBox`** is the prop-driven dock used by the image
  generator; `modelSlot` swaps in the model picker, `extraActions` adds pills.
- **`AssetLibraryModal`** behind every "+" / add-media action: Uploads tab plus
  image/video/audio tabs. Enforces per-kind limits from catalog capacities.
- **`SettingsDialog`** renders every `model.settings` field (enum → Select,
  range → Slider, boolean → switch). Add settings in the model file, not here.
- **`UserGenerations`** is the only feed of a user's generations (virtualized
  justified rows). Pass `actions` (hover rail + lightbox buttons) or
  `selection` (multi-select). `gallery/` is its private internals.
- **`GenerationTile` / `CardActions`** (`generation-card.tsx`) and
  **`GenerationDetailModal`** (lightbox) render one generation.
- **`ScreenEmptyState`**, **`ProjectCreateModal` / `ProjectActions`**.

Design invariants: studio pages use the paper/ink product-workbench shell from
`docs/ui-inventory.md`. A contained dark canvas is appropriate for reviewing
media; form panels and account/library surfaces should remain readable in the
paper palette. Use terracotta for primary actions/selected states, mineral blue
for secondary information, and sentence-case labels. Icons are `lucide-react`;
every visible control works end to end.
