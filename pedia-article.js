'use strict';
(async () => {
  const db = window.getNovaSupabase
    ? window.getNovaSupabase()
    : (window.supabase && window.NOVA_SUPABASE
      ? window.supabase.createClient(window.NOVA_SUPABASE.url, window.NOVA_SUPABASE.publishableKey)
      : null);
  const params = new URLSearchParams(location.search);
  const slug = params.get('section') || 'start';
  let activeArticleId = params.get('article') || '';

  const safe = (tag, text, cls) => {
    const n = document.createElement(tag);
    n.textContent = text || '';
    if (cls) n.className = cls;
    return n;
  };

  try {
    let sec = null;
    let rawArticles = [];
    let session = null;

    if (db) {
      try {
        const [secRes, artRes, sessRes] = await Promise.all([
          db.from('pedia_sections').select('*').eq('slug', slug).maybeSingle(),
          db.from('pedia_articles').select('*').eq('section_slug', slug).eq('is_published', true).order('sort_order').order('updated_at', { ascending: false }),
          db.auth.getSession()
        ]);
        sec = secRes?.data || null;
        rawArticles = Array.isArray(artRes?.data) ? artRes.data : [];
        session = sessRes || null;
      } catch (dbErr) {
        console.warn('Supabase query fallback in article view:', dbErr);
      }
    }

    const articles = (slug === 'transport' && window.NovaTransportSeed && typeof window.NovaTransportSeed.mergeTransportArticles === 'function')
      ? window.NovaTransportSeed.mergeTransportArticles(rawArticles)
      : rawArticles;

    const titleEl = document.getElementById('articleTitle');
    const noticeEl = document.getElementById('articleNotice');
    const heroLabelEl = document.getElementById('articleHeroLabel') || document.querySelector('.pedia-content .hero-label');
    const metaEl = document.getElementById('articleMeta') || document.querySelector('.article-meta');
    const sectionTitle = sec ? sec.title : (titleEl?.textContent || slug);

    let isModerator = false;
    if (session?.data?.session) {
      const mod = await db.rpc('pedia_is_moderator');
      isModerator = mod.data === true;
    }

    let modBtn = null;
    if (isModerator) {
      const actions = document.querySelector('.actions');
      if (actions) {
        modBtn = actions.querySelector('a[data-mod-edit="1"]');
        if (!modBtn) {
          modBtn = safe('a', '✎ Редактировать статью', 'nav-button');
          modBtn.dataset.modEdit = '1';
          actions.prepend(modBtn);
        }
        modBtn.href = `pedia-editor.html?section=${encodeURIComponent(slug)}`;
      }
    }

    const updateBreadcrumb = artTitle => {
      const crumbEl = document.getElementById('crumbTitle') || document.getElementById('crumbSection');
      if (!crumbEl) return;
      crumbEl.textContent = artTitle ? `${sectionTitle}  ·  ${artTitle}` : sectionTitle;
    };

    if (!articles || !articles.length) {
      if (sec) {
        document.title = `${sec.title} — Nova RP Pedia`;
        if (titleEl) titleEl.textContent = sec.title;
        if (noticeEl) {
          noticeEl.hidden = false;
          noticeEl.textContent = sec.description || `Раздел «${sec.title}» готовится к наполнению.`;
        }
      }
      updateBreadcrumb('');
      return;
    }

    const articleEl = document.querySelector('.article-main') || document.querySelector('.article-layout article');

    function findArticle(id) {
      const strId = String(id || '');
      let hit = articles.find(a => String(a.id) === strId);
      if (!hit && strId.startsWith('seed-') && window.NovaTransportSeed) {
        const seedEntry = window.NovaTransportSeed.articles.find(s => s.id === strId);
        if (seedEntry) {
          hit = articles.find(a => String(a.title || '').trim().toLowerCase() === seedEntry.title.trim().toLowerCase());
        }
      }
      return hit || articles[0];
    }

    function renderSingleArticle(id, pushHistory, shouldScrollTop) {
      const target = findArticle(id);
      if (!target) return;
      activeArticleId = String(target.id);

      document.title = `${target.title} — ${sectionTitle} · Nova RP Pedia`;
      if (heroLabelEl) heroLabelEl.textContent = sectionTitle.toUpperCase();
      if (titleEl) titleEl.textContent = target.title;
      updateBreadcrumb(target.title);

      if (noticeEl) {
        const sum = (target.summary || '').trim();
        if (sum) {
          noticeEl.hidden = false;
          noticeEl.textContent = sum;
        } else {
          noticeEl.hidden = true;
        }
      }

      if (metaEl) {
        const dateLabel = target.updated_at
          ? `Обновлено: ${new Date(target.updated_at).toLocaleDateString('ru-RU')}`
          : 'Опубликовано';
        metaEl.replaceChildren(
          safe('span', `Раздел: ${sectionTitle}`),
          safe('span', dateLabel)
        );
      }

      if (modBtn) {
        modBtn.textContent = '✎ Редактировать статью';
        modBtn.href = `pedia-editor.html?section=${encodeURIComponent(slug)}&article=${encodeURIComponent(activeArticleId)}`;
      }

      if (articleEl) {
        articleEl.classList.add('rt-content');
        if (window.NovaRichText) {
          window.NovaRichText.renderInto(articleEl, target.body, { forEditor: false });
        } else {
          articleEl.textContent = target.body || '';
        }
      }

      const nextUrl = new URL(location.href);
      nextUrl.searchParams.set('section', slug);
      nextUrl.searchParams.set('article', activeArticleId);
      if (pushHistory) {
        history.pushState({ articleId: activeArticleId }, '', nextUrl.pathname + nextUrl.search);
      } else {
        history.replaceState({ articleId: activeArticleId }, '', nextUrl.pathname + nextUrl.search);
      }

      if (window.NovaSidebar && typeof window.NovaSidebar.setActiveArticle === 'function') {
        window.NovaSidebar.setActiveArticle(slug, activeArticleId);
      }

      if (shouldScrollTop) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }

    window.__novaSelectArticleInPage = id => renderSingleArticle(id, true, true);

    window.addEventListener('popstate', () => {
      const p = new URLSearchParams(location.search);
      const nextId = p.get('article') || String(articles[0].id);
      renderSingleArticle(nextId, false, false);
    });

    renderSingleArticle(activeArticleId || String(articles[0].id), false, false);
  } catch (e) {
    console.warn('Pedia article fallback active.', e);
  }
})();
