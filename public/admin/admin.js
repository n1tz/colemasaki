// Site editor for colemasaki.com. Images are resized in the browser (2000px + 640px thumbnail),
// uploaded one at a time, and committed together when you press Publish.
const $ = selector => document.querySelector(selector);
const pad = n => String(n).padStart(2, '0');
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const FULL = 2000, THUMB = 640, MAX_UPLOAD = 3_000_000;

const state = { content: null, sha: null, uploads: new Map(), previews: new Map(), changes: 0, busy: 0, open: new Set(), drag: null };

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
  state.content = data.content; state.sha = data.sha; state.uploads.clear(); state.changes = 0;
  $('#loading').hidden = true;
  $('.publish').hidden = false;
  render(); updateStatus();
}

// ---------- Rendering ----------
const isVideo = item => item.type === 'video';
const thumbOf = item => state.previews.get(item.thumb) || item.thumb;

function render() {
  const root = $('#collections');
  root.innerHTML = state.content.map((c, ci) => `
    <details class="collection" data-ci="${ci}" ${state.open.has(c.id) ? 'open' : ''}>
      <summary><span class="num">${pad(ci + 1)}</span><h2>${escape(c.label)}</h2><span class="num">${c.items.length} item${c.items.length === 1 ? '' : 's'}</span></summary>
      <div class="collection-body">
        ${c.id === 'game' ? gameFields(c) : ''}
        ${c.id === 'fonts' ? '<p class="note">Fonts can be reordered here. Adding a new font needs a code change.</p>' : ''}
        <div class="grid" data-grid="${ci}">${c.items.map((item, ii) => card(c, ci, item, ii)).join('')}</div>
        ${c.id === 'fonts' ? '' : `<div class="dropzone" data-drop="${ci}">Drag images here or <label>choose files<input type="file" accept="image/*" multiple data-files="${ci}"></label><span>Large photos are fine — they are resized before upload.</span></div>`}
      </div>
    </details>`).join('');
}
function gameFields(c) {
  const video = c.items[0] && isVideo(c.items[0]) ? c.items[0] : null;
  return `<div class="game-fields">
    <label class="field">Store page URL<input type="url" data-store placeholder="https://store.steampowered.com/app/…" value="${escape(c.storeUrl || '')}"></label>
    <div class="field"><label class="field" for="youtube-input">YouTube trailer (always the first slide)</label>
      <div class="field-row"><input type="url" id="youtube-input" data-youtube placeholder="https://www.youtube.com/watch?v=…" value="${video ? `https://www.youtube.com/watch?v=${escape(video.youtube)}` : ''}">
      <button class="button small" data-set-video>${video ? 'Replace' : 'Set'}</button>${video ? '<button class="button small" data-remove-video>Remove</button>' : ''}</div></div>
    <p class="note">Leave the store URL empty to show “Store page — coming soon”.</p>
  </div>`;
}
function card(c, ci, item, ii) {
  const fixed = isVideo(item) || c.id === 'fonts';
  const pinned = isVideo(item);
  const minIndex = c.items[0] && isVideo(c.items[0]) ? 1 : 0;
  return `<article class="card ${item.uploading ? 'uploading' : ''}" draggable="${!pinned}" data-ci="${ci}" data-ii="${ii}">
    <div class="thumb"><img src="${escape(thumbOf(item))}" alt="" loading="lazy"><span class="badge">${pad(ii + 1)}</span>${pinned ? '<span class="badge video">▶ VIDEO</span>' : ''}</div>
    <input type="text" data-field="title" placeholder="Title" value="${escape(item.title || '')}" aria-label="Title">
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

$('#collections').addEventListener('input', e => {
  const el = e.target, cardEl = el.closest('.card');
  if (cardEl && el.dataset.field) {
    const item = state.content[cardEl.dataset.ci].items[cardEl.dataset.ii];
    item[el.dataset.field] = el.value;
    if (!el.dataset.counted) { el.dataset.counted = '1'; changed(); }
  } else if (el.matches('[data-store]')) {
    state.content.find(c => c.id === 'game').storeUrl = el.value.trim();
    if (!el.dataset.counted) { el.dataset.counted = '1'; changed(); }
  }
});
$('#collections').addEventListener('change', e => {
  const el = e.target;
  if (el.matches('[data-files]')) { addFiles(Number(el.dataset.files), [...el.files]); el.value = ''; }
  if (el.matches('[data-move-to]') && el.value !== '') {
    const cardEl = el.closest('.card');
    const to = Number(el.value);
    moveItem(Number(cardEl.dataset.ci), Number(cardEl.dataset.ii), to, state.content[to].items.length);
    toast(`Moved to ${escape(state.content[to].label)} (added at the end).`);
  }
});
$('#collections').addEventListener('click', e => {
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
  const cardEl = e.target.closest('.card[draggable=true]');
  if (!cardEl) return;
  state.drag = { ci: Number(cardEl.dataset.ci), ii: Number(cardEl.dataset.ii) };
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', 'card');
  requestAnimationFrame(() => cardEl.classList.add('dragging'));
});
$('#collections').addEventListener('dragend', () => { state.drag = null; clearDropMarks(); document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging')); });
const clearDropMarks = () => document.querySelectorAll('.drop-before,.drop-after,.dropzone.over').forEach(el => el.classList.remove('drop-before', 'drop-after', 'over'));
function dropTarget(e) {
  const cardEl = e.target.closest('.card');
  if (cardEl) { const r = cardEl.getBoundingClientRect(); const after = e.clientX > r.left + r.width / 2; return { el: cardEl, ci: Number(cardEl.dataset.ci), ii: Number(cardEl.dataset.ii) + (after ? 1 : 0), after }; }
  const zone = e.target.closest('[data-grid],[data-drop]');
  if (zone) { const ci = Number(zone.dataset.grid ?? zone.dataset.drop); return { el: zone.matches('[data-drop]') ? zone : null, ci, ii: state.content[ci].items.length }; }
  return null;
}
$('#collections').addEventListener('dragover', e => {
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
  const bad = state.content.flatMap(c => c.items).find(item => item.url && !/^https:\/\//.test(item.url));
  if (bad) return toast(`The link on “${escape(bad.title || bad.id)}” must start with https://`, { error: true });
  $('#publish').disabled = true; $('#status').textContent = 'Publishing…';
  try {
    const files = [...state.uploads].map(([path, sha]) => ({ path, sha }));
    const result = await api('/api/publish', { body: { baseSha: state.sha, content: state.content, files } });
    rememberOpen();
    await load();
    toast(`Published. The live site updates in about a minute. <a href="${escape(result.url)}" target="_blank" rel="noopener">View commit ↗</a>`, { sticky: false });
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
