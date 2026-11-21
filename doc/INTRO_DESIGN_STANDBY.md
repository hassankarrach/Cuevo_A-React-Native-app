# Introduction design — current state, 2026-11-20

The filename is retained for existing links. The earlier standby direction was superseded by the user's requested three-page artwork and typography work on November 20. All three pages now have content. Preserve this design until the user requests further changes.

## Implementation

- Route: `mobile/src/app/introduction.tsx`.
- Screen/slide configuration: `mobile/src/screens/introduction/IntroductionScreen.tsx`.
- Orange native background/rays/glow: `IntroductionBackground.tsx`.
- Bold decorative vectors: `IntroductionDoodles.tsx`.
- Entry: profile setup opens `/introduction`; final Explore Cuevo opens Home. Three progress segments, Back and Next connect the steps.

## Current sequence

| Page | Handwritten lead-in | Uppercase main phrase | Artwork |
| --- | --- | --- | --- |
| Listen together | Good music. | BETTER / COMPANY. | cuevo-intro-discover.png |
| Create together | Your favorites. | ONE SHARED / PLAYLIST. | cuevo-intro-playlists.png |
| Choose together | Pick the next track. | EVERY VOTE / COUNTS. | cuevo-intro-vote.png |

Supporting copy describes discovery/company, shared playlists and suggesting/voting, respectively. No mandatory create/join action was added.

## Design to preserve

- Base orange #FF4D24, warm cream, charcoal and pale-yellow accents.
- Transparent 887 × 1774 PNGs in `mobile/assets/illustrations/`, generated with built-in imagegen from the selected welcome trio. Same normal human faces, hairstyles, clothing identity and polished cartoon style; music collaboration must read clearly.
- Illustrations are visually centered at 125% screen width, lowered by 34% window height (40% compact) using translateY. Feet extend below the screen; text is centered above them. No left fade, mask or opacity on introduction artwork.
- Main typography is 43-point uppercase Lufga Black over two lines (36 compact), unrotated. Handwritten lead-in is dark Caveat Regular, 35 points (30 compact), unrotated, closely above with a small negative margin.
- Heavy pale-yellow hashtag and broad curved arrow surround the text. Removed/rejected: thin underline, tiny decorative strokes and sparkle trial. Inspiration is the user's large bold symbols/reference typography duo.
- Source/licensing for bundled Caveat: `mobile/assets/fonts/caveat/`. Font registration: `mobile/src/theme/fonts.ts`.
- Exact three illustration prompts: `mobile/assets/illustrations/INTRO_PROMPTS.md`. Original welcome trio provenance: `mobile/assets/illustrations/README.md`.

## Distinguish the initial Welcome page

`WelcomeScreen` still has the animated ribbon. `WelcomeCharacters` overlays the original trio PNG with a lower alpha fade into the actual page gradient. This bottom fade is intentional there and must not be copied to the three introduction pages.

## Historical alternatives

The older 2D ink cat (`mobile/assets/mascot/cuevo-ink-cat-tall-v2.png`) and previous concepts remain as alternatives; none is the current introduction artwork. Early left-column/full-height/right-overflow layouts and rotated handwriting were superseded. Do not delete old assets or regenerate artwork without a request.

## Validation

Typecheck and lint passed. All three illustrated pages and Next/Back were inspected in the iPhone 17 Simulator during the composition/font work. The latest uppercase/heavy-symbol treatment was visually confirmed on the listening page. Compact layouts, accessibility/large text, Android and physical-device QA remain outstanding.
