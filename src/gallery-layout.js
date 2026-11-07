// Keep the editorial order, pairing unlike formats at a shared image height.
export function galleryRows(items, width, category) {
  const ratio = item => item.width / item.height;
  const rows = [];
  for (let start = 0; start < items.length;) {
    let count = 2;
    if (category !== 'websites' && category !== 'zine' && width >= 850 &&
        items[start + 2] && ratio(items[start]) + ratio(items[start + 1]) < 1.8 &&
        ratio(items[start + 2]) < 1.3) count = 3;
    rows.push(items.slice(start, start + count));
    start += count;
  }
  return rows;
}

export function arrangeGallery(gallery, items, category) {
  const cards = [...gallery.children];
  let signature = '';
  const observer = new ResizeObserver(([entry]) => {
    if (!entry.contentRect.width) return;
    const rows = galleryRows(items, entry.contentRect.width, category);
    const next = rows.map(row => row.length).join(',');
    if (next === signature) return;
    signature = next;
    let index = 0;
    gallery.replaceChildren(...rows.map(items => {
      const row = document.createElement('div');
      row.className = 'collection-row';
      const ratios = items.map(item => item.width / item.height);
      row.style.setProperty('--row-ratio', ratios.reduce((sum, ratio) => sum + ratio, 0));
      row.style.setProperty('--row-gaps', items.length - 1);
      row.style.gridTemplateColumns = ratios.map(ratio => `${ratio}fr`).join(' ');
      row.append(...items.map(() => cards[index++]));
      return row;
    }));
  });
  observer.observe(gallery);
  return () => observer.disconnect();
}
