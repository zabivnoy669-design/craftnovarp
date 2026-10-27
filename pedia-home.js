'use strict';
(async () => {
  const grid = document.querySelector('.pedia-grid');
  const transportCard = document.getElementById('showcaseTransportCard');
  const transportCount = document.getElementById('showcaseTransportCount');

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
    const seedArts = window.NovaTransportSeed.articles;
    const seedItems = seedArts.map(a => ({
      title: a.title,
      description: a.summary || 'Статья энциклопедии Nova RP Pedia',
      url: `article.html?section=transport&article=${encodeURIComponent(a.id)}`,
      keys: `${a.title} ${a.summary || ''} transport транспорт автосалон`
    }));
    window.__novaDynamicSearchItems = seedItems;

    if (transportCard && seedArts.length) {
      transportCard.href = `article.html?section=transport&article=${encodeURIComponent(seedArts[0].id)}`;
    }
    if (transportCount && seedArts.length) {
      transportCount.textContent = `${seedArts.length} АВТО · IRL`;
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

    const firstTransport = firstArtBySlug.get('transport');
    const totalTransport = countBySlug.get('transport') || 0;
    if (transportCard && firstTransport) {
      transportCard.href = `article.html?section=transport&article=${encodeURIComponent(firstTransport)}`;
    }
    if (transportCount && totalTransport > 0) {
      transportCount.textContent = `${totalTransport} АВТО · IRL`;
    }

    if (grid) {
      grid.replaceChildren();
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
          const anchor = document.querySelector('#available') || tools.querySelector('.editor-note') || tools.querySelector('.pedia-footer');
          tools.insertBefore(a, anchor || null);
        }
      }
    }
  } catch (e) {
    console.warn('Pedia sections are using bundled fallback until setup is complete.', e);
  }
})();
