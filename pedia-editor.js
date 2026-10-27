'use strict';
(() => {
  const $ = id => document.getElementById(id), status = $('status'), cfg = window.NOVA_SUPABASE;
  if (!window.supabase || !cfg) {
    status.textContent = 'Не загрузилось подключение к Supabase. Проверьте vendor/supabase.js и supabase-config.js.';
    status.classList.add('error');
    return;
  }
  const db = window.getNovaSupabase ? window.getNovaSupabase() : window.supabase.createClient(cfg.url, cfg.publishableKey);
  let sections = [], current = null, articles = [];

  const say = (text, error = false) => {
    status.textContent = text;
    status.classList.toggle('error', error);
  };
  const ensure = r => {
    if (r.error) throw r.error;
    return r.data;
  };

  function resetArticleForm() {
    $('articleForm').reset();
    $('articleId').value = '';
    if ($('articleSortOrder')) $('articleSortOrder').value = (articles.length + 1) * 10;
    $('published').checked = true;
    $('deleteArticle').hidden = true;
    $('saveArticle').textContent = 'Сохранить и опубликовать';
  }

  function fillSection(s) {
    current = s;
    $('sectionHeading').textContent = s ? 'Изменить раздел' : 'Новый раздел';
    $('slug').value = s?.slug || '';
    $('slug').readOnly = !!s;
    $('title').value = s?.title || '';
    $('description').value = s?.description || '';
    $('icon').value = s?.icon || '◇';
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
    for (const a of articles) {
      const b = document.createElement('button');
      b.className = 'section-item';
      const t = document.createElement('span');
      t.textContent = `↳  ${a.title}`;
      const sm = document.createElement('small');
      sm.textContent = `порядок ${a.sort_order ?? 0}${a.is_published ? ' · в меню' : ' · черновик'}`;
      b.append(t, sm);
      b.onclick = () => {
        document.querySelectorAll('#articleList button').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        $('articleId').value = a.id;
        $('articleTitle').value = a.title;
        if ($('articleSortOrder')) $('articleSortOrder').value = a.sort_order ?? 0;
        $('articleSummary').value = a.summary || '';
        $('articleBody').value = a.body || '';
        $('published').checked = a.is_published;
        $('deleteArticle').hidden = false;
        $('saveArticle').textContent = a.is_published ? 'Сохранить изменения' : 'Сохранить и опубликовать';
      };
      box.append(b);
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
    say('Новая статья сразу появится как вложенный пункт меню в выбранном разделе.');
  };

  $('articleForm').onsubmit = async e => {
    e.preventDefault();
    if (!current) {
      say('Сначала выберите раздел.', true);
      return;
    }
    const data = {
      section_slug: current.slug,
      title: $('articleTitle').value.trim(),
      sort_order: $('articleSortOrder') ? (Number($('articleSortOrder').value) || 0) : 0,
      summary: $('articleSummary').value.trim(),
      body: $('articleBody').value.trim(),
      is_published: $('published').checked
    };
    const id = $('articleId').value;
    try {
      const res = id
        ? await db.from('pedia_articles').update(data).eq('id', id)
        : await db.from('pedia_articles').insert(data);
      ensure(res);
      say(data.is_published
        ? 'Статья опубликована и добавлена в раскрывающееся меню раздела.'
        : 'Черновик сохранён; посетители её не видят.');
      await loadArticles();
      resetArticleForm();
    } catch (e) {
      say('Ошибка сохранения статьи: ' + e.message, true);
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
      say('Вы вошли как модератор. Разделы и вложенные статьи публикуются сразу.');
      await loadSections();
    } catch (e) {
      say('Ошибка доступа или настройки базы. Проверьте, что выполнили pedia-editor-setup.sql: ' + e.message, true);
    }
  })();
})();
