// Artwork slots have fixed gutters. Motion is bounded inside those gutters.
// These are world-space exhibition layouts, not a scrolling document.
export function exhibitionLayout(collection, { overview, mobile, aspect, page = 0 }) {
  const count = collection.items.length;
  if (!count) return { slots: [], width: 5, height: 5, pages: 1, page: 0, start: 0, end: 0 };
  if (overview) {
    const indices = (mobile ? [0] : collection.id === 'personal' ? [0, 1, 2] : collection.id === 'logos' && count > 1 ? [1, 3] : [0]).filter(i => i < count);
    const slots = indices.map((index, i) => {
      const item = collection.items[index];
      const ratio = item.width / item.height;
      const isDetail = collection.id === 'personal' && i > 0 && !mobile;
      const size = mobile ? 3.7 : isDetail ? 2.1 : collection.id === 'logos' ? 2.95 : collection.id === 'zine' ? 5 : 4.5;
      const width = Math.min(size, size * ratio), height = Math.min(size, size / ratio);
      let x = 0, y = 0;
      if (!mobile && collection.id === 'personal') { x = i === 0 ? -1.35 : 2.4; y = i === 0 ? 0 : i === 1 ? 1.25 : -1.25; }
      if (!mobile && collection.id === 'logos') x = (i - (indices.length - 1) / 2) * 3.4;
      return { index, x, y, width, height };
    });
    return bounds(slots, { pages: 1, page: 0, start: 0, end: count });
  }
  // Four works at a time on narrow displays keeps each piece large enough to inspect.
  const capacity = collection.id === 'zine' ? (mobile ? 2 : 6) : mobile ? 4 : count;
  const pages = Math.ceil(count / capacity);
  page = Math.min(Math.max(0, page), pages - 1);
  const start = page * capacity, end = Math.min(start + capacity, count);
  const visible = end - start;
  const cols = mobile ? Math.min(2, visible) : Math.min(visible, collection.id === 'logos' ? 2 : collection.id === 'zine' ? 3 : aspect > 1.65 ? 5 : aspect > 1.15 ? 4 : 3);
  const rows = Math.ceil(visible / cols), pitchX = 3.35, pitchY = 3.5;
  const slots = [];
  for (let local = 0; local < visible; local++) {
    const index = start + local, row = Math.floor(local / cols);
    const inRow = Math.min(cols, visible - row * cols);
    const ratio = collection.items[index].width / collection.items[index].height;
    slots.push({ index, x: (local % cols - (inRow - 1) / 2) * pitchX, y: ((rows - 1) / 2 - row) * pitchY,
      width: Math.min(2.85, 2.85 * ratio), height: Math.min(2.85, 2.85 / ratio) });
  }
  return bounds(slots, { pages, page, start, end });
}

function bounds(slots, extra) {
  const minX = Math.min(...slots.map(s => s.x - s.width / 2));
  const maxX = Math.max(...slots.map(s => s.x + s.width / 2));
  const minY = Math.min(...slots.map(s => s.y - s.height / 2));
  const maxY = Math.max(...slots.map(s => s.y + s.height / 2));
  const centerX = (minX + maxX) / 2, centerY = (minY + maxY) / 2;
  slots.forEach(slot => { slot.x -= centerX; slot.y -= centerY; });
  return { slots, width: maxX - minX, height: maxY - minY, ...extra };
}
