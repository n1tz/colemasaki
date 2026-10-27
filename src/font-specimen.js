import './font-specimen.css';

// Both the collection and the viewer render the actual downloadable typeface.
export function fontSpecimen(item, { compact = false } = {}) {
  const specimen = document.createElement('section');
  specimen.className = `font-specimen font-${item.fontFamily.toLowerCase()}${compact ? ' is-compact' : ''}`;
  const name = item.fontFamily === 'Gutz' ? 'GUTZ' : 'Yomenee';
  const id = `${item.id}-${compact ? 'card' : 'viewer'}`;
  specimen.innerHTML = `
    <header class="font-meta"><h2>${name}</h2><span>REGULAR / TTF</span></header>
    <label class="font-prompt" for="${id}-text">Type to try <span>A–Z / a–z / 0–9</span></label>
    <textarea id="${id}-text" class="font-sample" aria-label="Try ${name}" rows="2" spellcheck="false" maxlength="120">Aa</textarea>
    <div class="font-tools"><label for="${id}-size">Size <output for="${id}-size">${compact ? 72 : 120}px</output></label><input id="${id}-size" aria-label="${name} preview size" type="range" min="24" max="${compact ? 120 : 200}" value="${compact ? 72 : 120}"><button class="font-reset" type="button">Reset</button></div>
    <details class="font-characters" ${compact ? '' : 'open'}><summary>Character set <span>62 GLYPHS</span></summary><div class="font-glyphs" aria-label="Uppercase, lowercase and numerals"></div></details>
    <footer class="font-download"><span>DESIGNED BY COLE MASAKI</span><a href="${item.download}" download="${item.fontFamily}.ttf">Download ${name} <span aria-hidden="true">↓</span></a></footer>`;
  const sample = specimen.querySelector('textarea');
  const size = specimen.querySelector('input');
  const output = specimen.querySelector('output');
  function resize() {
    sample.style.fontSize = `${size.value}px`;
    output.value = `${size.value}px`;
  }
  size.addEventListener('input', resize);
  specimen.querySelector('.font-reset').onclick = () => {
    sample.value = 'Aa'; size.value = compact ? 72 : 120; resize();
  };
  specimen.querySelector('.font-glyphs').replaceChildren(...Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', character => {
    const glyph = document.createElement('span'); glyph.textContent = character; return glyph;
  }));
  resize();
  return specimen;
}
