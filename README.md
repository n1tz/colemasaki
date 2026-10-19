# Cole Masaki — Portfolio

A full-viewport 3D archive built with Three.js, Vite, and plain JavaScript. Five collections occupy a recursive sculpture. Orbit, pan, zoom, or use the collection navigation to travel directly. There is no scrolling page behind the scene.

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

- Drag to orbit; wheel or pinch to zoom; right-drag or two fingers to pan.
- Click artwork to open the full image. Keys 1–5 select collections; 0 returns to overview.
- Arrow keys navigate the viewer; Escape closes dialogs. Images can be enlarged and opened separately.
- Work index provides keyboard access to every item and remains available if WebGL fails.
- Cubes expand in coherent noise-driven waves; wireframe opacity follows a separate scrolling noise field. These run on the GPU through `src/motion.js`.
- Artwork orbits its collection slowly and smoothly turns to face the camera. Hovering holds that work in place for selection. The camera stays still until you navigate.
- The pause button freezes the noise and orbital motion. Reduced-motion preference disables both and makes camera travel and billboarding immediate.
- Rendering pauses while dialogs are open or the tab is hidden. Geometry is instanced, pixel ratio capped, and 3D textures use 640px thumbnails. Full-resolution images load only in the viewer.

## Checks

```sh
npm run check
npm run build
npx playwright install chromium
node scripts/browser-check.mjs
```

Browser checks expect a server at `http://localhost:3010`; override with `REVIEW_URL`. `CHROME_PATH` can select an existing browser executable. Screenshots are written under `/tmp/cole-check`.

## Typography

Large display text uses Helvetica Neue Bold when installed. The bundled Nimbus Sans Bold provides a consistent Helvetica-compatible fallback on devices without Helvetica Neue. A licensed Helvetica Neue webfont can replace that fallback if one is supplied. The font stack is defined by `--display` in `src/style.css`.

The unmodified fallback font is from [Artifex's URW base35 collection](https://github.com/ArtifexSoftware/urw-base35-fonts). Its distribution license and copyright notices are retained in `public/fonts/LICENSE` and `public/fonts/COPYING`; the source repository contains its original font files.

## Vercel

Import this Git repository into Vercel, choose Vite, and deploy. `vercel.json` defines the build command and `dist` output. No environment variables or backend services are required. Alternatively, run `npx vercel` from this directory. This version has not been published to a public domain.

## Sources

Artwork: the supplied AIFOOD folder. Instagram is linked, but no Instagram assets were imported. Primary visual reference: https://styles.refero.design/style/a7891223-a93e-4731-a1aa-4079f1ee928b . No generated artwork or invented project descriptions are included.
