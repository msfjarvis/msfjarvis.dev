import { registerTombstoneHook } from './tombstone.js';

const FIGURE_MDX_PATTERN = /^<Figure\s+([^/]+)\/>$/;
const ATTR_PATTERN = /(\w+)="((?:\\.|[^"\\])*)"/g;

function escapeAttr(value) {
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function unescapeAttr(value) {
  return String(value ?? '').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}

function parseAttrs(str) {
  const attrs = {};
  let m;
  ATTR_PATTERN.lastIndex = 0;
  while ((m = ATTR_PATTERN.exec(str)) !== null) {
    attrs[m[1]] = unescapeAttr(m[2]);
  }
  return attrs;
}

function registerFigureComponent() {
  if (!window.CMS || window.__msfjarvisFigureRegistered) return;

  window.CMS.registerEditorComponent({
    id: 'figure',
    label: 'Figure',
    fields: [
      { name: 'src', label: 'Image', widget: 'image' },
      { name: 'alt', label: 'Alt text', widget: 'text', required: false },
      { name: 'title', label: 'Title/caption', widget: 'string', required: false },
    ],
    pattern: FIGURE_MDX_PATTERN,
    fromBlock(match) {
      const attrs = parseAttrs(match[1] ?? '');
      if (!attrs.src) return false;
      return { src: attrs.src, alt: attrs.alt ?? '', title: attrs.title ?? '' };
    },
    toBlock(data) {
      const parts = [`src="${escapeAttr(data.src)}"`];
      if (data.alt) parts.push(`alt="${escapeAttr(data.alt)}"`);
      if (data.title) parts.push(`title="${escapeAttr(data.title)}"`);
      return `<Figure ${parts.join(' ')} />`;
    },
    toPreview(data) {
      const img = `<img src="${data.src}" alt="${data.alt ?? ''}">`;
      return data.title
        ? `<figure>${img}<figcaption>${data.title}</figcaption></figure>`
        : `<figure>${img}</figure>`;
    },
  });

  window.__msfjarvisFigureRegistered = true;
}

function initialize() {
  if (!window.CMS) return;
  registerFigureComponent();
  registerTombstoneHook(window.CMS);
}

initialize();
document.addEventListener('DOMContentLoaded', initialize, { once: true });
