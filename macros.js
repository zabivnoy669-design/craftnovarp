'use strict';
(() => {
  const $ = id => document.getElementById(id);

  const LOCAL_MACROS_KEY = 'novaMacrosCustomItemsV2';
  const LOCAL_LIKES_KEY = 'novaMacrosLikedIdsV1';
  const LOCAL_FAVS_KEY = 'novaMacrosFavIdsV1';
  const LOCAL_REPORTS_KEY = 'novaMacrosReportedIdsV1';
  const LOCAL_AUTHOR_TOKEN_KEY = 'novaMacrosClientAuthorV1';

  const CATEGORIES = {
    government: { label: 'Государственное', badge: 'ГОСУДАРСТВЕННОЕ' },
    crime:      { label: 'Криминальное',    badge: 'КРИМИНАЛЬНОЕ' },
    family:     { label: 'Семьи',           badge: 'СЕМЬИ' },
    rp:         { label: 'RP',              badge: 'RP' },
    other:      { label: 'Прочее',          badge: 'ПРОЧЕЕ' }
  };

  const db = window.getNovaSupabase
    ? window.getNovaSupabase()
    : (window.supabase && window.NOVA_SUPABASE
      ? window.supabase.createClient(window.NOVA_SUPABASE.url, window.NOVA_SUPABASE.publishableKey)
      : null);

  let currentUser = null;
  let currentDisplayName = '';
  let isModerator = false;
  let remoteAvailable = false;

  let macros = [];
  let selectedId = null;
  let activeCategory = '';
  let searchQuery = '';
  let sortMode = 'downloads';

  let likedIds = loadJsonSet(LOCAL_LIKES_KEY);
  let favIds = loadJsonSet(LOCAL_FAVS_KEY);
  let reportedIds = loadJsonSet(LOCAL_REPORTS_KEY);
  const copyCountedInSession = new Set();
  const lastDownloadClickAt = new Map();

  function generateUuid() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    const bytes = new Uint8Array(16);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  function getClientAuthorToken() {
    try {
      let tok = localStorage.getItem(LOCAL_AUTHOR_TOKEN_KEY);
      if (!tok) {
        tok = 'local-' + generateUuid();
        localStorage.setItem(LOCAL_AUTHOR_TOKEN_KEY, tok);
      }
      return tok;
    } catch {
      return 'local-guest';
    }
  }

  function loadJsonSet(key) {
    try {
      const arr = JSON.parse(localStorage.getItem(key) || '[]');
      return new Set(Array.isArray(arr) ? arr.map(String) : []);
    } catch {
      return new Set();
    }
  }

  function saveJsonSet(key, setObj) {
    try {
      localStorage.setItem(key, JSON.stringify(Array.from(setObj)));
    } catch {}
  }

  function loadLocalCustomMacros() {
    try {
      const arr = JSON.parse(localStorage.getItem(LOCAL_MACROS_KEY) || '[]');
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  function saveLocalCustomMacros(list) {
    try {
      localStorage.setItem(LOCAL_MACROS_KEY, JSON.stringify(list));
    } catch {}
  }

  let toastTimer = null;
  function showToast(msg) {
    const elNode = $('macroToast');
    if (!elNode) return;
    elNode.textContent = msg;
    elNode.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      elNode.hidden = true;
    }, 2600);
  }

  function formatNumber(n) {
    return Math.max(0, Number(n) || 0).toLocaleString('ru-RU');
  }

  function formatShortDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  }

  function formatLongDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function canManageMacro(m) {
    if (!m) return false;
    if (isModerator) return true;
    if (currentUser && m.author_id && String(m.author_id) === String(currentUser.id)) return true;
    if (m.local_token && m.local_token === getClientAuthorToken()) return true;
    return false;
  }

  function isMyMacro(m) {
    if (!m) return false;
    if (currentUser && m.author_id && String(m.author_id) === String(currentUser.id)) return true;
    if (m.local_token && m.local_token === getClientAuthorToken()) return true;
    return false;
  }

  async function loadUserSession() {
    if (!db) return;
    try {
      const { data } = await db.auth.getSession();
      currentUser = data?.session?.user || null;
      isModerator = false;
      currentDisplayName = '';

      if (currentUser) {
        currentDisplayName = String(currentUser.user_metadata?.display_name || '').trim();
        const [profRes, modRes, likesRes] = await Promise.all([
          db.from('pedia_profiles').select('display_name').eq('id', currentUser.id).maybeSingle(),
          db.rpc('pedia_is_moderator'),
          db.from('pedia_macro_likes').select('macro_id').eq('user_id', currentUser.id)
        ]);
        if (!profRes.error && profRes.data?.display_name) {
          currentDisplayName = profRes.data.display_name;
        }
        if (!modRes.error && modRes.data === true) {
          isModerator = true;
        }
        if (!likesRes.error && Array.isArray(likesRes.data)) {
          for (const row of likesRes.data) {
            likedIds.add(String(row.macro_id));
          }
          saveJsonSet(LOCAL_LIKES_KEY, likedIds);
        }
      }
    } catch (err) {
      console.warn('Auth check fallback:', err);
    }
  }

  async function loadMacros() {
    remoteAvailable = false;
    if (db) {
      try {
        const res = await db
          .from('pedia_macros')
          .select('*')
          .eq('is_published', true)
          .order('downloads_count', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(300);

        if (!res.error && Array.isArray(res.data)) {
          remoteAvailable = true;
          macros = res.data;
        }
      } catch (err) {
        console.warn('Using localStorage macros until pedia_macros table is set up.', err);
      }
    }

    if (!remoteAvailable) {
      macros = loadLocalCustomMacros();
    }

    updateGlobalStats();
    renderAll();
  }

  function updateGlobalStats() {
    const totalEl = $('totalMacrosStat');
    const dlEl = $('totalDownloadsStat');
    if (totalEl) totalEl.textContent = formatNumber(macros.length);
    if (dlEl) {
      const sum = macros.reduce((acc, m) => acc + (Number(m.downloads_count) || 0), 0);
      dlEl.textContent = formatNumber(sum);
    }
  }

  function getFilteredAndSorted() {
    const q = searchQuery.trim().toLocaleLowerCase('ru');
    const filtered = macros.filter(m => {
      if (activeCategory && m.category !== activeCategory) return false;
      if (sortMode === 'favorites' && !favIds.has(String(m.id))) return false;
      if (sortMode === 'mine' && !isMyMacro(m)) return false;
      if (!q) return true;
      const hay = `${m.title || ''} ${m.description || ''} ${m.tags || ''} ${m.author_name || ''} ${m.hotkey || ''} ${m.macro_uuid || ''}`.toLocaleLowerCase('ru');
      return hay.includes(q);
    });

    filtered.sort((a, b) => {
      if (sortMode === 'likes') {
        const diff = (Number(b.likes_count) || 0) - (Number(a.likes_count) || 0);
        if (diff !== 0) return diff;
      } else if (sortMode === 'newest') {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      } else if (sortMode === 'updated') {
        return new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0);
      }
      const dlDiff = (Number(b.downloads_count) || 0) - (Number(a.downloads_count) || 0);
      if (dlDiff !== 0) return dlDiff;
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

    return filtered;
  }

  function renderAll(bumpDownloads = false) {
    const visible = getFilteredAndSorted();

    if (!visible.some(m => String(m.id) === String(selectedId))) {
      selectedId = visible.length ? String(visible[0].id) : null;
    }

    renderList(visible);
    const activeMacro = visible.find(m => String(m.id) === String(selectedId)) || null;
    renderDetail(activeMacro, bumpDownloads);
  }

  function renderList(list) {
    const panel = $('macroListPanel');
    if (!panel) return;
    panel.replaceChildren();

    if (!list.length) {
      const empty = el('div', 'mc-empty-box');
      empty.append(
        el('strong', '', macros.length ? 'Ничего не найдено' : 'Макросов пока нет'),
        document.createTextNode(
          macros.length
            ? 'Попробуйте сменить категорию или поисковый запрос.'
            : 'Список пока пуст — игроки ещё не добавили сюда свои макросы.'
        )
      );
      panel.appendChild(empty);
      return;
    }

    for (const m of list) {
      const isSel = String(m.id) === String(selectedId);
      const btn = el('button', 'mc-item' + (isSel ? ' is-selected' : ''));
      btn.type = 'button';
      btn.onclick = () => {
        selectedId = String(m.id);
        renderAll(false);
      };

      const head = el('div', 'mc-item-head');
      head.append(
        el('span', 'mc-item-title', m.title || 'Без названия'),
        el('span', 'mc-item-arrow', '›')
      );

      const desc = el('div', 'mc-item-desc', m.description || '');

      const foot = el('div', 'mc-item-foot');
      const catInfo = CATEGORIES[m.category] || CATEGORIES.other;
      const tag = el('span', `mc-tag ${CATEGORIES[m.category] ? m.category : 'other'}`, catInfo.badge);

      const metrics = el('div', 'mc-item-metrics');
      const likeSpan = el('span', 'mc-metric', `♡ ${formatNumber(m.likes_count)}`);
      likeSpan.title = 'Лайков';
      const dlSpan = el('span', 'mc-metric dl', `⬇ ${formatNumber(m.downloads_count)}`);
      dlSpan.title = 'Скачиваний';
      const dateSpan = el('span', 'mc-metric', formatShortDate(m.updated_at || m.created_at));

      metrics.append(likeSpan, dlSpan, dateSpan);
      foot.append(tag, metrics);

      btn.append(head, desc, foot);
      panel.appendChild(btn);
    }
  }

  function renderDetail(m, bumpDownloads = false) {
    const panel = $('macroDetailPanel');
    if (!panel) return;
    panel.replaceChildren();

    if (!m) {
      const empty = el('div', 'mc-empty-box');
      empty.append(
        el('strong', '', macros.length ? 'Выберите макрос слева' : 'Опубликуйте первый макрос'),
        el('p', '', 'Здесь отображаются макросы, загруженные самими игроками: UUID для импорта, файлы конфигураций и живой счётчик скачиваний.')
      );
      const addBtn = el('button', 'mc-submit-btn');
      addBtn.type = 'button';
      addBtn.style.marginTop = '10px';
      addBtn.append(el('span', '', '＋'), el('span', '', 'Предложить макрос'));
      addBtn.onclick = openModalForCreate;
      empty.appendChild(addBtn);
      panel.appendChild(empty);
      return;
    }

    const catKey = CATEGORIES[m.category] ? m.category : 'other';
    const catInfo = CATEGORIES[catKey];

    // 1. Header Row
    const top = el('div', 'mc-detail-top');
    const title = el('h1', 'mc-detail-title', m.title || 'МАКРОС');
    const badges = el('div', 'mc-detail-badges');

    if (canManageMacro(m)) {
      const editBtn = el('button', 'mc-manage-btn', '✎ Изменить');
      editBtn.type = 'button';
      editBtn.onclick = () => openModalForEdit(m);

      const delBtn = el('button', 'mc-manage-btn danger', '✕ Удалить');
      delBtn.type = 'button';
      delBtn.onclick = () => deleteMacro(m);

      badges.append(editBtn, delBtn);
    }

    badges.appendChild(el('span', `mc-tag ${catKey}`, catInfo.badge));
    top.append(title, badges);
    panel.appendChild(top);

    // 2. Description + Hotkey / Tags
    panel.appendChild(el('p', 'mc-detail-desc', m.description || ''));

    const tagParts = String(m.tags || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    if (m.hotkey || tagParts.length) {
      const pillsRow = el('div', 'mc-pills-row');
      if (m.hotkey) {
        pillsRow.appendChild(el('span', 'mc-mini-chip', `⌨ ${m.hotkey}`));
      }
      for (const t of tagParts) {
        pillsRow.appendChild(el('span', 'mc-mini-tag', t.startsWith('#') ? t : `#${t}`));
      }
      panel.appendChild(pillsRow);
    }

    const hasUuid = Boolean((m.macro_uuid || '').trim());
    const hasCode = Boolean((m.macro_code || '').trim());

    // 3. UUID Box (matches screenshot "UUID МАКРОСА")
    if (hasUuid) {
      const uuidBox = el('div', 'mc-code-box');
      const uuidHead = el('div', 'mc-code-head');
      uuidHead.appendChild(el('span', 'mc-code-label', 'UUID МАКРОСА'));
      const copyUuidBtn = el('button', 'mc-inline-copy', '📋 Копировать');
      copyUuidBtn.type = 'button';
      copyUuidBtn.onclick = () => copyText(m.macro_uuid.trim(), 'UUID макроса скопирован', m, true);
      uuidHead.appendChild(copyUuidBtn);
      uuidBox.append(uuidHead, el('div', 'mc-uuid-value', m.macro_uuid.trim()));
      panel.appendChild(uuidBox);
    }

    // 4. Macro Config / Script Box (if player attached a file or pasted config)
    if (hasCode) {
      const codeBox = el('div', 'mc-code-box');
      const codeHead = el('div', 'mc-code-head');
      codeHead.appendChild(
        el('span', 'mc-code-label', m.file_name ? `ФАЙЛ МАКРОСА · ${m.file_name}` : 'КОД / КОНФИГУРАЦИЯ МАКРОСА')
      );
      const copyScriptSmall = el('button', 'mc-inline-copy', '📋 Копировать');
      copyScriptSmall.type = 'button';
      copyScriptSmall.onclick = () => copyText(m.macro_code, 'Код макроса скопирован в буфер обмена', m, true);
      codeHead.appendChild(copyScriptSmall);

      const pre = el('pre', 'mc-script-value', m.macro_code);
      codeBox.append(codeHead, pre);
      panel.appendChild(codeBox);
    }

    // 5. Primary Action Bar: Download + Copy Code + Like + Favorite + Report
    const actionBar = el('div', 'mc-action-bar');

    const dlBtn = el('button', 'mc-primary-dl');
    dlBtn.type = 'button';
    dlBtn.append(
      el('span', '', '⬇'),
      el('span', '', m.file_name ? `Скачать (${m.file_name})` : 'Скачать макрос')
    );
    dlBtn.onclick = () => downloadMacroFile(m);

    const copyMainBtn = el('button', 'mc-secondary-copy');
    copyMainBtn.type = 'button';
    copyMainBtn.append(el('span', '', '📋'), el('span', '', 'Скопировать код'));
    copyMainBtn.onclick = () => {
      const toCopy = hasUuid && !hasCode ? m.macro_uuid.trim() : (hasCode ? m.macro_code : (m.macro_uuid || ''));
      copyText(toCopy, 'Код макроса скопирован!', m, true);
    };

    const isLiked = likedIds.has(String(m.id));
    const likeBtn = el('button', 'mc-icon-btn' + (isLiked ? ' is-liked' : ''), isLiked ? '♥' : '♡');
    likeBtn.type = 'button';
    likeBtn.title = isLiked ? 'Убрать лайк' : 'Поставить лайк';
    likeBtn.setAttribute('aria-label', likeBtn.title);
    likeBtn.onclick = () => toggleLike(m);

    const isFav = favIds.has(String(m.id));
    const favBtn = el('button', 'mc-icon-btn' + (isFav ? ' is-fav' : ''), isFav ? '★' : '☆');
    favBtn.type = 'button';
    favBtn.title = isFav ? 'Убрать из избранного' : 'Добавить в избранное';
    favBtn.setAttribute('aria-label', favBtn.title);
    favBtn.onclick = () => toggleFavorite(m);

    const isRep = reportedIds.has(String(m.id));
    const repBtn = el('button', 'mc-icon-btn' + (isRep ? ' is-reported' : ''), '⚑');
    repBtn.type = 'button';
    repBtn.title = isRep ? 'Жалоба отправлена' : 'Пожаловаться на макрос';
    repBtn.setAttribute('aria-label', repBtn.title);
    repBtn.onclick = () => reportMacro(m);

    actionBar.append(dlBtn, copyMainBtn, likeBtn, favBtn, repBtn);
    panel.appendChild(actionBar);

    // 6. Bottom 2-Column Metadata Grid (СКАЧИВАНИЙ, ЛАЙКОВ, АВТОР, СОЗДАН, ОБНОВЛЁН)
    const metaGrid = el('div', 'mc-meta-grid');

    const dlCell = el('div', 'mc-meta-cell');
    dlCell.appendChild(el('small', '', 'СКАЧИВАНИЙ'));
    const dlStrong = el('strong', 'gold-num' + (bumpDownloads ? ' bump-anim' : ''), formatNumber(m.downloads_count));
    dlCell.appendChild(dlStrong);

    const likesCell = el('div', 'mc-meta-cell');
    likesCell.append(el('small', '', 'ЛАЙКОВ'), el('strong', '', formatNumber(m.likes_count)));

    const authorCell = el('div', 'mc-meta-cell');
    authorCell.append(el('small', '', 'АВТОР'), el('strong', '', m.author_name || 'Аноним'));

    const createdCell = el('div', 'mc-meta-cell');
    createdCell.append(el('small', '', 'СОЗДАН'), el('strong', '', formatLongDate(m.created_at)));

    const updatedCell = el('div', 'mc-meta-cell');
    updatedCell.append(el('small', '', 'ОБНОВЛЁН'), el('strong', '', formatLongDate(m.updated_at || m.created_at)));

    const hotkeyCell = el('div', 'mc-meta-cell');
    hotkeyCell.append(
      el('small', '', isModerator && Number(m.reports_count) > 0 ? 'ЖАЛОБ (МОДЕРАЦИЯ)' : 'КЛАВИША'),
      el('strong', '', isModerator && Number(m.reports_count) > 0
        ? `${m.reports_count} шт.`
        : (m.hotkey || 'Не указана'))
    );

    metaGrid.append(dlCell, likesCell, authorCell, createdCell, updatedCell, hotkeyCell);
    panel.appendChild(metaGrid);
  }

  async function incrementDownloadCounter(m) {
    const idStr = String(m.id);
    const now = Date.now();
    if (now - (lastDownloadClickAt.get(idStr) || 0) < 1000) return;
    lastDownloadClickAt.set(idStr, now);

    m.downloads_count = (Number(m.downloads_count) || 0) + 1;

    if (remoteAvailable && db) {
      try {
        const res = await db.rpc('pedia_increment_macro_download', { p_macro_id: m.id });
        if (!res.error && typeof res.data === 'number' && res.data > 0) {
          m.downloads_count = res.data;
        }
      } catch (err) {
        console.warn('Download counter RPC fallback:', err);
      }
    } else {
      const customList = loadLocalCustomMacros();
      const idx = customList.findIndex(x => String(x.id) === idStr);
      if (idx !== -1) {
        customList[idx].downloads_count = m.downloads_count;
        saveLocalCustomMacros(customList);
      }
    }

    updateGlobalStats();
    renderAll(true);
  }

  function slugifyFilename(title) {
    const clean = String(title || 'nova-macro')
      .toLowerCase()
      .replace(/[^a-zа-яё0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);
    return clean || 'nova-macro';
  }

  async function downloadMacroFile(m) {
    const hasCode = Boolean((m.macro_code || '').trim());
    let content = '';
    let downloadName = '';

    if (hasCode && m.file_name) {
      // Preserve exact uploaded macro config file without altering its syntax!
      content = m.macro_code;
      downloadName = m.file_name;
    } else if (hasCode) {
      content = m.macro_code;
      downloadName = `${slugifyFilename(m.title)}.txt`;
    } else {
      const catInfo = CATEGORIES[m.category] || CATEGORIES.other;
      content = [
        `Название: ${m.title || ''}`,
        `Категория: ${catInfo.label}`,
        `Автор: ${m.author_name || 'Аноним'}`,
        `UUID макроса: ${m.macro_uuid || ''}`,
        m.hotkey ? `Клавиша: ${m.hotkey}` : null
      ].filter(Boolean).join('\r\n');
      downloadName = `${slugifyFilename(m.title)}.txt`;
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);

    await incrementDownloadCounter(m);
    showToast('Макрос скачан (+1 к скачиваниям)');
  }

  async function copyText(text, msg, macroObj, countAsUse) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }

    if (countAsUse && macroObj && !copyCountedInSession.has(String(macroObj.id))) {
      copyCountedInSession.add(String(macroObj.id));
      await incrementDownloadCounter(macroObj);
    }
    showToast(msg);
  }

  async function toggleLike(m) {
    const idStr = String(m.id);
    const alreadyLiked = likedIds.has(idStr);
    const delta = alreadyLiked ? -1 : 1;

    if (alreadyLiked) likedIds.delete(idStr);
    else likedIds.add(idStr);
    saveJsonSet(LOCAL_LIKES_KEY, likedIds);

    m.likes_count = Math.max(0, (Number(m.likes_count) || 0) + delta);

    if (remoteAvailable && db) {
      try {
        const res = await db.rpc('pedia_toggle_macro_like', {
          p_macro_id: m.id,
          p_guest_delta: delta
        });
        if (!res.error && res.data && typeof res.data.likes_count === 'number') {
          m.likes_count = res.data.likes_count;
          if (res.data.liked) likedIds.add(idStr);
          else likedIds.delete(idStr);
          saveJsonSet(LOCAL_LIKES_KEY, likedIds);
        }
      } catch (err) {
        console.warn('Like RPC fallback:', err);
      }
    } else {
      const customList = loadLocalCustomMacros();
      const idx = customList.findIndex(x => String(x.id) === idStr);
      if (idx !== -1) {
        customList[idx].likes_count = m.likes_count;
        saveLocalCustomMacros(customList);
      }
    }

    renderAll(false);
    showToast(likedIds.has(idStr) ? 'Вы оценили макрос ♥' : 'Лайк убран');
  }

  function toggleFavorite(m) {
    const idStr = String(m.id);
    if (favIds.has(idStr)) {
      favIds.delete(idStr);
      showToast('Убрано из избранного');
    } else {
      favIds.add(idStr);
      showToast('Добавлено в избранное ★');
    }
    saveJsonSet(LOCAL_FAVS_KEY, favIds);
    renderAll(false);
  }

  async function reportMacro(m) {
    const idStr = String(m.id);
    if (reportedIds.has(idStr)) {
      showToast('Вы уже отправили жалобу на этот макрос');
      return;
    }
    if (!confirm(`Отправить жалобу модераторам на макрос «${m.title}»?`)) return;

    reportedIds.add(idStr);
    saveJsonSet(LOCAL_REPORTS_KEY, reportedIds);
    m.reports_count = (Number(m.reports_count) || 0) + 1;

    if (remoteAvailable && db) {
      try {
        await db.rpc('pedia_report_macro', { p_macro_id: m.id });
      } catch {}
    }

    renderAll(false);
    showToast('Жалоба отправлена модераторам');
  }

  async function deleteMacro(m) {
    if (!canManageMacro(m)) return;
    if (!confirm(`Удалить макрос «${m.title}» без возможности восстановления?`)) return;

    const idStr = String(m.id);
    if (remoteAvailable && db) {
      const res = await db.from('pedia_macros').delete().eq('id', m.id);
      if (res.error) {
        showToast('Ошибка удаления: ' + res.error.message);
        return;
      }
    } else {
      const customList = loadLocalCustomMacros().filter(x => String(x.id) !== idStr);
      saveLocalCustomMacros(customList);
    }

    macros = macros.filter(x => String(x.id) !== idStr);
    if (String(selectedId) === idStr) selectedId = null;
    updateGlobalStats();
    renderAll(false);
    showToast('Макрос удалён');
  }

  function refreshAuthorBanner() {
    const banner = $('macroAuthorBanner');
    if (!banner) return;
    banner.replaceChildren();

    if (currentUser) {
      const nick = currentDisplayName || 'Участник';
      banner.append(
        el('span', '', `Вы вошли как «${nick}» — вы сможете редактировать и удалять свои макросы.`)
      );
    } else {
      const left = el('span', '', 'Можно опубликовать сразу (как Аноним / гость) или ');
      const link = el('a', '', 'войти в аккаунт');
      link.href = 'profile.html';
      left.append(link, document.createTextNode(', чтобы закреплять макросы за профилем.'));
      banner.appendChild(left);
    }
  }

  function openModalForCreate() {
    refreshAuthorBanner();
    $('macroModalTitle').textContent = 'Предложить макрос';
    $('saveMacroSubmitBtn').textContent = 'Опубликовать макрос';
    $('editMacroId').value = '';
    $('macroSubmitForm').reset();
    $('macroFileNameInput').value = '';
    $('macroAuthorInput').value = currentDisplayName || 'Аноним';
    $('macroCatInput').value = activeCategory || 'government';
    $('macroUuidInput').value = '';
    $('macroModalBackdrop').hidden = false;
    setTimeout(() => $('macroTitleInput').focus(), 30);
  }

  function openModalForEdit(m) {
    refreshAuthorBanner();
    $('macroModalTitle').textContent = 'Редактировать макрос';
    $('saveMacroSubmitBtn').textContent = 'Сохранить изменения';
    $('editMacroId').value = String(m.id);
    $('macroTitleInput').value = m.title || '';
    $('macroCatInput').value = CATEGORIES[m.category] ? m.category : 'other';
    $('macroDescInput').value = m.description || '';
    $('macroAuthorInput').value = m.author_name || 'Аноним';
    $('macroHotkeyInput').value = m.hotkey || '';
    $('macroUuidInput').value = m.macro_uuid || '';
    $('macroTagsInput').value = m.tags || '';
    $('macroCodeInput').value = m.macro_code || '';
    $('macroFileNameInput').value = m.file_name || '';
    $('macroModalBackdrop').hidden = false;
    setTimeout(() => $('macroTitleInput').focus(), 30);
  }

  function closeModal() {
    $('macroModalBackdrop').hidden = true;
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    const saveBtn = $('saveMacroSubmitBtn');
    saveBtn.disabled = true;

    try {
      const editId = $('editMacroId').value.trim();
      const title = $('macroTitleInput').value.trim();
      const category = $('macroCatInput').value;
      const description = $('macroDescInput').value.trim();
      const authorName = ($('macroAuthorInput').value.trim() || currentDisplayName || 'Аноним').slice(0, 40);
      const hotkey = $('macroHotkeyInput').value.trim().slice(0, 80);
      const macroUuid = $('macroUuidInput').value.trim().slice(0, 200);
      const tags = $('macroTagsInput').value.trim().slice(0, 200);
      const macroCode = $('macroCodeInput').value.trim();
      const fileName = $('macroFileNameInput').value.trim().slice(0, 120);

      if (title.length < 2 || description.length < 2) {
        showToast('Укажите название и краткое описание макроса');
        return;
      }

      if (!macroUuid && !macroCode) {
        showToast('Укажите UUID макроса или вставьте / загрузите файл конфигурации');
        return;
      }

      const nowIso = new Date().toISOString();

      if (editId) {
        const existing = macros.find(x => String(x.id) === editId);
        if (!existing || !canManageMacro(existing)) {
          showToast('Нет прав на редактирование этого макроса');
          return;
        }

        const patch = {
          title,
          category,
          description,
          author_name: authorName,
          hotkey,
          file_name: fileName,
          macro_uuid: macroUuid,
          tags,
          macro_code: macroCode
        };

        if (remoteAvailable && db) {
          const res = await db.from('pedia_macros').update(patch).eq('id', editId).select().single();
          if (res.error) throw res.error;
          Object.assign(existing, res.data);
        } else {
          Object.assign(existing, patch, { updated_at: nowIso });
          const customList = loadLocalCustomMacros();
          const cIdx = customList.findIndex(x => String(x.id) === editId);
          if (cIdx !== -1) {
            customList[cIdx] = existing;
            saveLocalCustomMacros(customList);
          }
        }

        closeModal();
        renderAll(false);
        showToast('Макрос обновлён!');
        return;
      }

      const payload = {
        macro_uuid: macroUuid,
        author_id: currentUser ? currentUser.id : null,
        author_name: authorName,
        category,
        title,
        description,
        hotkey,
        file_name: fileName,
        macro_code: macroCode,
        tags
      };

      let createdRow = null;

      if (remoteAvailable && db) {
        const res = await db.from('pedia_macros').insert(payload).select().single();
        if (res.error) throw res.error;
        createdRow = res.data;
      } else {
        createdRow = {
          id: generateUuid(),
          ...payload,
          local_token: getClientAuthorToken(),
          downloads_count: 0,
          likes_count: 0,
          reports_count: 0,
          is_published: true,
          created_at: nowIso,
          updated_at: nowIso
        };
        const customList = loadLocalCustomMacros();
        customList.unshift(createdRow);
        saveLocalCustomMacros(customList);
      }

      macros.unshift(createdRow);
      activeCategory = '';
      syncCategoryButtons();
      selectedId = String(createdRow.id);
      closeModal();
      updateGlobalStats();
      renderAll(false);
      showToast('Макрос опубликован!');
    } catch (err) {
      console.error(err);
      showToast('Ошибка сохранения: ' + (err.message || 'попробуйте ещё раз'));
    } finally {
      saveBtn.disabled = false;
    }
  }

  function syncCategoryButtons() {
    document.querySelectorAll('#macroCategoryTabs .mc-cat-pill').forEach(btn => {
      btn.classList.toggle('is-active', (btn.dataset.cat || '') === activeCategory);
    });
  }

  function bindEvents() {
    const urlCat = new URLSearchParams(location.search).get('cat') || '';
    if (urlCat && CATEGORIES[urlCat]) {
      activeCategory = urlCat;
      syncCategoryButtons();
    }

    $('macroCategoryTabs').addEventListener('click', e => {
      const btn = e.target.closest('.mc-cat-pill');
      if (!btn) return;
      activeCategory = btn.dataset.cat || '';
      syncCategoryButtons();
      renderAll(false);
    });

    $('macroSearch').addEventListener('input', e => {
      searchQuery = e.target.value || '';
      renderAll(false);
    });

    $('macroSort').addEventListener('change', e => {
      sortMode = e.target.value || 'downloads';
      renderAll(false);
    });

    $('openSubmitModalBtn').addEventListener('click', openModalForCreate);
    $('closeMacroModalBtn').addEventListener('click', closeModal);
    $('cancelMacroModalBtn').addEventListener('click', closeModal);
    $('macroModalBackdrop').addEventListener('click', e => {
      if (e.target === $('macroModalBackdrop')) closeModal();
    });

    $('loadMacroFileBtn').addEventListener('click', () => {
      $('macroFilePicker').click();
    });

    $('macroFilePicker').addEventListener('change', async e => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (file.size > 240 * 1024) {
        showToast('Файл слишком большой (максимум 240 КБ)');
        e.target.value = '';
        return;
      }
      const text = await file.text();
      $('macroCodeInput').value = text.slice(0, 250000);
      $('macroFileNameInput').value = file.name.slice(0, 120);
      if (!$('macroTitleInput').value.trim()) {
        $('macroTitleInput').value = file.name.replace(/\.[^.]+$/, '').slice(0, 80);
      }
      showToast(`Файл «${file.name}» прикреплён`);
      e.target.value = '';
    });

    $('macroSubmitForm').addEventListener('submit', handleFormSubmit);

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !$('macroModalBackdrop').hidden) {
        closeModal();
      }
    });
  }

  (async () => {
    bindEvents();
    await loadUserSession();
    await loadMacros();
  })();
})();
