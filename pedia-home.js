'use strict';
(async () => {
  const grid = document.querySelector('.pedia-grid');
  const db = window.getNovaSupabase
    ? window.getNovaSupabase()
    : (window.supabase && window.NOVA_SUPABASE
      ? window.supabase.createClient(window.NOVA_SUPABASE.url, window.NOVA_SUPABASE.publishableKey)
      : null);

  const safe = (tag, text, cls) => {
    const n = document.createElement(tag);
    n.textContent = text || '';
    if (cls) n.className = cls;
    return n;
  };

  if (window.NovaTransportSeed && Array.isArray(window.NovaTransportSeed.articles)) {
    const seedItems = window.NovaTransportSeed.articles.map(a => ({
      title: a.title,
      description: a.summary || 'Статья энциклопедии Nova RP Pedia',
      url: `article.html?section=transport&article=${encodeURIComponent(a.id)}`,
      keys: `${a.title} ${a.summary || ''} transport транспорт автосалон`
    }));
    window.__novaDynamicSearchItems = seedItems;
    if (grid) {
      const transportTileState = grid.querySelector('a[href="article.html?section=transport"] .tile-state');
      if (transportTileState) {
        transportTileState.classList.add('live');
        const cnt = window.NovaTransportSeed.articles.length;
        transportTileState.replaceChildren(safe('span', `${cnt} статьи`), safe('span', '↗'));
      }
    }
  }

  if (!db) return;

  try {
    const [secRes, artRes] = await Promise.all([
      db.from('pedia_sections').select('*').eq('is_active', true).order('sort_order'),
      db.from('pedia_articles').select('id,section_slug,title,summary,body,sort_order').eq('is_published', true).order('sort_order')
    ]);
    if (secRes.error) throw secRes.error;
    const sections = secRes.data;
    if (!sections || !sections.length) return;

    const countBySlug = new Map();
    const firstArtBySlug = new Map();
    const dynamicSearch = [];

    let allArts = (!artRes.error && Array.isArray(artRes.data)) ? artRes.data : [];
    if (window.NovaTransportSeed && typeof window.NovaTransportSeed.mergeTransportArticles === 'function') {
      const nonTransport = allArts.filter(a => a.section_slug !== 'transport');
      const mergedTransport = window.NovaTransportSeed.mergeTransportArticles(
        allArts.filter(a => a.section_slug === 'transport')
      );
      allArts = nonTransport.concat(mergedTransport);
    }

    for (const a of allArts) {
      countBySlug.set(a.section_slug, (countBySlug.get(a.section_slug) || 0) + 1);
      if (!firstArtBySlug.has(a.section_slug)) firstArtBySlug.set(a.section_slug, a.id);
      dynamicSearch.push({
        title: a.title,
        description: a.summary || 'Статья энциклопедии Nova RP Pedia',
        url: `article.html?section=${encodeURIComponent(a.section_slug)}&article=${encodeURIComponent(a.id)}`,
        keys: `${a.title} ${a.summary || ''} ${a.section_slug}`
      });
    }
    for (const s of sections) {
      dynamicSearch.push({
        title: s.title,
        description: s.description || 'Раздел Nova RP Pedia',
        url: s.href || `article.html?section=${encodeURIComponent(s.slug)}`,
        keys: `${s.title} ${s.description || ''} ${s.slug}`
      });
    }
    window.__novaDynamicSearchItems = dynamicSearch;

    if (grid) {
      grid.replaceChildren();
      for (const s of sections) {
        const a = document.createElement('a');
        a.className = 'pedia-tile';
        const firstArt = firstArtBySlug.get(s.slug);
        a.href = s.href || (firstArt
          ? `article.html?section=${encodeURIComponent(s.slug)}&article=${encodeURIComponent(firstArt)}`
          : `article.html?section=${encodeURIComponent(s.slug)}`);

        a.append(safe('div', s.icon || '◇', 'tile-icon'), safe('h3', s.title), safe('p', s.description));

        const cnt = countBySlug.get(s.slug) || 0;
        const isLive = Boolean(s.is_tool || cnt > 0);
        const state = safe('div', '', `tile-state${isLive ? ' live' : ''}`);
        let stateText = s.slug === 'weapons'
          ? 'Каталог оружия'
          : (s.is_tool ? 'Рабочие инструменты' : 'Раздел готовится');
        if (!s.is_tool && cnt > 0) {
          const mod10 = cnt % 10, mod100 = cnt % 100;
          const word = (mod10 === 1 && mod100 !== 11)
            ? 'статья'
            : (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20) ? 'статьи' : 'статей');
          stateText = `${cnt} ${word}`;
        }
        state.append(safe('span', stateText), safe('span', '↗'));
        a.append(state);
        grid.append(a);
      }

      const count = document.querySelector('#sections .section-bar span');
      if (count) count.textContent = `${sections.length} разделов · редактируется модератором`;
    }

    const session = await db.auth.getSession();
    if (session.data?.session) {
      const r = await db.rpc('pedia_is_moderator');
      if (r.data === true) {
        const tools = document.querySelector('.pedia-content');
        if (tools && !tools.querySelector('a[href="pedia-editor.html"]')) {
          const a = document.createElement('a');
          a.href = 'pedia-editor.html';
          a.className = 'ready-link';
          a.style.marginTop = '18px';
          a.append(safe('div', '✎', 'tile-icon'));
          const d = document.createElement('div');
          d.append(safe('strong', 'Редактировать энциклопедию'), safe('small', 'Управление разделами и вложенными статьями бокового меню'));
          a.append(d, safe('b', '→'));
          const anchor = document.querySelector('#sections') || tools.querySelector('.editor-note') || tools.querySelector('.pedia-footer');
          tools.insertBefore(a, anchor || null);
        }
      }
    }
  } catch (e) {
    console.warn('Pedia sections are using bundled fallback until setup is complete.', e);
  }
})();
