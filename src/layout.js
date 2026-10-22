// Artwork slots have fixed gutters. Motion is bounded inside those gutters.
// These are world-space exhibition layouts, not a scrolling document.
export function exhibitionLayout(collection, { overview, mobile, aspect, page = 0 }) {
  const count = collection.items.length;
  if (!count) return { slots: [], width: 5, height: 5, pages: 1, page: 0, start: 0, end: 0 };
  if (overview) {
    // One legible cover per room; the complete collection opens inside it.
    const indices = [0];
    const slots = indices.map(index => {
      const item = collection.items[index], ratio = item.width / item.height;
      const size = mobile ? 6.3 : 7.2;
      return { index, x: 0, y: 0, width: Math.min(size, size * ratio), height: Math.min(size, size / ratio) };
    });
    return bounds(slots, { pages: 1, page: 0, start: 0, end: count });
  }
  // Small, generous groups prioritize reading the work over thumbnail density.
  const capacity = mobile ? 1 : collection.id === 'zine' ? 2 : 3;
  const pages = Math.ceil(count / capacity);
  page = Math.min(Math.max(0, page), pages - 1);
  const start = page * capacity, end = Math.min(start + capacity, count);
  const visible = end - start;
  const cols = mobile ? 1 : Math.min(visible, aspect > 1.1 ? capacity : 2);
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

// Reflow ordered rows as one composition, retaining gutters and image ratios.
export function focusLayout(layout, focusedIndex, maxHeight) {
  if (focusedIndex == null) return layout.slots;
  const rows = [];
  for (const slot of layout.slots) {
    let row = rows.find(row => Math.abs(row.y - slot.y) < .01);
    if (!row) { row = { y: slot.y, slots: [] }; rows.push(row); }
    const scale = slot.index === focusedIndex ? 1.48 : .74;
    row.slots.push({ ...slot, width: slot.width * scale, height: slot.height * scale });
  }
  const gap = .5;
  rows.forEach(row => {
    row.width = row.slots.reduce((sum, slot) => sum + slot.width, 0) + gap * (row.slots.length - 1);
    row.height = Math.max(...row.slots.map(slot => slot.height));
  });
  const height = rows.reduce((sum, row) => sum + row.height, 0) + gap * (rows.length - 1);
  const fit = Math.min(1, layout.width / Math.max(...rows.map(row => row.width)), maxHeight / height);
  let top = height / 2;
  return rows.flatMap(row => {
    let left = -row.width / 2;
    const slots = row.slots.map(slot => {
      const result = { ...slot, x: (left + slot.width / 2) * fit, y: (top - row.height / 2) * fit, width: slot.width * fit, height: slot.height * fit };
      left += slot.width + gap;
      return result;
    });
    top -= row.height + gap;
    return slots;
  });
}
