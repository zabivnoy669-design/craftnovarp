'use strict';
(() => {
  if (window.NovaRichText) return;

  const MARKER = '<!--nova-rt-->';

  const ALLOWED_TAGS = new Set([
    'p', 'div', 'h2', 'h3', 'h4',
    'strong', 'b', 'em', 'i', 'u', 's', 'span', 'br',
    'ul', 'ol', 'li', 'blockquote', 'hr', 'a', 'code', 'img'
  ]);

  const ALLOWED_CLASSES = new Set([
    'rt-callout', 'rt-callout-red', 'rt-callout-gold', 'rt-callout-blue', 'rt-callout-green',
    'rt-callout-icon', 'rt-callout-body',
    'rt-align-left', 'rt-align-center', 'rt-align-right'
  ]);

  const COLOR_RE = /^(#[0-9a-fA-F]{3,8}|rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)|rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*(0|1|0?\.\d+)\s*\))$/;
  const ALIGN_RE = /^(left|center|right|justify)$/;
  const SIZE_RE = /^(1[1-9]|2\d|3[0-4])px$/;
  const WEIGHT_RE = /^(normal|bold|[4-8]00)$/;
  const DECO_RE = /^(none|underline|line-through|underline line-through)$/;

  const FONT_SIZE_MAP = {
    '1': '12px',
    '2': '13px',
    '3': '15px',
    '4': '18px',
    '5': '22px',
    '6': '26px',
    '7': '30px'
  };

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function linkifyEscapedLine(escaped) {
    return escaped.replace(/(https?:\/\/[^\s<]+)/g, url => {
      const cleanUrl = url.replace(/[.,;:!?)]+$/, '');
      const trailing = url.slice(cleanUrl.length);
      return `<a href="${cleanUrl}">${cleanUrl}</a>${trailing}`;
    });
  }

  function isSafeHref(raw) {
    const val = String(raw || '').trim();
    if (!val || val.startsWith('//')) return null;
    if (val.startsWith('#')) return val;
    if (/^[a-zA-Z0-9._-]+(\.html)?([?#][^\s]*)?$/.test(val) && !val.includes(':')) {
      return val;
    }
    try {
      const u = new URL(val);
      if (u.protocol === 'https:' || u.protocol === 'http:' || u.protocol === 'mailto:') {
        return u.href;
      }
    } catch {}
    return null;
  }

  function isSafeImgSrc(raw) {
    const val = String(raw || '').trim();
    if (!val || val.startsWith('//')) return null;
    if (/^assets\/[a-zA-Z0-9._/-]+(\?[a-zA-Z0-9._=&-]+)?$/.test(val)) return val;
    try {
      const u = new URL(val);
      if (u.protocol === 'https:' || u.protocol === 'http:') return u.href;
    } catch {}
    return null;
  }

  function isRichText(raw) {
    return String(raw || '').trimStart().startsWith(MARKER);
  }

  function plainToHtml(raw) {
    const src = String(raw || '').replace(/\r\n/g, '\n').trim();
    if (!src) return '';

    const blocks = src.split(/\n{2,}/);
    const out = [];

    for (const block of blocks) {
      const trimmed = block.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith('## ')) {
        out.push(`<h2>${linkifyEscapedLine(escapeHtml(trimmed.slice(3).trim()))}</h2>`);
        continue;
      }
      if (trimmed.startsWith('### ')) {
        out.push(`<h3>${linkifyEscapedLine(escapeHtml(trimmed.slice(4).trim()))}</h3>`);
        continue;
      }

      const lines = trimmed.split('\n').map(l => l.trim());
      if (lines.length > 0 && lines.every(l => /^[-•*]\s+/.test(l))) {
        const items = lines.map(l => `<li>${linkifyEscapedLine(escapeHtml(l.replace(/^[-•*]\s+/, '')))}</li>`).join('');
        out.push(`<ul>${items}</ul>`);
        continue;
      }
      if (lines.length > 0 && lines.every(l => /^\d+[.)]\s+/.test(l))) {
        const items = lines.map(l => `<li>${linkifyEscapedLine(escapeHtml(l.replace(/^\d+[.)]\s+/, '')))}</li>`).join('');
        out.push(`<ol>${items}</ol>`);
        continue;
      }

      const htmlLines = trimmed.split('\n').map(l => linkifyEscapedLine(escapeHtml(l))).join('<br>');
      out.push(`<p>${htmlLines}</p>`);
    }

    return out.join('');
  }

  function extractSafeStyles(srcEl, targetEl) {
    const st = srcEl.style;
    if (!st) return;

    const color = (st.color || '').trim();
    if (color && COLOR_RE.test(color)) {
      targetEl.style.color = color;
    }

    const bg = (st.backgroundColor || '').trim();
    if (bg && COLOR_RE.test(bg) && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
      targetEl.style.backgroundColor = bg;
      targetEl.style.padding = '1px 4px';
      targetEl.style.borderRadius = '4px';
    }

    const align = (st.textAlign || '').trim().toLowerCase();
    if (align && ALIGN_RE.test(align)) {
      targetEl.style.textAlign = align;
    }

    const fSize = (st.fontSize || '').trim().toLowerCase();
    if (fSize && SIZE_RE.test(fSize)) {
      targetEl.style.fontSize = fSize;
    }

    const fWeight = (st.fontWeight || '').trim().toLowerCase();
    if (fWeight && WEIGHT_RE.test(fWeight)) {
      targetEl.style.fontWeight = fWeight;
    }

    const tDeco = (st.textDecorationLine || st.textDecoration || '').trim().toLowerCase();
    if (tDeco && DECO_RE.test(tDeco)) {
      targetEl.style.textDecoration = tDeco;
    }
  }

  function sanitizeNode(node, doc, options) {
    if (node.nodeType === 3) { // TEXT_NODE
      return doc.createTextNode(node.nodeValue || '');
    }
    if (node.nodeType !== 1) return null; // Only ELEMENT_NODE

    const rawTag = node.tagName.toLowerCase();
    if (rawTag === 'script' || rawTag === 'style' || rawTag === 'iframe' || rawTag === 'object' || rawTag === 'svg') {
      return null;
    }

    // Normalize legacy <font color="..." size="..."> generated by execCommand
    let tag = rawTag;
    let fontColor = '';
    let fontSize = '';
    if (rawTag === 'font') {
      tag = 'span';
      fontColor = (node.getAttribute('color') || '').trim();
      const sz = (node.getAttribute('size') || '').trim();
      if (FONT_SIZE_MAP[sz]) fontSize = FONT_SIZE_MAP[sz];
    } else if (rawTag === 'h1') {
      tag = 'h2';
    } else if (rawTag === 'strike' || rawTag === 'del') {
      tag = 's';
    }

    if (!ALLOWED_TAGS.has(tag)) {
      // Unwrap unknown container tags while keeping safe children
      const frag = doc.createDocumentFragment();
      for (const ch of Array.from(node.childNodes)) {
        const cleanCh = sanitizeNode(ch, doc, options);
        if (cleanCh) frag.appendChild(cleanCh);
      }
      return frag;
    }

    const out = doc.createElement(tag);

    // Allowed classes
    if (node.classList && node.classList.length) {
      for (const cls of Array.from(node.classList)) {
        if (ALLOWED_CLASSES.has(cls)) out.classList.add(cls);
      }
    }

    // Allowed inline styles
    extractSafeStyles(node, out);
    if (fontColor && COLOR_RE.test(fontColor)) out.style.color = fontColor;
    if (fontSize && SIZE_RE.test(fontSize)) out.style.fontSize = fontSize;

    // Legacy align attribute
    const alignAttr = (node.getAttribute('align') || '').trim().toLowerCase();
    if (alignAttr && ALIGN_RE.test(alignAttr) && !out.style.textAlign) {
      out.style.textAlign = alignAttr;
    }

    if (tag === 'a') {
      const safeHref = isSafeHref(node.getAttribute('href'));
      if (!safeHref) {
        // Turn unsafe link into plain span
        const span = doc.createElement('span');
        extractSafeStyles(node, span);
        for (const ch of Array.from(node.childNodes)) {
          const cleanCh = sanitizeNode(ch, doc, options);
          if (cleanCh) span.appendChild(cleanCh);
        }
        return span;
      }
      out.setAttribute('href', safeHref);
      if (/^https?:\/\//i.test(safeHref)) {
        out.setAttribute('target', '_blank');
        out.setAttribute('rel', 'noopener noreferrer');
      }
    } else if (tag === 'img') {
      const safeSrc = isSafeImgSrc(node.getAttribute('src'));
      if (!safeSrc) return null;
      out.setAttribute('src', safeSrc);
      const alt = (node.getAttribute('alt') || '').trim().slice(0, 160);
      if (alt) out.setAttribute('alt', alt);
      out.setAttribute('loading', 'lazy');
      return out;
    } else if (tag === 'br' || tag === 'hr') {
      return out;
    }

    // Callout icon protection in editor
    if (out.classList.contains('rt-callout-icon')) {
      const glyph = (node.textContent || 'i').trim().slice(0, 2) || 'i';
      out.textContent = glyph;
      if (options && options.forEditor) {
        out.setAttribute('contenteditable', 'false');
      }
      return out;
    }

    for (const ch of Array.from(node.childNodes)) {
      const cleanCh = sanitizeNode(ch, doc, options);
      if (cleanCh) out.appendChild(cleanCh);
    }

    return out;
  }

  function sanitizeFragment(rawBody, options = {}) {
    const raw = String(rawBody || '');
    const html = isRichText(raw)
      ? raw.trimStart().slice(MARKER.length)
      : plainToHtml(raw);

    const parser = new DOMParser();
    const parsed = parser.parseFromString(`<body>${html}</body>`, 'text/html');
    const frag = document.createDocumentFragment();

    for (const ch of Array.from(parsed.body.childNodes)) {
      const clean = sanitizeNode(ch, document, options);
      if (clean) frag.appendChild(clean);
    }
    return frag;
  }

  function renderInto(container, rawBody, options = {}) {
    if (!container) return;
    container.classList.add('rt-content');
    container.replaceChildren(sanitizeFragment(rawBody, options));
  }

  function serializeFromEditor(editorEl) {
    if (!editorEl) return '';
    const rawHtml = editorEl.innerHTML || '';
    const parser = new DOMParser();
    const parsed = parser.parseFromString(`<body>${rawHtml}</body>`, 'text/html');
    const temp = document.createElement('div');
    for (const ch of Array.from(parsed.body.childNodes)) {
      const clean = sanitizeNode(ch, document, { forEditor: false });
      if (clean) temp.appendChild(clean);
    }
    const textCheck = (temp.textContent || '').trim();
    const hasMedia = Boolean(temp.querySelector('img, hr, .rt-callout'));
    if (!textCheck && !hasMedia) return '';
    return MARKER + temp.innerHTML;
  }

  function toPlainPreview(rawBody, maxLen = 180) {
    const raw = String(rawBody || '');
    if (!isRichText(raw)) return raw.replace(/\s+/g, ' ').trim().slice(0, maxLen);
    const parser = new DOMParser();
    const parsed = parser.parseFromString(`<body>${raw.trimStart().slice(MARKER.length)}</body>`, 'text/html');
    return (parsed.body.textContent || '').replace(/\s+/g, ' ').trim().slice(0, maxLen);
  }

  window.NovaRichText = Object.freeze({
    MARKER,
    isRichText,
    plainToHtml,
    sanitizeFragment,
    renderInto,
    serializeFromEditor,
    toPlainPreview
  });
})();
