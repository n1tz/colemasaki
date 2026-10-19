# Cole Masaki — Portfolio

A full-viewport 3D archive built with Three.js, Vite, and plain JavaScript. Five collections occupy distinct recursive sculptures. The overview shows representative work from each populated collection; selecting one centers its ordered exhibition in a dedicated viewing area. Orbit, zoom, or use the collection navigation to travel directly. There is no scrolling page behind the scene.

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

The zine array is its reading order: cover, sequential interior pages, back cover. On desktop the reader shows cover alone, then facing pages, then back cover alone. Mobile shows one page at a time. Black pages 02 and 19 are present in the original files and intentionally retained. Images preserve source proportions and colors.

To regenerate all optimized assets from the original folder structure (`2DPersonal`, `Logo`, `Zine/PRINT`):

```sh
npm run import:art -- /absolute/path/to/AIFOOD
```

This requires Poppler's `pdftoppm` for the PDF-compatible Illustrator pages. It overwrites `src/content.json` and matching generated images, so commit any manual content edits first. Originals are never modified. If a system-wide libvips causes Sharp installation to attempt a source build, install with `SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm ci`.

## Controls and accessibility

- Drag to orbit; wheel or pinch to zoom. Overview rotation is bounded to preserve collection separation; the selected sculpture can be explored around the centered artwork.
- Click artwork to open the full image. Keys 1–5 select collections; 0 returns to overview.
- Arrow keys navigate the viewer; Escape closes dialogs. Images can be enlarged and opened separately.
- Work index provides keyboard access to every item and remains available if WebGL fails.
- Cubes expand in coherent noise-driven waves; wireframe opacity follows a separate scrolling noise field. These run on the GPU through `src/motion.js`.
- Artwork occupies ordered, camera-facing slots with restrained noise motion inside fixed gutters. The entire collection stays centered as you rotate its sculpture. A separate final render pass guarantees that neither solid geometry nor transparent wireframes can draw over images. The camera stays still until you navigate.
- Desktop personal work is arranged in rows; logos have a two-by-two arrangement. The zine shows six sequential pages at a time. Mobile shows four artworks or two zine pages at a time with previous/next controls; no work is omitted. `src/layout.js` owns these arrangements and page sizes.
- Numbered labels establish work/page order. Opening an artwork still uses the full-resolution viewer, and the zine reader retains its facing-page sequence.
- The pause button freezes the noise and bounded artwork motion. Reduced-motion preference disables both and makes camera travel immediate.
- Rendering pauses while dialogs are open or the tab is hidden. Geometry is instanced, pixel ratio capped, and 3D textures use 640px thumbnails. Full-resolution images load only in the viewer.

## Full-screen world and transitions

The WebGL canvas fills the viewport. An invisible `#exhibition-frame` defines the artwork area; the camera uses an offset frustum to preserve that composition while rendering the world behind the interface. Header text uses CSS difference blending.

`src/depth-field.js` adds three fogged layers of distant fractals with 3,136 instanced cubes and two draw calls. Section changes use a curved camera flight, a brief field-of-view expansion, sculpture rotation, and staggered artwork unfolding. Reduced motion skips these transitions.

The initial HTML contains the loading screen, so it appears before the JavaScript bundle arrives. Its progress tracks thumbnail loading; it exits after fonts and the first rendered scene are ready. The work index remains available if WebGL fails.

## Checks

```sh
npm run check
npm run build
npx playwright install chromium
node scripts/browser-check.mjs
node scripts/experience-check.mjs
```

Browser checks expect a server at `http://localhost:3010`; override with `REVIEW_URL`. `CHROME_PATH` can select an existing browser executable. Screenshots are written under `/tmp/cole-check`.

## Typography

Large display text uses Helvetica Neue Bold when installed. The bundled Nimbus Sans Bold provides a consistent Helvetica-compatible fallback on devices without Helvetica Neue. A licensed Helvetica Neue webfont can replace that fallback if one is supplied. The font stack is defined by `--display` in `src/style.css`.

The unmodified fallback font is from [Artifex's URW base35 collection](https://github.com/ArtifexSoftware/urw-base35-fonts). Its distribution license and copyright notices are retained in `public/fonts/LICENSE` and `public/fonts/COPYING`; the source repository contains its original font files.

## Vercel

Import this Git repository into Vercel, choose Vite, and deploy. `vercel.json` defines the build command and `dist` output. No environment variables or backend services are required. Alternatively, run `npx vercel` from this directory. This version has not been published to a public domain.

## Sources

Artwork: the supplied AIFOOD folder. Instagram is linked, but no Instagram assets were imported. Primary visual reference: https://styles.refero.design/style/a7891223-a93e-4731-a1aa-4079f1ee928b . No generated artwork or invented project descriptions are included.
