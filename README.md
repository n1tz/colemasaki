# Cole Masaki — Portfolio

A full-viewport 3D archive built with Three.js, Vite, and plain JavaScript. Seven collections occupy distinct recursive sculptures. The overview shows representative work from Professional Work, Websites, and Personal Work; selecting one centers its ordered exhibition in a dedicated viewing area. Orbit, zoom, or use the collection navigation to travel directly. Desktop remains a full-screen spatial gallery. Mobile uses a native scrolling artwork grid with a compact 3D journey above the homepage collections.

## Run

Node 22 or later is recommended.

```sh
npm ci
npm run dev
```

`npm run build` produces `dist/`. `npm run preview` serves the production build locally.

## Content

Edit `src/content.json`. Each collection has a stable `id`, a `label`, and an ordered `items` array. Each item needs a unique `id`, `src`, `thumb`, original `width` and `height`, and useful `alt` text. `source` records the original filename. Paths point into `public/art/`.

To add work, put its full-size WebP and small thumbnail in `public/art/`, then add an item to the desired collection. The scene and index read the same manifest; counts update automatically. The empty game and drawings collections accept the same image schema. Video playback and game embeds are not implemented in this version.

The zine array is its reading order: cover, sequential interior pages, back cover. On desktop the reader shows cover alone, then facing pages, then back cover alone. Mobile shows one page at a time. Black underside-cover pages 02 and 19 are omitted from the published 18-page sequence. Images preserve source proportions and colors.

To regenerate all optimized assets from the original folder structure (`2DPersonal`, `Logo`, `Zine/PRINT`):

```sh
npm run import:art -- /absolute/path/to/AIFOOD
```

This requires Poppler's `pdftoppm` for the PDF-compatible Illustrator pages. It refreshes local personal, logo, and zine items while preserving imported work and the other collections. Commit manual edits to local items first. Originals are never modified. If a system-wide libvips causes Sharp installation to attempt a source build, install with `SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm ci`.

## Controls and accessibility

- Drag to orbit; wheel or pinch to zoom. Overview rotation is bounded to preserve collection separation; the selected sculpture can be explored around the centered artwork.
- Click artwork to open the full image. Keys 1–7 select collections; 0 returns to overview.
- Arrow keys navigate the viewer; Escape closes dialogs. Images can be enlarged and opened separately.
- Work index provides keyboard access to every item and remains available if WebGL fails.
- Cubes expand in coherent noise-driven waves; wireframe opacity follows a separate scrolling noise field. These run on the GPU through `src/motion.js`.
- Artwork occupies ordered, camera-facing slots with restrained noise motion inside fixed gutters. The entire collection stays centered as you rotate its sculpture. A separate final render pass guarantees that neither solid geometry nor transparent wireframes can draw over images. The camera stays still until you navigate.
- Desktop personal and professional work show up to eight images per page; logos have a two-by-two arrangement. The zine shows six sequential pages at a time. Mobile shows every artwork in a scrollable grid, with a Large layout option and a full-screen swipeable viewer; no work is omitted. `src/layout.js` owns these arrangements and page sizes.
- Numbered labels establish work/page order. Opening an artwork still uses the full-resolution viewer, and the zine reader retains its facing-page sequence.
- The pause button freezes the noise and bounded artwork motion. Reduced-motion preference disables both and makes camera travel immediate.
- Rendering pauses while dialogs are open or the tab is hidden. Geometry is instanced, pixel ratio capped, and 3D textures use 640px thumbnails. Full-resolution images load for selected desktop exhibitions and the viewer.

## Full-screen world and transitions

The WebGL canvas fills the viewport. An invisible `#exhibition-frame` defines the artwork area; the camera uses an offset frustum to preserve that composition while rendering the world behind the interface. Header text uses CSS difference blending.

`src/depth-field.js` builds a central library and seven separated chambers from 9,984 instanced blocks, recursive clusters, and open architectural ribs. The environment takes two draw calls. Its blocks and outlines share a GPU wave deformation, producing slow changes in depth and width without per-frame instance uploads. `roomLocations` defines the collection destinations. Section changes follow broad cubic Bézier dolly paths, lasting roughly 1.55–2.3 seconds depending on distance. Quintic easing gives zero endpoint velocity and acceleration; quaternion interpolation keeps the horizon stable and the lens stays at 43°. Pagination uses a short reveal without an unnecessary room excursion. Reduced motion moves directly to the destination and disables ambient deformation and ASCII conversion. The artwork frame is symmetric around the screen center, with boxed collection and room-information windows outside it.

`src/ascii-pass.js` samples the live world into a monospace glyph atlas in one fullscreen GPU pass. Conversion peaks during room travel and covers roughly half the screen at rest, with a slowly drifting curved boundary. Artwork is rendered afterwards and remains unprocessed. The animation pause control freezes the shared environment/effect clock.

The initial HTML contains the loading screen, so it appears before the JavaScript bundle arrives. Its progress tracks thumbnail loading; it exits after fonts and the first rendered scene are ready. The work index remains available if WebGL fails.

## Checks

```sh
npm run check
npm run build
npx playwright install chromium
node scripts/browser-check.mjs
node scripts/content-check.mjs
node scripts/experience-check.mjs
node scripts/rooms-check.mjs
```

Browser checks expect a server at `http://localhost:3010`; override with `REVIEW_URL`. `CHROME_PATH` can select an existing browser executable. Screenshots are written under `/tmp/cole-check`.

## Typography

Large display text uses Helvetica Neue Bold when installed. The bundled Nimbus Sans Bold provides a consistent Helvetica-compatible fallback on devices without Helvetica Neue. A licensed Helvetica Neue webfont can replace that fallback if one is supplied. The font stack is defined by `--display` in `src/style.css`.

The unmodified fallback font is from [Artifex's URW base35 collection](https://github.com/ArtifexSoftware/urw-base35-fonts). Its distribution license and copyright notices are retained in `public/fonts/LICENSE` and `public/fonts/COPYING`; the source repository contains its original font files.

## Vercel

Import this Git repository into Vercel, choose Vite, and deploy. `vercel.json` defines the build command and `dist` output. No environment variables or backend services are required. Alternatively, run `npx vercel` from this directory. Production is deployed to https://colemasaki.com on the `colemasaki` Vercel project; https://www.colemasaki.com also serves the portfolio. The GitHub remote is `n1tz/colemasaki`.

## Sources

Artwork: the supplied AIFOOD folder. Public Instagram posts from @colemasaki, merchandise product images from lot.akiba-eden.com, and homepage screenshots from the four linked websites are saved locally. Source links are retained on each imported item. Primary visual reference: https://styles.refero.design/style/a7891223-a93e-4731-a1aa-4079f1ee928b . No generated artwork or invented project descriptions are included.

## Imported work

Collections are ordered for hiring: Professional Work, Websites, Personal Work, Logo Design, Zine, Video Game, Drawings & Paintings. `shortLabel` supplies compact mobile navigation. Optional item `title` is shown in the viewer and index; `url` opens the original project, website, or Instagram post. `origin` marks imported items so local imports preserve them.

The curated portfolio includes 17 professional images (15 merchandise mockups, one shirt back, and one poster), four website previews, 17 personal works, nine logo images, and 18 zine pages. Three unique Instagram-only personal images remain. Source links from removed Instagram copies are preserved on their higher-resolution replacements.

Run `node scripts/curate-portfolio.mjs` after refreshing either artwork import to restore the reviewed additions, duplicate decisions, and ordering. It reads the 13 supplied originals from `/home/n1tz/Downloads` (or a directory passed as its first argument). It preserves the six requested opening personal pieces in order, then sorts remaining personal work by shortest source dimension, descending. Optimized images are capped at 2000px without enlargement; thumbnails are capped at 640px. See [the artwork audit](docs/artwork-audit.md) for duplicate decisions.

## Mobile journey and performance

The mobile homepage visual travels between staggered chambers, with a 1.25-second hold on each artwork pair followed by a 3.55-second curved flight. Artwork stays upright; ASCII peaks in transit. All 65 works cycle through a collection-interleaved sequence without repeats within a cycle.

Three reused chambers and six artwork planes keep GPU residency bounded. A chamber is recycled only at zero visibility; its replacement is prefetched two stops ahead and fades in before arrival. Late textures have a separate half-second reveal. Room fades use a shared shader program and one uniform per chamber; geometry stays shared and instanced. The preview suspends offscreen, in hidden tabs, and when paused. Reduced motion provides a static preview, and WebGL failure retains the image fallback and complete gallery.

The page shell, desktop scene, and mobile KV load separately. The desktop scene shares artwork geometry and reuses per-frame vectors; paused/hidden scene loops do not schedule frames. Fingerprinted build assets use immutable caching. See [the performance audit](docs/performance-audit.md) for validation and measurement limits.
