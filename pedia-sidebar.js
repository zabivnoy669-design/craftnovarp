'use strict';
(() => {
  if (window.NovaSidebar) return;

  const OPEN_STATE_KEY = 'novaSidebarOpenGroupsV1';

  const DEFAULT_SECTIONS = [
    { slug: 'start', title: 'Начало игры', description: 'Первые шаги, интерфейс и полезные советы.', icon: 'puzzle', href: 'article.html?section=start', sort_order: 10, is_active: true, is_tool: false },
    { slug: 'organizations', title: 'Организации', description: 'Государственные структуры и другие объединения.', icon: 'flag', href: 'article.html?section=organizations', sort_order: 20, is_active: true, is_tool: false },
    { slug: 'jobs', title: 'Работа и профессии', description: 'Занятия, условия и способы заработка.', icon: 'briefcase', href: 'article.html?section=jobs', sort_order: 30, is_active: true, is_tool: false },
    { slug: 'transport', title: 'Транспорт', description: 'Автомобили и всё, что связано с передвижением.', icon: 'car', href: 'article.html?section=transport', sort_order: 40, is_active: true, is_tool: false },
    { slug: 'items', title: 'Предметы', description: 'Снаряжение, расходники и их применение.', icon: 'cube', href: 'article.html?section=items', sort_order: 50, is_active: true, is_tool: false }
  ];

  const TEMPLATE_SUBITEMS = [
    { hash: 'overview', title: 'Обзор раздела' },
    { hash: 'details', title: 'Основные сведения' },
    { hash: 'steps', title: 'Порядок действий' },
    { hash: 'sources', title: 'Источники и проверка' }
  ];

  const SVG_ICONS = {
    home: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/></svg>',
    pulse: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 8-4-16-3 8H2"/></svg>',
    profile: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>',
    forum: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    puzzle: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.61a2.404 2.404 0 0 1-1.705.707 2.402 2.402 0 0 1-1.704-.706l-1.568-1.568a1.026 1.026 0 0 0-.877-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 1 1-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 0 0-.289-.877l-1.568-1.568A2.402 2.402 0 0 1 1.998 12c0-.617.236-1.234.706-1.704L4.315 8.685a.98.98 0 0 1 .837-.276c.47.07.802.48.968.925a2.501 2.501 0 1 0 3.214-3.214c-.446-.166-.855-.497-.925-.968a.979.979 0 0 1 .276-.837l1.61-1.61a2.404 2.404 0 0 1 3.409 0l1.568 1.568c.23.23.556.338.877.29.493-.074.84-.504 1.02-.968a2.5 2.5 0 1 1 3.237 3.237c-.464.18-.894.527-.967 1.02Z"/></svg>',
    craft: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m14.7 6.3 3 3"/><path d="m5 19-2 2"/><path d="m2 22 6-6"/><path d="M18.4 2.6a2.12 2.12 0 0 1 3 3L8.8 18.2l-4.2 1.2 1.2-4.2Z"/></svg>',
    tactical: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M12 2v4"/><path d="M12 18v4"/><path d="M2 12h4"/><path d="M18 12h4"/></svg>',
    map: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10Z"/><circle cx="12" cy="11" r="2.3"/></svg>',
    flag: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>',
    briefcase: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
    car: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2"/><circle cx="6.5" cy="16.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/></svg>',
    cube: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 16-9 5-9-5V8l9-5 9 5z"/><path d="m3.3 7.3 8.7 4.9 8.7-4.9"/><path d="M12 22.2V12"/></svg>',
    edit: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    chevron: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
    enterArrow: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 6v5a3 3 0 0 0 3 3h10"/><path d="m14 10 4 4-4 4"/></svg>'
  };

  let cachedData = {
    loaded: false,
    sections: DEFAULT_SECTIONS,
    articlesBySlug: new Map(),
    isModerator: false
  };

  const subscribers = new Set();

  function iconMarkupForSection(sec) {
    if (!sec) return SVG_ICONS.puzzle;
    if (SVG_ICONS[sec.icon]) return SVG_ICONS[sec.icon];
    if (sec.slug === 'start') return SVG_ICONS.puzzle;
    if (sec.slug === 'organizations') return SVG_ICONS.flag;
    if (sec.slug === 'jobs') return SVG_ICONS.briefcase;
    if (sec.slug === 'transport') return SVG_ICONS.car;
    if (sec.slug === 'items') return SVG_ICONS.cube;
    if (sec.icon && sec.icon !== '◇' && sec.icon !== '◎') return null; // use custom text/emoji safely
    return SVG_ICONS.puzzle;
  }

  function makeIconSpan(cls, svgName, customGlyph) {
    const span = document.createElement('span');
    span.className = cls;
    span.setAttribute('aria-hidden', 'true');
    if (customGlyph) {
      span.textContent = customGlyph;
    } else if (SVG_ICONS[svgName]) {
      span.innerHTML = SVG_ICONS[svgName];
    } else if (svgName && svgName.startsWith('<svg')) {
      span.innerHTML = svgName;
    } else {
      span.innerHTML = SVG_ICONS.puzzle;
    }
    return span;
  }

  function loadOpenMap() {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(OPEN_STATE_KEY) || 'null');
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {}
    return null;
  }

  function saveOpenMap(map) {
    try {
      sessionStorage.setItem(OPEN_STATE_KEY, JSON.stringify(map));
    } catch {}
  }

  function currentRouteInfo() {
    const file = (location.pathname.split('/').pop() || 'home.html').toLowerCase();
    const params = new URLSearchParams(location.search);
    return {
      file: file === '' ? 'home.html' : file,
      section: params.get('section') || '',
      article: params.get('article') || '',
      hash: (location.hash || '').replace(/^#/, '')
    };
  }

  function buildFlatLink({ href, label, svgName, active }) {
    const a = document.createElement('a');
    a.className = 'side-flat-link' + (active ? ' is-active' : '');
    a.href = href;
    if (active) a.setAttribute('aria-current', 'page');

    const icon = makeIconSpan('side-flat-icon', svgName);
    const txt = document.createElement('span');
    txt.className = 'side-flat-text';
    txt.textContent = label;

    a.append(icon, txt);
    return a;
  }

  function buildTreeGroup({ id, title, svgOrCustom, countBadge, isOpen, children }) {
    const group = document.createElement('div');
    group.className = 'side-tree-group' + (isOpen ? ' is-open' : '');
    group.dataset.groupId = id;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'side-group-btn';
    btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');

    const icon = svgOrCustom.isCustom
      ? makeIconSpan('side-group-icon', null, svgOrCustom.value)
      : makeIconSpan('side-group-icon', svgOrCustom.value);

    const ttl = document.createElement('span');
    ttl.className = 'side-group-title';
    ttl.textContent = title;
    ttl.title = title;

    btn.append(icon, ttl);

    if (typeof countBadge === 'number' && countBadge > 0) {
      const pill = document.createElement('span');
      pill.className = 'side-count-pill';
      pill.textContent = String(countBadge);
      btn.appendChild(pill);
    }

    const chev = makeIconSpan('side-chevron', 'chevron');
    btn.appendChild(chev);

    const collapse = document.createElement('div');
    collapse.className = 'side-tree-collapse';
    const clip = document.createElement('div');
    clip.className = 'side-tree-clip';
    const inner = document.createElement('div');
    inner.className = 'side-tree-inner';

    for (const ch of children) {
      const wrap = document.createElement('div');
      wrap.className = 'side-child-wrap';

      const link = document.createElement('a');
      link.className = 'side-child-link' + (ch.active ? ' is-active' : '');
      link.href = ch.href;
      if (ch.datasetSection) link.dataset.section = ch.datasetSection;
      if (ch.datasetArticle) link.dataset.article = ch.datasetArticle;
      if (ch.datasetHash) link.dataset.hash = ch.datasetHash;
      if (ch.active) link.setAttribute('aria-current', 'page');

      const cIcon = ch.customIcon
        ? makeIconSpan('side-child-icon', null, ch.customIcon)
        : makeIconSpan('side-child-icon', ch.svgName || 'puzzle');

      const cText = document.createElement('span');
      cText.className = 'side-child-text';
      cText.textContent = ch.label;
      cText.title = ch.label;

      const cArrow = makeIconSpan('side-child-arrow', 'enterArrow');

      link.append(cIcon, cText, cArrow);
      if (typeof ch.onClick === 'function') {
        link.addEventListener('click', ch.onClick);
      }
      wrap.appendChild(link);
      inner.appendChild(wrap);
    }

    clip.appendChild(inner);
    collapse.appendChild(clip);
    group.append(btn, collapse);

    btn.addEventListener('click', () => {
      const nextOpen = !group.classList.contains('is-open');
      group.classList.toggle('is-open', nextOpen);
      btn.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
      const map = loadOpenMap() || {};
      map[id] = nextOpen;
      saveOpenMap(map);
    });

    return group;
  }

  function ensureMobileToggle(aside) {
    const shell = aside.closest('.pedia-shell');
    if (!shell || shell.querySelector('.pedia-mobile-nav-toggle')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pedia-mobile-nav-toggle';
    const left = document.createElement('span');
    left.textContent = '☰  Меню разделов Pedia';
    const right = document.createElement('span');
    right.textContent = 'Раскрыть ⌄';
    btn.append(left, right);
    btn.addEventListener('click', () => {
      const open = aside.classList.toggle('is-mobile-open');
      right.textContent = open ? 'Скрыть ⌃' : 'Раскрыть ⌄';
    });
    shell.insertBefore(btn, aside);
  }

  function renderSidebar() {
    const aside = document.querySelector('.pedia-side');
    if (!aside) return;

    ensureMobileToggle(aside);

    // Preserve .side-box at the bottom if present
    const existingBox = aside.querySelector('.side-box');
    const sideBoxClone = existingBox ? existingBox.cloneNode(true) : null;

    const route = currentRouteInfo();
    const savedOpen = loadOpenMap();

    const navRoot = document.createElement('nav');
    navRoot.className = 'side-nav-root';
    navRoot.setAttribute('aria-label', 'Навигация по энциклопедии');

    // 1. Top Standalone Links
    const divTop = document.createElement('div');
    divTop.className = 'side-section-divider';
    divTop.textContent = 'Навигация';
    navRoot.appendChild(divTop);

    navRoot.appendChild(buildFlatLink({
      href: 'home.html',
      label: 'Главная энциклопедии',
      svgName: 'home',
      active: route.file === 'home.html'
    }));

    navRoot.appendChild(buildFlatLink({
      href: 'profile.html',
      label: 'Профиль и достижения',
      svgName: 'profile',
      active: route.file === 'profile.html'
    }));

    navRoot.appendChild(buildFlatLink({
      href: 'forum.html',
      label: 'Форум сообщества',
      svgName: 'forum',
      active: route.file === 'forum.html'
    }));

    // 2. Encyclopedia Collapsible Sections (from Supabase pedia_sections + pedia_articles)
    const divWiki = document.createElement('div');
    divWiki.className = 'side-section-divider';
    divWiki.textContent = 'Справочник Pedia';
    navRoot.appendChild(divWiki);

    const wikiSections = cachedData.sections.filter(s => s.is_active !== false && !s.is_tool);
    wikiSections.forEach((sec, idx) => {
      const groupId = `sec:${sec.slug}`;
      const articles = cachedData.articlesBySlug.get(sec.slug) || [];
      const isCurrentSection = route.file === 'article.html' && route.section === sec.slug;

      let isOpen = false;
      if (isCurrentSection) {
        isOpen = true;
      } else if (savedOpen && Object.hasOwn(savedOpen, groupId)) {
        isOpen = Boolean(savedOpen[groupId]);
      } else if (route.file === 'home.html' && idx === 0) {
        isOpen = true;
      }

      const svgHtml = iconMarkupForSection(sec);
      const svgOrCustom = svgHtml
        ? { isCustom: false, value: svgHtml }
        : { isCustom: true, value: sec.icon };

      const children = [];
      if (articles.length > 0) {
        articles.forEach((art, aIdx) => {
          const isArtActive = isCurrentSection && (
            route.article === String(art.id) ||
            (!route.article && aIdx === 0)
          );
          children.push({
            href: `article.html?section=${encodeURIComponent(sec.slug)}&article=${encodeURIComponent(art.id)}`,
            label: art.title,
            svgName: 'puzzle',
            active: isArtActive,
            datasetSection: sec.slug,
            datasetArticle: String(art.id),
            onClick: e => {
              if (route.file === 'article.html' && currentRouteInfo().section === sec.slug && window.__novaSelectArticleInPage) {
                e.preventDefault();
                window.__novaSelectArticleInPage(String(art.id));
              }
            }
          });
        });
      } else if (sec.href && !sec.href.startsWith('article.html')) {
        children.push({
          href: sec.href,
          label: sec.title,
          svgName: 'puzzle',
          active: false
        });
      } else {
        children.push({
          href: `article.html?section=${encodeURIComponent(sec.slug)}`,
          label: 'Открыть раздел',
          svgName: 'puzzle',
          active: isCurrentSection
        });
      }

      if (cachedData.isModerator) {
        children.push({
          href: `pedia-editor.html?section=${encodeURIComponent(sec.slug)}`,
          label: 'Управление разделом',
          svgName: 'edit',
          active: false
        });
      }

      navRoot.appendChild(buildTreeGroup({
        id: groupId,
        title: sec.title,
        svgOrCustom,
        countBadge: articles.length > 0 ? articles.length : null,
        isOpen,
        children
      }));
    });

    // 3. Tools & Calculators Collapsible Groups
    const divTools = document.createElement('div');
    divTools.className = 'side-section-divider';
    divTools.textContent = 'Инструменты штата';
    navRoot.appendChild(divTools);

    const craftsOpen = savedOpen && Object.hasOwn(savedOpen, 'tools:crafts')
      ? Boolean(savedOpen['tools:crafts'])
      : false;

    navRoot.appendChild(buildTreeGroup({
      id: 'tools:crafts',
      title: 'Крафты и калькуляторы',
      svgOrCustom: { isCustom: false, value: 'craft' },
      countBadge: 2,
      isOpen: craftsOpen,
      children: [
        { href: 'index.html', label: 'Госструктуры', svgName: 'flag', active: route.file === 'index.html' },
        { href: 'ems.html', label: 'Медицинская служба EMS', svgName: 'pulse', active: route.file === 'ems.html' }
      ]
    }));

    const weaponCategories = [
      'Пистолеты',
      'Пистолеты-пулемёты',
      'Дробовики',
      'Штурмовые винтовки',
      'Пулемёты',
      'Снайперские винтовки',
      'Ближний бой'
    ];
    const currentWeaponCat = new URLSearchParams(location.search).get('category') || '';
    const weaponsOpen = route.file === 'weapons.html' || (savedOpen && Object.hasOwn(savedOpen, 'tools:weapons')
      ? Boolean(savedOpen['tools:weapons'])
      : false);

    navRoot.appendChild(buildTreeGroup({
      id: 'tools:weapons',
      title: 'Оружие',
      svgOrCustom: { isCustom: false, value: 'tactical' },
      countBadge: weaponCategories.length,
      isOpen: weaponsOpen,
      children: [
        {
          href: 'weapons.html',
          label: 'Весь каталог оружия',
          svgName: 'tactical',
          active: route.file === 'weapons.html' && !currentWeaponCat
        },
        ...weaponCategories.map(cat => ({
          href: `weapons.html?category=${encodeURIComponent(cat)}`,
          label: cat,
          svgName: 'tactical',
          active: route.file === 'weapons.html' && currentWeaponCat === cat
        }))
      ]
    }));

    const currentMapId = new URLSearchParams(location.search).get('map') || '';
    const mapsOpen = route.file === 'maps.html' || (savedOpen && Object.hasOwn(savedOpen, 'tools:maps')
      ? Boolean(savedOpen['tools:maps'])
      : false);

    navRoot.appendChild(buildTreeGroup({
      id: 'tools:maps',
      title: 'Карты GTA V',
      svgOrCustom: { isCustom: false, value: 'map' },
      countBadge: 2,
      isOpen: mapsOpen,
      children: [
        {
          href: 'maps.html?map=fort-zancudo',
          label: 'Форт Занкудо',
          svgName: 'map',
          active: route.file === 'maps.html' && (!currentMapId || currentMapId === 'fort-zancudo')
        },
        {
          href: 'maps.html?map=federal-prison',
          label: 'Тюрьма Болингброк',
          svgName: 'map',
          active: route.file === 'maps.html' && currentMapId === 'federal-prison'
        }
      ]
    }));

    const customTools = cachedData.sections.filter(s =>
      s.is_active !== false &&
      s.is_tool &&
      s.slug !== 'crafts' &&
      s.slug !== 'weapons' &&
      s.href !== 'catalogs.html' &&
      s.href !== 'weapons.html' &&
      s.href !== 'maps.html'
    );
    for (const t of customTools) {
      navRoot.appendChild(buildFlatLink({
        href: t.href || `article.html?section=${encodeURIComponent(t.slug)}`,
        label: t.title,
        svgName: 'puzzle',
        active: false
      }));
    }

    // 4. Moderator Direct Link (preserves previous functionality)
    if (cachedData.isModerator) {
      const divMod = document.createElement('div');
      divMod.className = 'side-section-divider';
      divMod.textContent = 'Модерация';
      navRoot.appendChild(divMod);

      navRoot.appendChild(buildFlatLink({
        href: 'pedia-editor.html',
        label: 'Редактор энциклопедии',
        svgName: 'edit',
        active: route.file === 'pedia-editor.html'
      }));
    }

    aside.replaceChildren(navRoot);
    if (sideBoxClone) aside.appendChild(sideBoxClone);
  }

  function setActiveArticleInSidebar(sectionSlug, articleId) {
    const aside = document.querySelector('.pedia-side');
    if (!aside) return;
    aside.querySelectorAll('.side-child-link').forEach(link => {
      const match = link.dataset.section === sectionSlug && link.dataset.article === String(articleId);
      link.classList.toggle('is-active', match);
      if (match) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  function setActiveHashInSidebar(sectionSlug, hash) {
    const aside = document.querySelector('.pedia-side');
    if (!aside) return;
    aside.querySelectorAll('.side-child-link').forEach(link => {
      const match = link.dataset.section === sectionSlug && link.dataset.hash === hash;
      link.classList.toggle('is-active', match);
      if (match) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  let fetchPromise = null;
  function loadRemoteData() {
    if (fetchPromise) return fetchPromise;
    fetchPromise = (async () => {
      const db = window.getNovaSupabase ? window.getNovaSupabase() : null;
      if (!db) return cachedData;

      try {
        const [secRes, artRes, sessRes] = await Promise.all([
          db.from('pedia_sections').select('*').eq('is_active', true).order('sort_order').order('title'),
          db.from('pedia_articles').select('id,section_slug,title,summary,body,sort_order,is_published,updated_at').eq('is_published', true).order('sort_order').order('updated_at', { ascending: false }),
          db.auth.getSession()
        ]);

        if (!secRes.error && Array.isArray(secRes.data) && secRes.data.length > 0) {
          cachedData.sections = secRes.data;
        }

        if (!artRes.error && Array.isArray(artRes.data)) {
          const bySlug = new Map();
          for (const a of artRes.data) {
            if (!bySlug.has(a.section_slug)) bySlug.set(a.section_slug, []);
            bySlug.get(a.section_slug).push(a);
          }
          cachedData.articlesBySlug = bySlug;
        }

        if (sessRes?.data?.session) {
          const modRes = await db.rpc('pedia_is_moderator');
          cachedData.isModerator = modRes.data === true;
        }

        cachedData.loaded = true;
        renderSidebar();
        for (const fn of subscribers) {
          try { fn(cachedData); } catch (err) { console.error(err); }
        }
      } catch (err) {
        console.warn('Sidebar using bundled Pedia structure:', err);
      }
      return cachedData;
    })();
    return fetchPromise;
  }

  window.NovaSidebar = Object.freeze({
    getData: () => cachedData,
    ready: () => loadRemoteData(),
    refresh: () => {
      fetchPromise = null;
      return loadRemoteData();
    },
    setActiveArticle: setActiveArticleInSidebar,
    onUpdate(fn) {
      subscribers.add(fn);
      if (cachedData.loaded) {
        try { fn(cachedData); } catch {}
      }
      return () => subscribers.delete(fn);
    }
  });

  function init() {
    renderSidebar();
    loadRemoteData();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
