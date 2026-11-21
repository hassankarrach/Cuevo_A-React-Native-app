# Cuevo brand cheat sheet

## Name

**Cuevo** combines cue/queue + vote: choose what plays next, together.

## Logo

- Source asset: `mobile/assets/logo.png`.
- Selected design: a playful orange-red C with a play-shaped opening.
- Keep this original PNG as the source for future app icon and splash assets.

## Main color

| Token | Color | Hex | Intended use |
| --- | --- | --- | --- |
| `primary` | Orange-red | `#FF4D24` | Main actions, selected states, and brand accents |

Use the shared `colors.primary` value from `mobile/src/theme/colors.ts` when adding UI. This is the selected UI color; the supplied logo is preserved as delivered.

## Typography

- Main typeface: Lufga (Regular for body, SemiBold for headline/actions).
- Wordmark: Clash Grotesk Semibold.
- Font tokens and bundled-face map: `mobile/src/theme/fonts.ts`.
- Files and original included notices: `mobile/assets/fonts/`.

## Welcome/introduction direction — 2026-11-20

- Same three normal human characters across generated PNGs: orange-hoodie man, cream-clothed bob-haired woman, charcoal-jacket man. Premium 3D cartoon style; collaboration/listening/voting gestures and correctly oriented smartphones. Rejected: abstract loop heads, tablet UI on its back.
- Initial Welcome keeps Lottie behind the trio and a bottom alpha fade revealing the actual page gradient. Introduction artwork has no fade, is centered and lowered so feet are off-screen.
- Intro main phrase: cream uppercase Lufga Black, large and unrotated. Lead-in: smaller dark Caveat handwriting, unrotated and closely above. Bold pale-yellow hashtag/curved arrow frame the type. No thin underline.
- General editable inputs use platform system sans with zero letter spacing; intentional verification-code spacing remains.
- Home top navbar is solid white after the fade/blur trial was reverted.
- Assets and built-in imagegen prompts: `mobile/assets/illustrations/`; Caveat source/license: `mobile/assets/fonts/caveat/`.
