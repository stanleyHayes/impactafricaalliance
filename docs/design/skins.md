# Console skins

The admin console has three independent looks: a colour **preset** (IAA, Aura, Ocean, Sunset),
light or dark **mode**, and a **skin**. The preset decides the colours; the skin decides how surfaces
and controls are built. Every skin works with every preset in both modes. People choose a skin in the
theme picker in the top bar; it is stored per browser in `iaa.admin.theme.skin`. The marketing site
has no skins.

## The skins

| Skin | What it is |
| --- | --- |
| Classic | The console as it has always looked: flat paper cards with hairline borders. The default. |
| Neumorphism | Soft UI. Surfaces are the canvas colour and stand out through a light and a dark shadow; pressed, selected and sunken things carry the inner pair. Dark mode is a charcoal tinted with the preset's hue. |
| Glassmorphism | Frosted, translucent panels with a light rim, over a wash of the preset's colours fixed to the window. Floating panels (menus, dialogs, the task drawer) are more opaque than cards. |
| Claymorphism | Pastel, puffy shapes with generous corners and pill buttons. Depth comes from a soft drop shadow plus an inner highlight and shade. Buttons press down a little (not under reduced motion). |

The code lives in `apps/admin/src/theme/skins/`: one file per skin, `components.ts` for the MUI
overrides the three non-Classic skins share, and `types.ts` for `SkinTokens`, the list of every value
a skin paints with and what each one is for.

## Tokens and helpers

Each skin publishes its tokens as CSS custom properties on `:root` (`surfaceBg` becomes
`--iaa-surface-bg`). MUI components pick the skin up from the theme on their own. A surface drawn
by hand (a `Box` with its own background, border or shadow) does not, and must use the helpers in
`apps/admin/src/theme/surfaces.ts`:

| Surface | Use |
| --- | --- |
| The page area inside the shell | `surfaceSx.page` |
| A card, panel, section or stat tile | `surfaceSx.card` (and `cardHover`) |
| A card inside a card ('Your work' tiles, form-builder questions, story blocks) | `surfaceSx.nested` |
| A section card's tinted header strip | `surfaceSx.tinted` |
| A small lifted element, or a well sunk into a card | `surfaceSx.raised` / `pressed`, `surfaceSx.inset` |
| A hand-built popover, the page header, an icon tile | `surfaceSx.overlay`, `surfaceSx.hero`, `surfaceSx.tile` |
| Sidebar links, headings and count pills | `navSx.*` |
| Selectable cards, drop zones, board columns, timelines, drag handles | `choiceSx`, `dropZoneSx`, `columnSx`, `timelineSx`, `handleSx` |
| A link styled by hand; a "Back to …" button at the top of a page | `linkSx`; `backLinkSx` in the `sx` array |
| One value on its own (a sheet's colour, a radius) | `tokenVar('…')` |
| A surface whose Classic look is its own (a tone colour, an unusual tint) | `skinned(classic, skin)` |

Keep numeric radii (`borderRadius: 3`) and numeric shadows (`boxShadow: 4`): each skin scales the
radius unit (Classic 4px, Neumorphism and Glass 6px, Clay 8px) and has its own shadow ramp. For a
small block that wraps onto several lines, use `tokenVar('itemRadius')` rather than the button's
radius, which is a pill in Clay. JavaScript that needs a raw value reads `theme.skinTokens`.

## Classic stays identical

Classic must render exactly the pixels it rendered before skins existed. Its token values are
copied from the surfaces that used to paint them, so moving a surface onto a helper changes nothing
in Classic. When your Classic values differ from a helper's, use `skinned(classic, skin)`: Classic
gets `classic` untouched. Two checks hold this in place:

- `theme.test.ts` compares Classic's palette, shape, shadows, typography and component overrides
  with a fixture captured before skins.
- The visual baseline: Classic screenshots are compared with the baseline set and must stay within
  0.05% of pixels on every screen. The theme picker is the one screen that differs, because it now
  lists the skins.

## Accessibility guards

- **Text contrast is computed, not hoped for.** Each skin tunes the palette's text colours, its
  accent and its status colours to reach 4.5:1 on every surface it can paint, including every colour
  the Glass and Clay washes produce on screen sizes from a small phone to a large monitor. The tests
  in `theme.test.ts` check every skin, preset and mode: text, links, navigation states, selected rows
  and segments, page tabs, tooltips, status colours as text and as fills, and count pills.
- **Edges and focus reach 3:1.** Field outlines, drop-zone dashes, chevrons and the selected choice
  keep a line of at least 3:1 even where the style has no borders. Every skin draws a solid 2px focus
  ring (`focusRingSx`) with 3:1 against its surfaces.
- **Meaning never depends on depth alone.** Primary actions keep the preset's filled colour, status
  chips keep their status colour, and errors keep their red outline in every skin.
- **Reduced motion and transparency.** Clay's lift and press are switched off under
  `prefers-reduced-motion`. Glass turns every translucent surface opaque, with no blur, under
  `prefers-reduced-transparency` and where the browser cannot blur.
