// Site editor for colemasaki.com. Images are resized in the browser (2000px + 640px thumbnail),
// uploaded one at a time, and committed together when you press Publish.
const $ = selector => document.querySelector(selector);
const pad = n => String(n).padStart(2, '0');
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const FULL = 2000, THUMB = 640, MAX_UPLOAD = 3_000_000;

const state = { content: null, sha: null, site: {}, siteSha: null, uploads: new Map(), previews: new Map(), changes: 0, busy: 0, open: new Set(), drag: null, dragCollection: null };
// Placeholders show what the site uses when a setting is left empty.
const SITE_FIELDS = [
  { key: 'tagline', label: 'Tagline', hint: 'Large words under the knight and the overview heading', max: 40, fallback: 'PORTFOLIO LIBRARY' },
  { key: 'subtitle', label: 'Subtitle', hint: 'Small line under COLE MASAKI', max: 80, fallback: 'PERSONAL WORK & SELECTED DESIGN' },
  { key: 'headerLine', label: 'Header line', hint: 'Top bar on desktop, intro line on phones', max: 80, fallback: 'ART / DESIGN / INDEPENDENT WORK' },
  { key: 'instagram', label: 'Instagram link', hint: 'Footer link', max: 600, fallback: 'https://www.instagram.com/colemasaki/', type: 'url' },
];

// The About section (site.json "about"). Empty fields are left off the page.
const ABOUT_FIELDS = [
  { key: 'role', label: 'Role line', hint: 'Small line under your name', max: 120 },
  { key: 'status', label: 'Availability', hint: 'Highlighted line under the bio, e.g. what work you are open to', max: 200 },
  { key: 'intro', label: 'Bio', hint: 'Separate paragraphs with a blank line', max: 4000, rows: 10, wide: true },
  { key: 'experience', label: 'Experience', hint: 'One per line. Put | before the time, e.g. Lead Designer, Company | 2.5 years', max: 2000, rows: 5, wide: true },
  { key: 'skills', label: 'Skills & tools', hint: 'One per line. Put | after the area, e.g. 3D | Modeling, sculpting', max: 2000, rows: 6, wide: true },
  { key: 'email', label: 'Contact email', hint: 'Shown as an Email button. Leave empty to hide', max: 120, type: 'email' },
  { key: 'resume', label: 'Résumé link', hint: 'https:// link to a PDF. Leave empty to hide', max: 600, type: 'url' },
];

async function api(path, { body, raw } = {}) {
  const response = await fetch(path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Request': '1' }, body: JSON.stringify(body) } : {});
  if (raw && response.ok) return response;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error || `Request failed (${response.status}).`), { status: response.status });
  return data;
}

let toastTimer;
function toast(html, { error = false, sticky = false } = {}) {
  const el = $('#toast');
  el.innerHTML = html; el.className = error ? 'error' : ''; el.hidden = false;
  clearTimeout(toastTimer);
  if (!sticky) toastTimer = setTimeout(() => { el.hidden = true; }, error ? 9000 : 5000);
}

function changed() {
  state.changes++;
  updateStatus();
}
function updateStatus() {
  const status = $('#status');
  status.textContent = state.busy ? `Uploading ${state.busy} image${state.busy > 1 ? 's' : ''}…` : state.changes ? `${state.changes} unpublished change${state.changes > 1 ? 's' : ''}` : 'No changes';
  status.classList.toggle('dirty', Boolean(state.changes));
  $('#publish').disabled = !state.changes || state.busy > 0;
  $('#discard').disabled = !state.changes || state.busy > 0;
}

// ---------- Loading ----------
async function boot() {
  const error = new URLSearchParams(location.search).get('error');
  try {
    const session = await api('/api/session');
    $('#who').textContent = session.login;
    $('.account').hidden = false;
    await load();
  } catch (e) {
    $('#loading').hidden = true;
    if (e.status !== 401) return toast(escape(e.message), { error: true, sticky: true });
    $('.signin').hidden = false;
    const messages = { account: 'That GitHub account is not allowed to edit this site.', state: 'Sign-in expired. Try again.', exchange: 'GitHub sign-in failed. Try again.', server: 'Sign-in failed on the server. Check the Vercel environment variables.' };
    if (error) { $('#signin-error').textContent = messages[error] || 'Sign-in failed.'; $('#signin-error').hidden = false; }
  }
  if (error) history.replaceState(null, '', location.pathname);
}
async function load() {
  $('#loading').hidden = false;
  const data = await api('/api/content');
  state.content = data.content; state.sha = data.sha; state.site = data.site || {}; state.siteSha = data.siteSha ?? null; state.uploads.clear(); state.changes = 0;
  $('#loading').hidden = true;
  $('.publish').hidden = false;
  render(); updateStatus();
}

// ---------- Rendering ----------
const isVideo = item => item.type === 'video';
const thumbOf = item => state.previews.get(item.thumb) || item.thumb;

function render() {
  const root = $('#collections');
  let visible = 0;
  root.innerHTML = siteSettings() + aboutSettings() + state.content.map((c, ci) => `
    <details class="collection ${c.hidden ? 'is-hidden' : ''}" data-ci="${ci}" ${state.open.has(c.id) ? 'open' : ''}>
      <summary>
        <span class="handle" draggable="true" data-collection-handle title="Drag to change the order on the site" aria-hidden="true">⠿</span>
        <span class="num">${c.hidden ? '—' : pad(++visible)}</span><h2>${escape(c.label)}</h2>${c.hidden ? '<span class="tag">Hidden</span>' : ''}
        <span class="num">${c.items.length} item${c.items.length === 1 ? '' : 's'}</span>
        <span class="order"><button type="button" data-collection-move="-1" aria-label="Move ${escape(c.label)} up" ${ci === 0 ? 'disabled' : ''}>↑</button><button type="button" data-collection-move="1" aria-label="Move ${escape(c.label)} down" ${ci === state.content.length - 1 ? 'disabled' : ''}>↓</button></span>
      </summary>
      <div class="collection-body">
        ${collectionFields(c)}
        ${c.id === 'game' ? gameFields(c) : ''}
        ${c.id === 'fonts' ? '<p class="note">Fonts can be reordered here. Adding a new font needs a code change.</p>' : ''}
        <div class="grid" data-grid="${ci}">${c.items.map((item, ii) => card(c, ci, item, ii)).join('')}</div>
        ${c.id === 'fonts' ? '' : `<div class="dropzone" data-drop="${ci}">Drag images here or <label>choose files<input type="file" accept="image/*" multiple data-files="${ci}"></label><span>Large photos are fine — they are resized before upload.</span></div>`}
      </div>
    </details>`).join('');
}
function siteSettings() {
  return `<details class="panel site-settings" ${state.open.has('#site') ? 'open' : ''}>
    <summary><h2>Site text</h2><span class="num">Tagline, subtitle, links</span></summary>
    <div class="settings-grid">${SITE_FIELDS.map(f => `<label class="field">${f.label}<span class="hint">${f.hint}</span>
      <input type="${f.type || 'text'}" data-site-field="${f.key}" maxlength="${f.max}" placeholder="${escape(f.fallback)}" value="${escape(state.site[f.key] || '')}"></label>`).join('')}</div>
    <p class="note">Leave a field empty to use the text shown in grey. Drag collections by ⠿ (or use ↑ ↓) to change their order on the site.</p>
  </details>`;
}
function aboutSettings() {
  const about = state.site.about || {};
  return `<details class="panel about-settings" ${state.open.has('#about') ? 'open' : ''}>
    <summary><h2>About</h2><span class="num">Bio, experience, skills, contact</span></summary>
    <div class="settings-grid">${ABOUT_FIELDS.map(f => `<label class="field ${f.wide ? 'wide' : ''}">${f.label}<span class="hint">${f.hint}</span>
      ${f.rows ? `<textarea data-about-field="${f.key}" maxlength="${f.max}" rows="${f.rows}">${escape(about[f.key] || '')}</textarea>` : `<input type="${f.type || 'text'}" data-about-field="${f.key}" maxlength="${f.max}" value="${escape(about[f.key] || '')}">`}</label>`).join('')}</div>
    <p class="note">Opens from the About box in the desktop sidebar and the hero top bar, and from the About buttons on phones. Leaving Bio, Experience and Skills all empty removes the About section.</p>
  </details>`;
}
function collectionFields(c) {
  return `<div class="collection-settings">
    <label class="field">Name<input type="text" data-collection-field="label" maxlength="60" value="${escape(c.label)}" required></label>
    <label class="field">Short name<span class="hint">Compact menu on small screens</span><input type="text" data-collection-field="shortLabel" maxlength="24" placeholder="${escape(c.label)}" value="${escape(c.shortLabel || '')}"></label>
    <label class="field wide">Intro (optional)<span class="hint">A sentence or two shown with the collection title</span><textarea data-collection-field="intro" maxlength="300" rows="2">${escape(c.intro || '')}</textarea></label>
    <label class="check"><input type="checkbox" data-collection-hidden ${c.hidden ? 'checked' : ''}> Hide this collection from the site</label>
  </div>`;
}
function gameFields(c) {
  const video = c.items[0] && isVideo(c.items[0]) ? c.items[0] : null;
  return `<div class="game-fields">
    <label class="field">Store page URL<input type="url" data-store placeholder="https://store.steampowered.com/app/…" value="${escape(c.storeUrl || '')}"></label>
    <div class="field"><label class="field" for="youtube-input">YouTube trailer (always the first slide)</label>
      <div class="field-row"><input type="url" id="youtube-input" data-youtube placeholder="https://www.youtube.com/watch?v=…" value="${video?.youtube ? `https://www.youtube.com/watch?v=${escape(video.youtube)}` : ''}">
      <button class="button small" data-set-video>${video ? 'Replace' : 'Set'}</button>${video ? '<button class="button small" data-remove-video>Remove</button>' : ''}</div></div>
    <p class="note">${video?.videoSrc ? 'A directly hosted trailer is active. Setting a YouTube URL replaces it.<br>' : ''}Leave the store URL empty to show “Steam — coming soon”.</p>
  </div>`;
}
function card(c, ci, item, ii) {
  const fixed = isVideo(item) || c.id === 'fonts';
  const pinned = isVideo(item);
  const minIndex = c.items[0] && isVideo(c.items[0]) ? 1 : 0;
  return `<article class="card ${item.uploading ? 'uploading' : ''}" draggable="${!pinned}" data-ci="${ci}" data-ii="${ii}">
    <div class="thumb"><img src="${escape(thumbOf(item))}" alt="" loading="lazy"><span class="badge">${pad(ii + 1)}</span>${pinned ? '<span class="badge video">▶ VIDEO</span>' : ''}</div>
    <input type="text" data-field="title" placeholder="Title" value="${escape(item.title || '')}" aria-label="Title">
    ${c.id === 'fonts' ? '' : `<textarea data-field="description" rows="2" maxlength="3000" placeholder="Description (optional)" aria-label="Description">${escape(item.description || '')}</textarea>`}
    <details><summary>More</summary>
      <label>Alt text (describes the image)<input type="text" data-field="alt" value="${escape(item.alt || '')}"></label>
      ${pinned ? '' : `<label>Link (optional)<input type="url" data-field="url" placeholder="https://…" value="${escape(item.url || '')}"></label>`}
    </details>
    ${pinned ? '' : `<div class="actions">
      <button data-move="-1" aria-label="Move earlier" ${ii <= minIndex ? 'disabled' : ''}>←</button>
      <button data-move="1" aria-label="Move later" ${ii === c.items.length - 1 ? 'disabled' : ''}>→</button>
      ${fixed ? '' : `<select data-move-to aria-label="Move to collection"><option value="">Move to…</option>${state.content.map((other, oi) => oi === ci || other.id === 'fonts' ? '' : `<option value="${oi}">${escape(other.label)}</option>`).join('')}</select>
      <button class="remove" data-remove aria-label="Remove">✕</button>`}
    </div>`}
  </article>`;
}
function rememberOpen() {
  document.querySelectorAll('.collection').forEach(el => { const id = state.content[el.dataset.ci].id; if (el.open) state.open.add(id); else state.open.delete(id); });
  for (const [selector, key] of [['.site-settings', '#site'], ['.about-settings', '#about']]) { const panel = $(selector); if (panel) { if (panel.open) state.open.add(key); else state.open.delete(key); } }
}
function rerender() { rememberOpen(); const y = scrollY; render(); scrollTo(0, y); }

// ---------- Editing ----------
function moveItem(fromC, fromI, toC, toI) {
  const source = state.content[fromC].items, target = state.content[toC].items;
  const [item] = source.splice(fromI, 1);
  if (fromC === toC && toI > fromI) toI--;
  const minIndex = target[0] && isVideo(target[0]) ? 1 : 0;
  target.splice(Math.max(minIndex, Math.min(toI, target.length)), 0, item);
  changed(); rerender();
}

function moveCollection(from, to) {
  to = Math.max(0, Math.min(to, state.content.length));
  if (to > from) to--;
  if (to === from) return;
  const [collection] = state.content.splice(from, 1);
  state.content.splice(to, 0, collection);
  changed(); rerender();
  document.querySelector(`.collection[data-ci="${to}"] summary`)?.focus({ preventScroll: true });
}
const once = el => { if (!el.dataset.counted) { el.dataset.counted = '1'; changed(); } };

$('#collections').addEventListener('input', e => {
  const el = e.target, cardEl = el.closest('.card');
  if (cardEl && el.dataset.field) {
    const item = state.content[cardEl.dataset.ci].items[cardEl.dataset.ii];
    item[el.dataset.field] = el.value;
    if (!el.dataset.counted) { el.dataset.counted = '1'; changed(); }
  } else if (el.matches('[data-store]')) {
    state.content.find(c => c.id === 'game').storeUrl = el.value.trim();
    once(el);
  } else if (el.dataset.collectionField) {
    const block = el.closest('.collection'), collection = state.content[block.dataset.ci];
    collection[el.dataset.collectionField] = el.value;
    if (el.dataset.collectionField === 'label') block.querySelector('summary h2').textContent = el.value || 'Untitled';
    once(el);
  } else if (el.dataset.aboutField) {
    state.site.about = { ...(state.site.about || {}), [el.dataset.aboutField]: el.value };
    once(el);
  } else if (el.dataset.siteField) {
    state.site[el.dataset.siteField] = el.value;
    once(el);
  }
});
$('#collections').addEventListener('change', e => {
  const el = e.target;
  if (el.matches('[data-collection-hidden]')) {
    const collection = state.content[el.closest('.collection').dataset.ci];
    if (el.checked) collection.hidden = true; else delete collection.hidden;
    changed(); rerender(); return;
  }
  if (el.matches('[data-files]')) { addFiles(Number(el.dataset.files), [...el.files]); el.value = ''; }
  if (el.matches('[data-move-to]') && el.value !== '') {
    const cardEl = el.closest('.card');
    const to = Number(el.value);
    moveItem(Number(cardEl.dataset.ci), Number(cardEl.dataset.ii), to, state.content[to].items.length);
    toast(`Moved to ${escape(state.content[to].label)} (added at the end).`);
  }
});
$('#collections').addEventListener('click', e => {
  // Buttons and the handle sit inside <summary>; keep them from opening or closing the collection.
  const collectionMove = e.target.closest('[data-collection-move]');
  if (collectionMove) { e.preventDefault(); const ci = Number(collectionMove.closest('.collection').dataset.ci), step = Number(collectionMove.dataset.collectionMove); moveCollection(ci, ci + (step > 0 ? 2 : -1)); return; }
  if (e.target.closest('[data-collection-handle]')) { e.preventDefault(); return; }
  const cardEl = e.target.closest('.card');
  const move = e.target.closest('[data-move]');
  if (move && cardEl) { const ci = Number(cardEl.dataset.ci), ii = Number(cardEl.dataset.ii), step = Number(move.dataset.move); moveItem(ci, ii, ci, ii + (step > 0 ? 2 : -1)); return; }
  if (e.target.closest('[data-remove]') && cardEl) {
    const button = e.target.closest('[data-remove]');
    // Two-step confirm built into the button.
    if (!button.dataset.armed) { button.dataset.armed = '1'; button.textContent = 'Remove?'; setTimeout(() => { if (button.isConnected) { delete button.dataset.armed; button.textContent = '✕'; } }, 3000); return; }
    state.content[cardEl.dataset.ci].items.splice(Number(cardEl.dataset.ii), 1);
    changed(); rerender(); return;
  }
  if (e.target.closest('[data-set-video]')) { setVideo(); return; }
  if (e.target.closest('[data-remove-video]')) {
    const game = state.content.find(c => c.id === 'game');
    if (game.items[0] && isVideo(game.items[0])) { game.items.shift(); changed(); rerender(); }
  }
});

// Drag to reorder (desktop). Arrow buttons cover touch screens.
$('#collections').addEventListener('dragstart', e => {
  const handle = e.target.closest?.('[data-collection-handle]');
  if (handle) {
    const block = handle.closest('.collection');
    state.dragCollection = Number(block.dataset.ci);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', 'collection');
    e.dataTransfer.setDragImage(block.querySelector('summary'), 24, 24);
    requestAnimationFrame(() => block.classList.add('dragging'));
    return;
  }
  const cardEl = e.target.closest('.card[draggable=true]');
  if (!cardEl) return;
  state.drag = { ci: Number(cardEl.dataset.ci), ii: Number(cardEl.dataset.ii) };
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', 'card');
  requestAnimationFrame(() => cardEl.classList.add('dragging'));
});
$('#collections').addEventListener('dragend', () => { state.drag = null; state.dragCollection = null; clearDropMarks(); document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging')); });
const clearDropMarks = () => document.querySelectorAll('.drop-before,.drop-after,.dropzone.over').forEach(el => el.classList.remove('drop-before', 'drop-after', 'over'));
function collectionTarget(e) {
  const block = e.target.closest('.collection');
  if (!block) return null;
  const r = block.querySelector('summary').getBoundingClientRect(), after = e.clientY > r.top + r.height / 2;
  return { el: block, after, index: Number(block.dataset.ci) + (after ? 1 : 0) };
}
function dropTarget(e) {
  const cardEl = e.target.closest('.card');
  if (cardEl) { const r = cardEl.getBoundingClientRect(); const after = e.clientX > r.left + r.width / 2; return { el: cardEl, ci: Number(cardEl.dataset.ci), ii: Number(cardEl.dataset.ii) + (after ? 1 : 0), after }; }
  const zone = e.target.closest('[data-grid],[data-drop]');
  if (zone) { const ci = Number(zone.dataset.grid ?? zone.dataset.drop); return { el: zone.matches('[data-drop]') ? zone : null, ci, ii: state.content[ci].items.length }; }
  return null;
}
$('#collections').addEventListener('dragover', e => {
  if (state.dragCollection !== null) {
    const target = collectionTarget(e);
    if (!target) return;
    e.preventDefault(); clearDropMarks();
    target.el.classList.add(target.after ? 'drop-after' : 'drop-before');
    return;
  }
  const files = e.dataTransfer.types.includes('Files');
  const target = dropTarget(e);
  if (!target || (!files && !state.drag)) return;
  if (state.content[target.ci].id === 'fonts' && (files || state.drag.ci !== target.ci)) return;
  e.preventDefault();
  clearDropMarks();
  if (files) e.target.closest('[data-drop]')?.classList.add('over');
  else if (target.el?.classList.contains('card')) target.el.classList.add(target.after ? 'drop-after' : 'drop-before');
});
$('#collections').addEventListener('dragleave', e => { if (e.target.matches?.('[data-drop]')) e.target.classList.remove('over'); });
$('#collections').addEventListener('drop', e => {
  if (state.dragCollection !== null) {
    const target = collectionTarget(e), from = state.dragCollection;
    state.dragCollection = null; clearDropMarks();
    if (target) { e.preventDefault(); moveCollection(from, target.index); }
    return;
  }
  const target = dropTarget(e);
  clearDropMarks();
  if (!target) return;
  e.preventDefault();
  if (e.dataTransfer.files.length) {
    if (state.content[target.ci].id === 'fonts') return;
    addFiles(target.ci, [...e.dataTransfer.files]);
  } else if (state.drag) {
    const { ci, ii } = state.drag; state.drag = null;
    if (state.content[ci].id === 'fonts' && target.ci !== ci) return;
    moveItem(ci, ii, target.ci, target.ii);
  }
});
// Typing or selecting text inside a card should not start dragging the card.
$('#collections').addEventListener('focusin', e => { const cardEl = e.target.closest('.card'); if (cardEl && e.target.matches('input,textarea,select')) cardEl.draggable = false; });
$('#collections').addEventListener('focusout', e => { const cardEl = e.target.closest('.card'); if (cardEl && e.target.matches('input,textarea,select')) cardEl.draggable = !isVideo(state.content[cardEl.dataset.ci].items[cardEl.dataset.ii]); });
// Stop the browser from opening files dropped outside a drop zone.
addEventListener('dragover', e => { if (e.dataTransfer.types.includes('Files')) e.preventDefault(); });
addEventListener('drop', e => { if (!e.target.closest?.('[data-drop],[data-grid]')) e.preventDefault(); });

// ---------- Images ----------
async function decode(blob) {
  try { return await createImageBitmap(blob, { imageOrientation: 'from-image' }); } catch {}
  const img = new Image();
  img.src = URL.createObjectURL(blob);
  await img.decode();
  return img;
}
const canvasBlob = (canvas, type, quality) => new Promise(resolve => canvas.toBlob(resolve, type, quality));
// Halving steps keep large downscales sharp.
async function encode(source, max) {
  const w0 = source.naturalWidth || source.width, h0 = source.naturalHeight || source.height;
  const scale = Math.min(1, max / Math.max(w0, h0));
  const width = Math.max(1, Math.round(w0 * scale)), height = Math.max(1, Math.round(h0 * scale));
  let current = source, cw = w0, ch = h0;
  while (cw / 2 >= width && ch / 2 >= height) {
    const step = document.createElement('canvas');
    step.width = Math.round(cw / 2); step.height = Math.round(ch / 2);
    const ctx = step.getContext('2d'); ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(current, 0, 0, step.width, step.height);
    current = step; cw = step.width; ch = step.height;
  }
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d'); ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(current, 0, 0, width, height);
  for (const quality of [0.9, 0.82, 0.72, 0.6]) {
    let blob = await canvasBlob(canvas, 'image/webp', quality);
    // Safari cannot encode WebP and returns PNG instead; JPEG is used there.
    if (!blob || blob.type !== 'image/webp') blob = await canvasBlob(canvas, 'image/jpeg', quality);
    if (blob.size <= MAX_UPLOAD || quality === 0.6) return { blob, width, height, ext: blob.type === 'image/webp' ? 'webp' : 'jpg' };
  }
}
const toBase64 = blob => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result.split(',')[1]); reader.onerror = reject; reader.readAsDataURL(blob); });
async function upload(path, blob) {
  const { sha } = await api('/api/upload', { body: { data: await toBase64(blob) } });
  state.uploads.set(path, sha);
  state.previews.set(path.replace(/^public/, ""), URL.createObjectURL(blob));
}
const slug = name => name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'image';
const suffix = () => Math.random().toString(36).slice(2, 6);

// Turns one image into a full-size image and thumbnail, uploads both, and returns the item fields.
async function prepare(blob, id) {
  const bitmap = await decode(blob);
  const full = await encode(bitmap, FULL), thumb = await encode(bitmap, THUMB);
  bitmap.close?.();
  const src = `/art/${id}.${full.ext}`, thumbPath = `/art/${id}-thumb.${thumb.ext}`;
  await upload(`public${src}`, full.blob);
  await upload(`public${thumbPath}`, thumb.blob);
  return { src, thumb: thumbPath, width: full.width, height: full.height };
}

async function addFiles(ci, files) {
  const collection = state.content[ci];
  const images = files.filter(f => f.type.startsWith('image/') || /\.(heic|heif|jpe?g|png|webp|gif|avif)$/i.test(f.name));
  if (images.length < files.length) toast('Some files were skipped because they are not images.', { error: true });
  state.open.add(collection.id);
  // Placeholders appear immediately, in the order chosen, then fill in as uploads finish.
  const pending = images.map(file => {
    const item = { id: `${collection.id}-${slug(file.name)}-${suffix()}`, source: file.name, title: '', alt: '', uploading: true, src: '', thumb: URL.createObjectURL(file), width: 1, height: 1 };
    collection.items.push(item);
    return { file, item };
  });
  state.busy += pending.length; rerender(); updateStatus();
  for (const { file, item } of pending) {
    try {
      Object.assign(item, await prepare(file, item.id));
      delete item.uploading;
      changed();
    } catch (error) {
      collection.items.splice(collection.items.indexOf(item), 1);
      toast(`${escape(file.name)} could not be added: ${escape(error.message || 'the image could not be read. iPhone HEIC photos work when picked from the Photos library.')}`, { error: true });
    }
    state.busy--; rerender(); updateStatus();
  }
}

function youtubeId(value) {
  value = value.trim();
  if (/^[\w-]{11}$/.test(value)) return value;
  try {
    const url = new URL(value);
    if (url.hostname.endsWith('youtu.be')) return url.pathname.slice(1, 12);
    if (url.searchParams.get('v')) return url.searchParams.get('v');
    const match = url.pathname.match(/\/(?:embed|shorts|live)\/([\w-]{11})/);
    return match?.[1] || null;
  } catch { return null; }
}
async function setVideo() {
  const input = $('[data-youtube]');
  const id = youtubeId(input.value);
  if (!id || !/^[\w-]{11}$/.test(id)) return toast('That doesn’t look like a YouTube link.', { error: true });
  const game = state.content.find(c => c.id === 'game');
  state.busy++; updateStatus();
  try {
    const poster = await (await api(`/api/poster?id=${id}`, { raw: true })).blob();
    const item = { id: `game-trailer-${suffix()}`, type: 'video', youtube: id, title: 'Trailer', alt: 'Game trailer', source: `youtube:${id}`, ...(await prepare(poster, `game-trailer-${id.toLowerCase().replace(/[^a-z0-9]/g, '')}-${suffix()}`)) };
    if (game.items[0] && isVideo(game.items[0])) game.items[0] = item; else game.items.unshift(item);
    changed(); state.open.add('game'); rerender();
    toast('Trailer set. Publish to put it on the site.');
  } catch (error) { toast(escape(error.message), { error: true }); }
  state.busy--; updateStatus();
}

// ---------- Publish ----------
$('#publish').onclick = async () => {
  const game = state.content.find(c => c.id === 'game');
  if (game?.storeUrl && !/^https:\/\//.test(game.storeUrl)) return toast('The store URL must start with https://', { error: true });
  const unnamed = state.content.find(c => !c.label?.trim());
  if (unnamed) return toast('Every collection needs a name.', { error: true });
  if (state.content.every(c => c.hidden)) return toast('At least one collection must stay visible.', { error: true });
  if (state.site.instagram?.trim() && !/^https:\/\//.test(state.site.instagram.trim())) return toast('The Instagram link must start with https://', { error: true });
  const about = state.site.about || {};
  if (about.resume?.trim() && !/^https:\/\//.test(about.resume.trim())) return toast('The résumé link must start with https://', { error: true });
  if (about.email?.trim() && !/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(about.email.trim())) return toast('The contact email does not look like an email address.', { error: true });
  const bad = state.content.flatMap(c => c.items).find(item => item.url && !/^https:\/\//.test(item.url));
  if (bad) return toast(`The link on “${escape(bad.title || bad.id)}” must start with https://`, { error: true });
  $('#publish').disabled = true; $('#status').textContent = 'Publishing…';
  try {
    const files = [...state.uploads].map(([path, sha]) => ({ path, sha }));
    const result = await api('/api/publish', { body: { baseSha: state.sha, siteSha: state.siteSha, content: state.content, site: state.site, files } });
    rememberOpen();
    await load();
    toast(`${result.deploying ? 'Published. The live site updates in about a minute.' : 'Saved to GitHub, but the site did not start rebuilding. Check DEPLOY_HOOK_URL in Vercel.'} <a href="${escape(result.url)}" target="_blank" rel="noopener">View commit ↗</a>`, { sticky: false });
  } catch (error) {
    toast(escape(error.message), { error: true, sticky: error.status === 409 });
    updateStatus();
  }
};
$('#discard').onclick = async () => {
  const button = $('#discard');
  if (!button.dataset.armed) { button.dataset.armed = '1'; button.textContent = 'Discard all?'; setTimeout(() => { delete button.dataset.armed; button.textContent = 'Discard'; }, 3000); return; }
  delete button.dataset.armed; button.textContent = 'Discard';
  rememberOpen(); await load(); toast('Changes discarded.');
};
addEventListener('beforeunload', e => { if (state.changes || state.busy) { e.preventDefault(); e.returnValue = ''; } });

boot();
