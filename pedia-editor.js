'use strict';
(() => {
  const $ = id => document.getElementById(id), status = $('status'), cfg = window.NOVA_SUPABASE;
  if (!window.supabase || !cfg) {
    status.textContent = 'Не загрузилось подключение к Supabase. Проверьте vendor/supabase.js и supabase-config.js.';
    status.classList.add('error');
    return;
  }

  const db = window.getNovaSupabase ? window.getNovaSupabase() : window.supabase.createClient(cfg.url, cfg.publishableKey);
  const rtEditor = $('rtEditor');
  const sourceArea = $('articleBody');

  let sections = [], current = null, articles = [];
  let sourceMode = false;
  let savedRange = null;
  let initialArticleParam = new URLSearchParams(location.search).get('article') || '';

  const say = (text, error = false) => {
    status.textContent = text;
    status.classList.toggle('error', error);
  };
  const ensure = r => {
    if (r.error) throw r.error;
    return r.data;
  };

  /* ---------- Rich-Text Selection & Formatting Engine ---------- */
  function isNodeInsideEditor(node) {
    let cur = node;
    while (cur) {
      if (cur === rtEditor) return true;
      cur = cur.parentNode;
    }
    return false;
  }

  function saveSelection() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (isNodeInsideEditor(range.commonAncestorContainer)) {
      savedRange = range.cloneRange();
    }
  }

  function restoreSelection() {
    rtEditor.focus();
    if (!savedRange) return;
    const sel = window.getSelection();
    if (!sel) return;
    try {
      sel.removeAllRanges();
      sel.addRange(savedRange);
    } catch {}
  }

  document.addEventListener('selectionchange', () => {
    if (!sourceMode) saveSelection();
  });

  function execCmd(cmd, val = null) {
    if (sourceMode) toggleSourceMode(false);
    restoreSelection();
    try {
      document.execCommand('styleWithCSS', false, true);
    } catch {}
    document.execCommand(cmd, false, val);
    saveSelection();
  }

  // Prevent toolbar buttons from stealing focus / clearing text selection
  document.querySelectorAll('.rt-toolbar button').forEach(btn => {
    btn.addEventListener('mousedown', e => e.preventDefault());
  });

  document.querySelectorAll('.rt-tool-btn[data-cmd]').forEach(btn => {
    btn.addEventListener('click', () => {
      execCmd(btn.dataset.cmd);
    });
  });

  $('rtBlockSelect').addEventListener('change', e => {
    const tag = e.target.value || 'P';
    execCmd('formatBlock', tag);
  });

  $('rtSizeSelect').addEventListener('change', e => {
    const px = e.target.value;
    if (!px) return;
    if (sourceMode) toggleSourceMode(false);
    restoreSelection();
    try {
      document.execCommand('styleWithCSS', false, false);
      document.execCommand('fontSize', false, '7');
      rtEditor.querySelectorAll('font[size="7"]').forEach(f => {
        const span = document.createElement('span');
        span.style.fontSize = px;
        while (f.firstChild) span.appendChild(f.firstChild);
        f.replaceWith(span);
      });
    } catch {}
    e.target.value = '';
    saveSelection();
  });

  function applyTextColor(color) {
    if (!color) return;
    execCmd('foreColor', color);
  }

  document.querySelectorAll('.rt-swatch[data-color]').forEach(sw => {
    sw.addEventListener('click', () => {
      const c = sw.dataset.color;
      $('rtCustomColor').value = c;
      applyTextColor(c);
    });
  });

  $('rtCustomColor').addEventListener('input', e => {
    applyTextColor(e.target.value);
  });
  $('rtCustomColor').addEventListener('change', e => {
    applyTextColor(e.target.value);
  });

  $('rtClearFormat').addEventListener('click', () => {
    execCmd('removeFormat');
  });

  /* ---------- Info Callout Boxes (ⓘ) ---------- */
  function insertCallout(variant) {
    if (sourceMode) toggleSourceMode(false);
    restoreSelection();

    const sel = window.getSelection();
    let selectedText = '';
    if (sel && sel.rangeCount > 0 && isNodeInsideEditor(sel.anchorNode)) {
      selectedText = sel.toString().trim();
    }

    const box = document.createElement('div');
    box.className = `rt-callout rt-callout-${variant || 'red'}`;

    const icon = document.createElement('span');
    icon.className = 'rt-callout-icon';
    icon.setAttribute('contenteditable', 'false');
    icon.textContent = 'i';

    const body = document.createElement('div');
    body.className = 'rt-callout-body';
    const p = document.createElement('p');
    p.textContent = selectedText || 'Введите важную информацию или подсказку здесь…';
    body.appendChild(p);

    box.append(icon, body);

    const trailingP = document.createElement('p');
    trailingP.appendChild(document.createElement('br'));

    if (sel && sel.rangeCount > 0 && isNodeInsideEditor(sel.anchorNode)) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(trailingP);
      range.insertNode(box);
    } else {
      rtEditor.append(box, trailingP);
    }

    // Place caret inside the new callout text
    const nextRange = document.createRange();
    nextRange.selectNodeContents(p);
    if (!selectedText) {
      // Select placeholder text so typing replaces it immediately
    } else {
      nextRange.collapse(false);
    }
    sel.removeAllRanges();
    sel.addRange(nextRange);
    saveSelection();
  }

  document.querySelectorAll('.rt-tool-btn[data-callout]').forEach(btn => {
    btn.addEventListener('click', () => insertCallout(btn.dataset.callout));
  });

  $('rtUnwrapCallout').addEventListener('click', () => {
    if (sourceMode) toggleSourceMode(false);
    restoreSelection();
    const sel = window.getSelection();
    if (!sel || !sel.anchorNode) return;
    const el = sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement;
    const callout = el ? el.closest('.rt-callout') : null;
    if (!callout) {
      say('Поставьте курсор внутрь инфо-рамки ⓘ, чтобы убрать рамку.', false);
      return;
    }
    const body = callout.querySelector('.rt-callout-body');
    const frag = document.createDocumentFragment();
    if (body) {
      while (body.firstChild) frag.appendChild(body.firstChild);
    }
    callout.replaceWith(frag);
    saveSelection();
  });

  // Ensure clicking at bottom below a callout/hr always allows typing outside it
  rtEditor.addEventListener('click', e => {
    if (e.target !== rtEditor) return;
    const last = rtEditor.lastElementChild;
    if (!last || last.classList.contains('rt-callout') || last.tagName === 'HR') {
      const p = document.createElement('p');
      p.appendChild(document.createElement('br'));
      rtEditor.appendChild(p);
      const r = document.createRange();
      r.setStart(p, 0);
      r.collapse(true);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(r);
      saveSelection();
    }
  });

  // Clean paste inside WYSIWYG editor
  rtEditor.addEventListener('paste', e => {
    const clip = e.clipboardData;
    if (!clip || !window.NovaRichText) return;
    const html = clip.getData('text/html');
    const text = clip.getData('text/plain');
    e.preventDefault();
    const frag = html
      ? window.NovaRichText.sanitizeFragment(window.NovaRichText.MARKER + html, { forEditor: true })
      : window.NovaRichText.sanitizeFragment(text, { forEditor: true });
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(frag);
    range.collapse(false);
    saveSelection();
  });

  /* ---------- Link & Image Popovers ---------- */
  const linkBar = $('rtLinkBar');
  const imageBar = $('rtImageBar');

  $('rtLinkBtn').addEventListener('click', () => {
    imageBar.classList.add('hidden');
    const willOpen = linkBar.classList.contains('hidden');
    if (!willOpen) {
      linkBar.classList.add('hidden');
      return;
    }
    saveSelection();
    const sel = window.getSelection();
    const selectedText = sel ? sel.toString().trim() : '';
    $('rtLinkText').value = selectedText;

    let currentHref = '';
    if (sel && sel.anchorNode) {
      const parentEl = sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement;
      const existingA = parentEl ? parentEl.closest('a') : null;
      if (existingA) {
        currentHref = existingA.getAttribute('href') || '';
        if (!selectedText) $('rtLinkText').value = existingA.textContent || '';
      }
    }
    $('rtLinkUrl').value = currentHref;
    linkBar.classList.remove('hidden');
    ($('rtLinkText').value ? $('rtLinkUrl') : $('rtLinkText')).focus();
  });

  $('rtLinkCancel').addEventListener('click', () => linkBar.classList.add('hidden'));

  $('rtUnlinkBtn').addEventListener('click', () => {
    linkBar.classList.add('hidden');
    execCmd('unlink');
  });

  $('rtLinkApply').addEventListener('click', () => {
    const rawUrl = $('rtLinkUrl').value.trim();
    const label = $('rtLinkText').value.trim() || rawUrl;
    const color = $('rtLinkColor').value || '#e05252';
    if (!rawUrl) {
      say('Укажите адрес ссылки (например https://store.steampowered.com/...).', true);
      return;
    }
    let finalUrl = rawUrl;
    if (!/^(https?:\/\/|mailto:|#)/i.test(finalUrl) && !finalUrl.endsWith('.html') && !finalUrl.includes('.html?')) {
      finalUrl = 'https://' + finalUrl;
    }

    restoreSelection();
    const a = document.createElement('a');
    a.href = finalUrl;
    if (/^https?:\/\//i.test(finalUrl)) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
    a.style.color = color;
    a.textContent = label;

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && isNodeInsideEditor(sel.anchorNode)) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(a);
      range.setStartAfter(a);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      const p = document.createElement('p');
      p.appendChild(a);
      rtEditor.appendChild(p);
    }
    linkBar.classList.add('hidden');
    saveSelection();
  });

  $('rtImageBtn').addEventListener('click', () => {
    linkBar.classList.add('hidden');
    const willOpen = imageBar.classList.contains('hidden');
    if (!willOpen) {
      imageBar.classList.add('hidden');
      return;
    }
    saveSelection();
    $('rtImageUrl').value = '';
    $('rtImageAlt').value = '';
    imageBar.classList.remove('hidden');
    $('rtImageUrl').focus();
  });

  $('rtImageCancel').addEventListener('click', () => imageBar.classList.add('hidden'));

  $('rtImageApply').addEventListener('click', () => {
    const src = $('rtImageUrl').value.trim();
    const alt = $('rtImageAlt').value.trim();
    if (!src) return;
    restoreSelection();
    const img = document.createElement('img');
    img.src = src;
    if (alt) img.alt = alt;
    img.loading = 'lazy';

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && isNodeInsideEditor(sel.anchorNode)) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(img);
      range.setStartAfter(img);
      range.collapse(true);
    } else {
      rtEditor.appendChild(img);
    }
    imageBar.classList.add('hidden');
    saveSelection();
  });

  /* ---------- Source Mode Toggle ---------- */
  function toggleSourceMode(forceState) {
    const next = forceState !== undefined ? Boolean(forceState) : !sourceMode;
    if (next === sourceMode) return;
    sourceMode = next;
    $('rtSourceToggle').classList.toggle('active', sourceMode);
    if (sourceMode) {
      const serialized = window.NovaRichText.serializeFromEditor(rtEditor);
      sourceArea.value = serialized.startsWith(window.NovaRichText.MARKER)
        ? serialized.slice(window.NovaRichText.MARKER.length)
        : serialized;
      rtEditor.classList.add('hidden');
      sourceArea.classList.remove('hidden');
      sourceArea.focus();
    } else {
      const raw = sourceArea.value.trim();
      window.NovaRichText.renderInto(
        rtEditor,
        raw ? (window.NovaRichText.MARKER + raw) : '',
        { forEditor: true }
      );
      sourceArea.classList.add('hidden');
      rtEditor.classList.remove('hidden');
      rtEditor.focus();
    }
  }

  $('rtSourceToggle').addEventListener('click', () => toggleSourceMode());

  function setEditorContent(rawBody) {
    sourceMode = false;
    $('rtSourceToggle').classList.remove('active');
    sourceArea.classList.add('hidden');
    rtEditor.classList.remove('hidden');
    savedRange = null;
    if (!rawBody) {
      rtEditor.replaceChildren();
      sourceArea.value = '';
      return;
    }
    window.NovaRichText.renderInto(rtEditor, rawBody, { forEditor: true });
    sourceArea.value = rawBody;
  }

  function getSerializedBody() {
    if (sourceMode) {
      const raw = sourceArea.value.trim();
      if (!raw) return '';
      const temp = document.createElement('div');
      window.NovaRichText.renderInto(temp, window.NovaRichText.MARKER + raw, { forEditor: false });
      return window.NovaRichText.serializeFromEditor(temp);
    }
    return window.NovaRichText.serializeFromEditor(rtEditor);
  }

  function updateLiveLink(articleId) {
    const liveBtn = $('openArticleLive');
    if (!liveBtn) return;
    if (current && articleId) {
      liveBtn.href = `article.html?section=${encodeURIComponent(current.slug)}&article=${encodeURIComponent(articleId)}`;
      liveBtn.classList.remove('hidden');
    } else {
      liveBtn.classList.add('hidden');
    }
  }

  /* ---------- Sections & Articles CRUD ---------- */
  function resetArticleForm() {
    $('articleForm').reset();
    $('articleId').value = '';
    if ($('articleSortOrder')) $('articleSortOrder').value = (articles.length + 1) * 10;
    $('published').checked = true;
    $('deleteArticle').hidden = true;
    $('saveArticle').textContent = 'Сохранить и опубликовать';
    linkBar.classList.add('hidden');
    imageBar.classList.add('hidden');
    setEditorContent('');
    updateLiveLink('');
  }

  function selectArticleForEdit(a, btnEl) {
    document.querySelectorAll('#articleList button').forEach(x => x.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    $('articleId').value = a.id;
    $('articleTitle').value = a.title;
    if ($('articleSortOrder')) $('articleSortOrder').value = a.sort_order ?? 0;
    $('articleSummary').value = a.summary || '';
    setEditorContent(a.body || '');
    $('published').checked = a.is_published;
    $('deleteArticle').hidden = false;
    $('saveArticle').textContent = a.is_published ? 'Сохранить изменения' : 'Сохранить и опубликовать';
    updateLiveLink(a.id);
  }

  function fillSection(s) {
    current = s;
    $('sectionHeading').textContent = s ? 'Изменить раздел' : 'Новый раздел';
    $('slug').value = s?.slug || '';
    $('slug').readOnly = !!s;
    $('title').value = s?.title || '';
    $('description').value = s?.description || '';
    $('icon').value = s?.icon || 'puzzle';
    $('href').value = s?.href || '';
    $('sortOrder').value = s?.sort_order ?? (sections.length + 1) * 10;
    $('active').checked = s?.is_active ?? true;
    $('isTool').checked = s?.is_tool ?? false;
    $('deleteSection').hidden = !s;
    resetArticleForm();
    renderSections();
    renderArticles();
  }

  function renderSections() {
    const box = $('sectionList');
    box.replaceChildren();
    for (const s of sections) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'section-item' + (current?.slug === s.slug ? ' active' : '');
      const t = document.createElement('span');
      t.textContent = `${s.icon || '◇'}  ${s.title}`;
      const sm = document.createElement('small');
      sm.textContent = `${s.slug} · порядок ${s.sort_order ?? 0}${s.is_active ? '' : ' · скрыт'}`;
      b.append(t, sm);
      b.onclick = () => {
        current = s;
        fillSection(s);
        loadArticles();
      };
      box.append(b);
    }
  }

  function renderArticles() {
    const box = $('articleList');
    box.replaceChildren();
    if ($('articleSortOrder') && !$('articleId').value) {
      $('articleSortOrder').value = (articles.length + 1) * 10;
    }
    let matchedBtn = null;
    let matchedArt = null;

    for (const a of articles) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'section-item';
      const t = document.createElement('span');
      t.textContent = `↳  ${a.title}`;
      const sm = document.createElement('small');
      sm.textContent = `порядок ${a.sort_order ?? 0}${a.is_published ? ' · отдельная страница' : ' · черновик'}`;
      b.append(t, sm);
      b.onclick = () => selectArticleForEdit(a, b);
      box.append(b);

      if (initialArticleParam && String(a.id) === String(initialArticleParam)) {
        matchedBtn = b;
        matchedArt = a;
      }
    }

    if (matchedArt && matchedBtn) {
      initialArticleParam = '';
      selectArticleForEdit(matchedArt, matchedBtn);
    }
  }

  async function loadArticles() {
    if (!current) {
      articles = [];
      renderArticles();
      return;
    }
    try {
      articles = ensure(await db.from('pedia_articles').select('*').eq('section_slug', current.slug).order('sort_order').order('updated_at', { ascending: false }));
      renderArticles();
    } catch (e) {
      say('Не удалось загрузить статьи: ' + e.message, true);
    }
  }

  async function loadSections() {
    sections = ensure(await db.from('pedia_sections').select('*').order('sort_order').order('title'));
    renderSections();
    const slug = new URLSearchParams(location.search).get('section');
    fillSection(sections.find(s => s.slug === slug) || sections[0] || null);
    if (current) await loadArticles();
  }

  $('newSection').onclick = () => {
    fillSection(null);
    say('Заполните поля нового раздела.');
  };

  $('sectionForm').onsubmit = async e => {
    e.preventDefault();
    const data = {
      slug: $('slug').value.trim(),
      title: $('title').value.trim(),
      description: $('description').value.trim(),
      icon: $('icon').value.trim() || '◇',
      href: $('href').value.trim(),
      sort_order: Number($('sortOrder').value) || 0,
      is_active: $('active').checked,
      is_tool: $('isTool').checked
    };
    if (data.href) {
      try {
        const u = new URL(data.href, location.href);
        if (u.origin !== location.origin || !/^https?:$/.test(u.protocol) || data.href.startsWith('//')) {
          throw Error('Ссылка должна вести на страницу этого сайта.');
        }
      } catch {
        say('Укажите относительную ссылку на страницу этого сайта или оставьте поле пустым.', true);
        return;
      }
    }
    $('saveSection').disabled = true;
    try {
      ensure(await db.from('pedia_sections').upsert(data, { onConflict: 'slug' }));
      say('Раздел сохранён и сразу отображается в боковом меню и на главной.');
      await loadSections();
      current = sections.find(s => s.slug === data.slug) || null;
      fillSection(current);
      if (current) await loadArticles();
    } catch (e) {
      say('Ошибка сохранения раздела: ' + e.message, true);
    } finally {
      $('saveSection').disabled = false;
    }
  };

  $('deleteSection').onclick = async () => {
    if (!current || !confirm(`Удалить раздел «${current.title}» и все его статьи?`)) return;
    try {
      ensure(await db.from('pedia_sections').delete().eq('slug', current.slug));
      say('Раздел удалён.');
      current = null;
      await loadSections();
    } catch (e) {
      say('Не удалось удалить раздел: ' + e.message, true);
    }
  };

  $('newArticle').onclick = () => {
    if (!current) {
      say('Сначала выберите или создайте раздел.', true);
      return;
    }
    document.querySelectorAll('#articleList button').forEach(x => x.classList.remove('active'));
    resetArticleForm();
    rtEditor.focus();
    say('Новая статья создаётся на отдельной странице раздела.');
  };

  $('articleForm').onsubmit = async e => {
    e.preventDefault();
    if (!current) {
      say('Сначала выберите раздел.', true);
      return;
    }
    const serializedBody = getSerializedBody();
    if (serializedBody.length > 50000) {
      say('Статья превышает лимит 50 000 символов. Сократите объём текста.', true);
      return;
    }
    const data = {
      section_slug: current.slug,
      title: $('articleTitle').value.trim(),
      sort_order: $('articleSortOrder') ? (Number($('articleSortOrder').value) || 0) : 0,
      summary: $('articleSummary').value.trim(),
      body: serializedBody,
      is_published: $('published').checked
    };
    const id = $('articleId').value;
    $('saveArticle').disabled = true;
    try {
      const res = id
        ? await db.from('pedia_articles').update(data).eq('id', id).select('id').single()
        : await db.from('pedia_articles').insert(data).select('id').single();
      const savedRow = ensure(res);
      const savedId = savedRow?.id || id;
      say(data.is_published
        ? 'Статья сохранена! Все цвета, списки и инфо-рамки опубликованы на отдельной странице.'
        : 'Черновик сохранён; посетители её пока не видят.');
      initialArticleParam = String(savedId || '');
      await loadArticles();
    } catch (e) {
      say('Ошибка сохранения статьи: ' + e.message, true);
    } finally {
      $('saveArticle').disabled = false;
    }
  };

  $('deleteArticle').onclick = async () => {
    const id = $('articleId').value;
    if (!id || !confirm('Удалить эту статью без возможности восстановления?')) return;
    try {
      ensure(await db.from('pedia_articles').delete().eq('id', id));
      say('Статья удалена.');
      await loadArticles();
      resetArticleForm();
    } catch (e) {
      say('Не удалось удалить статью: ' + e.message, true);
    }
  };

  (async () => {
    try {
      const session = ensure(await db.auth.getSession());
      if (!session.session) {
        say('Сначала войдите на странице форума под аккаунтом модератора, затем вернитесь сюда.', true);
        return;
      }
      const isMod = ensure(await db.rpc('pedia_is_moderator'));
      if (!isMod) {
        say('Доступ закрыт: этот аккаунт не назначен модератором владельцем проекта.', true);
        return;
      }
      $('editor').classList.remove('hidden');
      say('Вы вошли как модератор. Выберите статью слева или создайте новую.');
      await loadSections();
    } catch (e) {
      say('Ошибка доступа или настройки базы. Проверьте, что выполнили pedia-editor-setup.sql: ' + e.message, true);
    }
  })();
})();
