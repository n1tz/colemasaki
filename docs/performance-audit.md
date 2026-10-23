# Performance audit — 2026-10-23

## Changes

- Fixed mobile room recycling: the old room reaches zero visibility before relocation; its replacement starts at zero, with artwork requested two stops ahead. The current and next chambers remain fully opaque. A half-second texture reveal handles late network responses. GPU texture upload happens at load completion, ahead of visibility.
- Kept the approved camera path, pacing, image sizes, upright orientation, ASCII rendering, native scrolling, and desktop composition.
- Retained three instanced chambers and six artwork planes. Room geometry and shader programs are shared; fades cost one uniform per room. Scratch vectors/quaternions are reused instead of allocating per artwork per frame.
- Split the page shell from the desktop scene. Mobile no longer loads desktop orbit controls, environment-map generation, or desktop-specific layout/rendering code. The shared Three.js engine is still necessary for the requested live visual.
- Shared one desktop artwork plane geometry across all 65 works and reused animation scratch objects. Desktop rendering still reports 15 draw calls / 132,170 triangles in the overview: visual complexity was not reduced.
- Stop the desktop animation scheduler while dialogs are open or the document is hidden. Existing mobile offscreen/pause suspension remains.
- Added immutable caching for fingerprinted JS/CSS and daily font caching. Artwork keeps its existing daily cache policy so replacement files can refresh.

## Measurements and limits

Production entry JavaScript changed from 621.08 KB (161.00 KB gzip) to 47.18 KB (13.21 KB gzip). This is deferred loading, not removal of the 3D engine: the shared 3D chunk is 534.45 KB (135.85 KB gzip), the desktop scene is 40.01 KB (12.94 KB gzip), and mobile KV is 6.15 KB (2.99 KB gzip).

Desktop/mobile browser audit found no runtime errors. The mobile KV used four GPU geometries and at most eight textures (six artwork thumbnails plus the ASCII atlas and render target), including across six room replacements with deliberately delayed image requests. Texture residency did not grow with journey length. Desktop screenshots in reduced-motion mode were byte-for-byte identical before and after optimization for overview and Professional Work; computed styles and artwork bounds also matched.

All 65 full images total 25,843,856 bytes; thumbnails total 3,227,288 bytes and are capped at 640px. Full-quality images remain unchanged. The desktop preloads thumbnail data for its complete index, then uploads textures as used. Full-detail exhibition/viewer images remain on demand. Mobile gallery images remain browser-lazy-loaded.

Automated runs use Chromium SwiftShader, not a physical phone GPU. Long-task timing varied across runs and concurrent browser tests, so no FPS or real-device speedup claim is made. The entry-bundle size, draw counts, memory counts, and preserved screenshots are the reliable comparisons. The shared Three.js chunk still triggers Vite's 500 KB warning; arbitrary further splitting would not reduce the engine required by the KV.

## Validation

- Production build, content/asset validation, and whitespace checks.
- Sequence coverage of every work and smooth camera position over ten minutes.
- Room visibility continuity across 99 mathematical recycling boundaries.
- Six real browser recycling boundaries with 1.2-second delayed thumbnail responses: no visible room replacement, no instant artwork reveal, at most eight textures, no shader/runtime errors.
- Desktop screenshot/style/geometry preservation and overview/category camera flights.
- Mobile gallery navigation, all collections, Grid/Large layouts, viewer/swipes/focus, 320–768px widths, desktop breakpoint switching.
- Mobile KV pause/resume, offscreen suspension, disposal/reentry, reduced motion, WebGL fallback, and SVG controls.

Reproduction scripts are in `scripts/*check.mjs`, `scripts/desktop-preservation.mjs`, and `scripts/performance-audit.mjs`. Browser scripts accept `CHROME_PATH`; the current mobile/flight/audit checks accept `REVIEW_URL` and otherwise use port 3012. The older full desktop browser check defaults to port 3010.
