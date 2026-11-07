# Portfolio layout review

## Composition decisions

- The desktop sidebar is one column in normal flow, anchored beside the content. Navigation, controls/help, and the Instagram/counts box share its width and border treatment. An independently scrolling sidebar handles short windows without collisions. Sidebar and content share their top alignment.
- Every desktop category uses the same content frame and collection header. Image order is the manifest order; nothing is hidden behind collection pagination. Adjacent works share a common image height, with column widths determined by their original aspect ratios. Portrait-heavy groups use three columns on wider content frames; websites and zine pages stay in pairs. Rows are capped at 54% of viewport height (600px maximum), with smaller final singletons. Images are not cropped. Font specimens start/reset to their lowercase names and remain editable and downloadable.
- The game keeps its directly playable trailer and store panel. All screenshots now appear below it. Thumbnail buttons jump to their corresponding content, rather than replacing the player. Enlarging a screenshot pauses playback behind the viewer.
- Mobile uses the supplied trailer thumbnail for the game category. The card is entirely in normal document flow, with an intrinsic 16:9 image. The game detail page shares the sticky mobile navigation and footer, and uses one column, a naturally sized logo, native video controls, and vertically scrolling screenshots. Tall mobile artwork is bounded by the viewport; Grid/Large controls remain available. Portrait and landscape phones use the same mobile breakpoint as the application.
- The Steam panel has a small destination label, larger mixed-case name, and a vertically centered status with an SVG clock. Its dark framed treatment matches the portfolio. A real URL changes the status to “Visit store” and uses an SVG arrow.
- The 3D world remains live behind the galleries. Every desktop collection retains its camera flight, and content reveals only on the scene’s arrival signal. Old category labels and duplicate artwork planes remain suppressed. A zero-sized hidden mobile frame no longer overwrites the desktop camera projection.

- Orange is the shared portfolio accent for active navigation, focus, specimen controls, and selection. Wheels of Steel uses its own blue theme, including its overview card, focus ring, and Explore button.

- Typography uses the bundled Nimbus Sans under a shared UI face with metrics derived from its 718/1000 cap height. Explicit leading accommodates descenders, headings share baselines with their metadata, and labels/icons are centered in flex controls. The font is preloaded; custom specimen faces are unchanged.
- A separate About box follows collection navigation in the sidebar. Mobile has the same destination in its menu and footer. All link to the supplied live URL, `https://colemasaki.com/#about`. This is navigation to the existing live site, not a migrated local About page: the current checkout contains no biography or About route, and the live page could not be fetched. Its content will need to be recovered before replacing that live site with this build.

## Verification

Passed: production build, content/asset and aspect-ratio validation, game media and MP4 fast-start validation, editor preservation, JavaScript syntax checks, and whitespace checks. The content manifest retains all 84 entries in eight collections.

The browser regression script now covers six desktop/mobile viewport configurations, all collection counts and image ordering, font editing/downloads, native playback, screenshot enlargement and pause behavior, sidebar bounds, full-height content, Steam label alignment, mobile thumbnail proportions, SVG arrows, complete hero/room transitions, and the animation control.

**Browser execution and visual inspection remain unverified.** This environment blocks browser launch and local listening sockets, and cannot reach the user’s existing localhost preview. The script has been syntax-checked but has not been executed here. Run it against the local preview with:

```sh
REVIEW_URL=http://localhost:5173 node scripts/game-browser-check.mjs
```

Screenshots from that run are written to `/tmp/cole-game-review`.
