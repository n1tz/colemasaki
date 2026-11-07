// Desktop artwork viewer: zoom toward the cursor, drag to pan, click to toggle.
// The image is laid out at its natural size and positioned with one transform
// (translate + scale, origin top-left), so every gesture is a matrix update
// with no layout work. Phones never attach this; they keep native pinch/swipe.
const HINT_KEY = 'viewer-zoom-hint-seen';

export function createViewerZoom(stage, { reducedMotion = false, onChange } = {}) {
  let img = null, nw = 1, nh = 1, W = 1, H = 1, fit = 1, max = 4;
  // Current and target transforms; the frame loop eases current toward target.
  const cur = { s: 1, x: 0, y: 0 }, tgt = { s: 1, x: 0, y: 0 };
  let frame = 0, last = 0, drag = null, interacted = false;
  const MARGIN = 12;

  function measure() {
    const r = stage.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height);
    // Fit never enlarges a small image past its own pixels, matching the old viewer.
    fit = Math.min((W - MARGIN * 2) / nw, (H - MARGIN * 2) / nh, 1);
    // Up to 4x the image's own pixels, and always at least 4x the fitted size.
    max = Math.max(4, fit * 4);
  }
  // Keep the image covering the stage when larger than it, centred when smaller.
  function clamp(t) {
    t.s = Math.min(max, Math.max(fit, t.s));
    const w = nw * t.s, h = nh * t.s;
    t.x = w <= W ? (W - w) / 2 : Math.min(0, Math.max(W - w, t.x));
    t.y = h <= H ? (H - h) / 2 : Math.min(0, Math.max(H - h, t.y));
    return t;
  }
  const zoomed = () => tgt.s > fit * 1.01;
  function apply() {
    if (!img) return;
    img.style.transform = `translate3d(${cur.x}px,${cur.y}px,0) scale(${cur.s})`;
    stage.dataset.zoom = zoomed() ? 'in' : 'fit';
    onChange?.({ percent: Math.round(cur.s * 100), zoomed: zoomed(), atMax: tgt.s >= max * .999, atFit: !zoomed() });
  }
  function tick(now) {
    const dt = Math.min(.05, (now - (last || now)) / 1000); last = now;
    const k = 1 - Math.exp(-dt * 16);
    let moving = false;
    for (const key of ['s', 'x', 'y']) {
      const d = tgt[key] - cur[key];
      if (Math.abs(d) > (key === 's' ? 1e-4 : .05)) { cur[key] += d * k; moving = true; } else cur[key] = tgt[key];
    }
    apply();
    // Promote to a compositor layer only while moving; dropping it afterwards
    // lets the browser re-rasterise the artwork sharply at the new scale.
    if (moving) frame = requestAnimationFrame(tick); else { frame = 0; last = 0; img && (img.style.willChange = 'auto'); }
  }
  function animate(instant = reducedMotion) {
    clamp(tgt);
    if (instant) { Object.assign(cur, tgt); cancelAnimationFrame(frame); frame = 0; apply(); return; }
    if (img) img.style.willChange = 'transform';
    if (!frame) { last = 0; frame = requestAnimationFrame(tick); }
  }
  // Zoom about a stage-space point: the image pixel under it stays under it.
  function zoomAt(scale, px = W / 2, py = H / 2, instant) {
    const next = Math.min(max, Math.max(fit, scale)), ratio = next / tgt.s;
    tgt.x = px - (px - tgt.x) * ratio; tgt.y = py - (py - tgt.y) * ratio; tgt.s = next;
    animate(instant); seen();
  }
  function toFit(instant) { tgt.s = fit; animate(instant); }
  // Click target: the image's own pixels (1:1), or 2.5x the fit for small images.
  const detail = () => Math.min(max, Math.max(1, fit * 2.5));
  function seen() {
    if (interacted) return; interacted = true;
    try { localStorage.setItem(HINT_KEY, '1'); } catch {}
    stage.closest('dialog')?.classList.add('zoom-hint-seen');
  }

  const point = e => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  function onWheel(e) {
    if (!img) return;
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? H : 1;
    // A sideways trackpad swipe pans; vertical wheel and pinch (ctrlKey) zoom.
    if (!e.ctrlKey && Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      if (!zoomed()) return;
      tgt.x -= e.deltaX * unit; tgt.y -= e.deltaY * unit; animate(true); return;
    }
    // Exponential steps feel even at every zoom level; pinch deltas are finer.
    const step = Math.exp(-e.deltaY * unit * (e.ctrlKey ? .01 : .0018));
    zoomAt(tgt.s * step, ...point(e));
  }
  function onDown(e) {
    if (!img || e.button !== 0) return;
    e.preventDefault(); stage.setPointerCapture(e.pointerId);
    // Pointer capture retargets later events to the stage; remember the press target.
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false, vx: 0, vy: 0, t: performance.now(), onImage: e.target === img };
  }
  function onMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y, now = performance.now();
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    drag.moved = true;
    if (!zoomed()) return;
    stage.dataset.dragging = 'true';
    const dt = Math.max(1, now - drag.t);
    drag.vx = drag.vx * .6 + dx / dt * .4; drag.vy = drag.vy * .6 + dy / dt * .4;
    drag.x = e.clientX; drag.y = e.clientY; drag.t = now;
    tgt.x += dx; tgt.y += dy; animate(true); seen();
  }
  function onUp(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const { moved, vx, vy, t, onImage } = drag; drag = null; delete stage.dataset.dragging;
    if (!moved) {
      // Click toggles fit <-> detail at the clicked point (images only).
      if (onImage) zoomed() ? toFit() : zoomAt(detail(), ...point(e));
      else if (zoomed()) toFit();
      return;
    }
    // A short glide in the throw direction, unless the pointer had stopped.
    if (zoomed() && performance.now() - t < 80 && !reducedMotion) { tgt.x += vx * 220; tgt.y += vy * 220; animate(); }
  }
  const onCancel = () => { drag = null; delete stage.dataset.dragging; };
  const resize = new ResizeObserver(() => {
    if (!img) return;
    const wasFit = !zoomed(); measure();
    if (wasFit) tgt.s = fit;
    animate(true);
  });

  return {
    // Takes over an artwork <img>; width/height come from the manifest so the
    // layout is final before the file finishes loading.
    attach(image, width, height) {
      this.detach();
      img = image; nw = width || image.naturalWidth || 1; nh = height || image.naturalHeight || 1;
      img.draggable = false; img.classList.add('zoom-image');
      img.style.width = `${nw}px`; img.style.height = `${nh}px`;
      stage.classList.add('zoom-stage');
      try { if (localStorage.getItem(HINT_KEY)) stage.closest('dialog')?.classList.add('zoom-hint-seen'); } catch {}
      stage.addEventListener('wheel', onWheel, { passive: false });
      stage.addEventListener('pointerdown', onDown); stage.addEventListener('pointermove', onMove);
      stage.addEventListener('pointerup', onUp); stage.addEventListener('pointercancel', onCancel);
      resize.observe(stage);
      measure(); tgt.s = fit; animate(true);
      if (!width) img.addEventListener('load', () => { nw = img.naturalWidth; nh = img.naturalHeight; img.style.width = `${nw}px`; img.style.height = `${nh}px`; measure(); toFit(true); }, { once: true });
    },
    detach() {
      if (!img) return;
      cancelAnimationFrame(frame); frame = 0; drag = null;
      stage.removeEventListener('wheel', onWheel); stage.removeEventListener('pointerdown', onDown);
      stage.removeEventListener('pointermove', onMove); stage.removeEventListener('pointerup', onUp);
      stage.removeEventListener('pointercancel', onCancel);
      resize.disconnect(); stage.classList.remove('zoom-stage'); delete stage.dataset.zoom; delete stage.dataset.dragging;
      img = null; onChange?.(null);
    },
    get attached() { return Boolean(img); },
    get zoomed() { return Boolean(img) && zoomed(); },
    zoomIn() { if (img) zoomAt(tgt.s * 1.5); },
    zoomOut() { if (img) zoomAt(tgt.s / 1.5); },
    fit() { if (img) { toFit(); seen(); } },
  };
}
