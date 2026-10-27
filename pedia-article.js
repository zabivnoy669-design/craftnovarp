'use strict';
(async () => {
  const db = window.getNovaSupabase ? window.getNovaSupabase() : (window.supabase && window.NOVA_SUPABASE ? window.supabase.createClient(window.NOVA_SUPABASE.url, window.NOVA_SUPABASE.publishableKey) : null);
  if (!db) return;

  const params = new URLSearchParams(location.search);
  const slug = params.get('section') || 'start';
  let activeArticleId = params.get('article') || '';

  const safe = (tag, text, cls) => {
    const n = document.createElement(tag);
    n.textContent = text || '';
    if (cls) n.className = cls;
    return n;
  };

  function renderParagraphs(body, container) {
    for (const block of String(body || '').split(/\n{2,}/)) {
      const text = block.trim();
      if (!text) continue;
      if (text.startsWith('## ')) {
        container.append(safe('h3', text.slice(3)));
      } else {
        const p = safe('p', '');
        const lines = text.split('\n');
        lines.forEach((line, idx) => {
          if (idx > 0) p.append(document.createElement('br'));
          p.append(document.createTextNode(line));
        });
        container.append(p);
      }
    }
  }

  try {
    const [{ data: sec }, { data: articles }, session] = await Promise.all([
      db.from('pedia_sections').select('*').eq('slug', slug).maybeSingle(),
      db.from('pedia_articles').select('*').eq('section_slug', slug).eq('is_published', true).order('sort_order').order('updated_at', { ascending: false }),
      db.auth.getSession()
    ]);

    const titleEl = document.getElementById('articleTitle');
    const noticeEl = document.getElementById('articleNotice');
    const heroLabelEl = document.getElementById('articleHeroLabel') || document.querySelector('.pedia-content .hero-label');
    const metaEl = document.getElementById('articleMeta') || document.querySelector('.article-meta');
    const sectionTitle = sec ? sec.title : (titleEl?.textContent || slug);

    if (sec) {
      document.title = `${sec.title} — Nova RP Pedia`;
      if (titleEl) titleEl.textContent = sec.title;
      if (noticeEl && (!articles || !articles.length)) {
        noticeEl.textContent = sec.description || `Раздел «${sec.title}» готовится к наполнению.`;
      }
    }

    const updateBreadcrumb = artTitle => {
      const crumbEl = document.getElementById('crumbTitle') || document.getElementById('crumbSection');
      if (!crumbEl) return;
      crumbEl.textContent = artTitle ? `${sectionTitle}  ·  ${artTitle}` : sectionTitle;
    };
    updateBreadcrumb('');

    if (session?.data?.session) {
      const mod = await db.rpc('pedia_is_moderator');
      if (mod.data === true) {
        const actions = document.querySelector('.actions');
        if (actions && !actions.querySelector('a[data-mod-edit="1"]')) {
          const btn = safe('a', '✎ Редактировать раздел', 'nav-button');
          btn.dataset.modEdit = '1';
          btn.href = `pedia-editor.html?section=${encodeURIComponent(slug)}`;
          actions.prepend(btn);
        }
      }
    }

    if (articles && articles.length) {
      if (heroLabelEl) heroLabelEl.textContent = 'СПРАВОЧНЫЙ РАЗДЕЛ NOVA RP';
      if (noticeEl) {
        if (sec?.description) {
          noticeEl.textContent = sec.description;
        } else {
          noticeEl.hidden = true;
        }
      }

      if (metaEl) {
        const cnt = articles.length;
        const mod10 = cnt % 10, mod100 = cnt % 100;
        const word = (mod10 === 1 && mod100 !== 11)
          ? 'статья'
          : (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20) ? 'статьи' : 'статей');
        const latest = articles.reduce((acc, r) => (!acc || r.updated_at > acc ? r.updated_at : acc), '');
        const dateLabel = latest ? `Обновлено: ${new Date(latest).toLocaleDateString('ru-RU')}` : 'Проверено редакцией';
        metaEl.replaceChildren(
          safe('span', `Статус: опубликовано (${cnt} ${word})`),
          safe('span', dateLabel)
        );
      }

      const articleEl = document.querySelector('.article-main') || document.querySelector('.article-layout article');
      const tocEl = document.querySelector('.article-toc');

      if (articleEl) {
        articleEl.replaceChildren();
        articles.forEach(row => {
          const block = document.createElement('section');
          block.className = 'article-block';
          block.id = `art-${row.id}`;
          block.dataset.articleId = String(row.id);
          block.style.scrollMarginTop = '24px';
          block.style.transition = 'background 0.25s ease, border-color 0.25s ease, padding 0.25s ease';

          block.append(safe('h2', row.title));
          if (row.summary) block.append(safe('p', row.summary, 'article-summary-lead'));
          renderParagraphs(row.body, block);
          articleEl.append(block);
        });
      }

      if (tocEl) {
        const tocHeader = safe('div', 'СТАТЬИ РАЗДЕЛА', 'side-label');
        tocEl.replaceChildren(tocHeader);
        articles.forEach(row => {
          const link = safe('a', row.title, 'toc-art-link');
          link.href = `#art-${row.id}`;
          link.dataset.articleId = String(row.id);
          link.addEventListener('click', e => {
            e.preventDefault();
            selectArticle(String(row.id), true);
          });
          tocEl.append(link);
        });
      }

      function selectArticle(id, shouldScroll) {
        const target = articles.find(a => String(a.id) === String(id)) || articles[0];
        if (!target) return;
        activeArticleId = String(target.id);

        updateBreadcrumb(target.title);

        const nextUrl = new URL(location.href);
        nextUrl.searchParams.set('section', slug);
        nextUrl.searchParams.set('article', activeArticleId);
        history.replaceState(null, '', nextUrl.pathname + nextUrl.search);

        if (window.NovaSidebar && typeof window.NovaSidebar.setActiveArticle === 'function') {
          window.NovaSidebar.setActiveArticle(slug, activeArticleId);
        }

        document.querySelectorAll('.article-block[data-article-id]').forEach(el => {
          const isMatch = el.dataset.articleId === activeArticleId;
          el.classList.toggle('is-selected-article', isMatch);
        });

        document.querySelectorAll('.toc-art-link').forEach(el => {
          const isMatch = el.dataset.articleId === activeArticleId;
          el.style.color = isMatch ? '#ecc88b' : '';
          el.style.fontWeight = isMatch ? '700' : '';
        });

        if (shouldScroll) {
          const targetEl = document.getElementById(`art-${activeArticleId}`);
          if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }

      window.__novaSelectArticleInPage = id => selectArticle(id, true);

      if (activeArticleId) {
        selectArticle(activeArticleId, articles.length > 1 && activeArticleId !== String(articles[0].id));
      } else {
        selectArticle(String(articles[0].id), false);
      }
    }
  } catch (e) {
    console.warn('Pedia article fallback active.', e);
  }
})();
