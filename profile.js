'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const NP = window.NovaProfile;
  if (!NP) return;

  const TRY_SCENARIOS = [
    'найти чистый бланк медстраховки в бардачке кареты EMS',
    'проскочить КПП Форта Занкудо под видом доставщика пиццы',
    'починить рацию лёгким ударом об руль патрульной машины',
    'уговорить шефа LSPD выписать премию за ночную смену',
    'вытащить застрявший ключ из замка сейфа с материалами',
    'вспомнить пин-код от служебного шкафчика с первой попытки',
    'объяснить агенту FIB, откуда в багажнике пулемёт MK II',
    'перепрыгнуть шлагбаум Федеральной тюрьмы без единой царапины',
    'найти последнюю таблетку от амнезии на дне подсумка'
  ];

  const TOPIC_STATUS_LABELS = {
    pending: 'На проверке',
    approved: 'Опубликовано',
    rejected: 'Отклонено'
  };

  let achFilter = 'all';
  let showSecretHints = false;
  let selectedAvatar = '◈';
  let authMode = 'login';
  let db = null;
  let sbUser = null;
  let sbModerator = false;

  let directoryAccounts = [];
  let cloudExtended = false;
  let directoryLoading = false;

  function fmtInt(n) {
    return (Number(n) || 0).toLocaleString('ru-RU');
  }

  function fmtDateShort(iso) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return '—';
    }
  }

  function fmtDateTime(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  function factionInfo(id) {
    return NP.FACTIONS.find(f => f.id === id) || NP.FACTIONS[0];
  }

  function showAuthMsg(text, isError = false) {
    const guestEl = $('accountMsg');
    const userEl = $('signedInMsg');
    for (const el of [guestEl, userEl]) {
      if (!el) continue;
      if (!text) {
        el.hidden = true;
      } else {
        el.hidden = false;
        el.textContent = text;
        el.className = 'status-note ' + (isError ? 'err' : 'ok');
      }
    }
  }

  function buildEditorOptions(snap) {
    const picker = $('avatarPicker');
    picker.replaceChildren();
    for (const av of NP.AVATARS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'avatar-opt' + (av === selectedAvatar ? ' active' : '');
      btn.textContent = av;
      btn.onclick = () => {
        selectedAvatar = av;
        for (const c of picker.children) c.classList.toggle('active', c.textContent === av);
      };
      picker.appendChild(btn);
    }

    const facSel = $('dossierFactionSelect');
    if (!facSel.options.length) {
      for (const f of NP.FACTIONS) {
        const opt = document.createElement('option');
        opt.value = f.id;
        opt.textContent = f.label;
        facSel.appendChild(opt);
      }
    }
    facSel.value = snap.state.faction;

    const titleSel = $('dossierTitleSelect');
    titleSel.replaceChildren();
    for (const t of snap.availableTitles) {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = `★ ${t}`;
      titleSel.appendChild(opt);
    }
    if (snap.availableTitles.includes(snap.state.equippedTitle)) {
      titleSel.value = snap.state.equippedTitle;
    }
  }

  function renderDossierAndStats(snap) {
    const authed = snap.isAuthenticated;

    // Toggle Auth Gate vs Citizen Dossier
    $('account').hidden = authed;
    $('dossier').hidden = !authed;
    $('achGuestLockBanner').hidden = authed;

    if (authed) {
      $('heroAvatar').textContent = snap.state.avatar || '◈';
      $('heroLevelPill').textContent = `LVL ${snap.rank.current.level}`;
      $('heroStaticId').textContent = `Static #${snap.state.staticId}`;
      $('heroTitleBadge').textContent = `★ ${snap.state.equippedTitle}`;
      $('heroFactionBadge').textContent = snap.faction.label;

      const syncEl = $('heroSyncBadge');
      const isMod = snap.state.syncedUser?.role === 'moderator' || sbModerator;
      syncEl.textContent = isMod ? '✓ Модератор Pedia' : '✓ Аккаунт в базе';

      $('heroDisplayName').textContent = snap.displayName;
      $('heroMotto').textContent = snap.state.motto
        ? `«${snap.state.motto}»`
        : 'Девиз не указан — откройте настройку досье, выберите фракцию и соберите редкие титулы за достижения.';

      $('xpLevelLabel').textContent = `Уровень ${snap.rank.current.level}`;
      $('xpRankName').textContent = snap.rank.current.name;
      $('xpValueText').textContent = fmtInt(snap.rank.xp);
      $('xpNextText').textContent = snap.rank.next ? fmtInt(snap.rank.next.minXp) : `${fmtInt(snap.rank.maxTotalXp)} (МАКС)`;
      $('achCountText').textContent = `${snap.unlockedCount} / ${snap.totalAchievements}`;
      $('xpFill').style.width = `${snap.rank.pct}%`;
      $('xpProgressBar').setAttribute('aria-valuenow', String(snap.rank.pct));

      buildEditorOptions(snap);
    }

    // Telemetry
    $('statGovSpent').textContent = `${fmtInt(snap.gov.totalSpent)} мат.`;
    $('statGovSub').textContent = snap.gov.lines > 0
      ? `Позиций в плане: ${snap.gov.lines} · Выпуск: ${fmtInt(snap.gov.totalQty)} ед.`
      : 'План пуст · нажмите, чтобы собрать';

    $('statEmsSpent').textContent = `${fmtInt(snap.ems.totalSpent)} мат.`;
    $('statEmsSub').textContent = snap.ems.lines > 0
      ? `Позиций: ${snap.ems.lines} · Страховок: ${fmtInt(snap.ems.produced.ems_insurance || 0)} шт.`
      : 'План пуст · медикаменты и страховки';

    $('statMapsCount').textContent = `${fmtInt(snap.maps.totalStrokes)} фигур`;
    $('statMapsSub').textContent = snap.maps.bothMapsMarked
      ? 'Размечены обе тактические карты'
      : (snap.maps.totalStrokes > 0 ? `Макс. на одной карте: ${snap.maps.maxSingleCount} пометок` : 'Форт Занкудо и Федеральная тюрьма');

    const coreVisited = authed
      ? ['home', 'gov', 'ems', 'weapons', 'maps', 'forum'].filter(p => snap.state.visitedPages.includes(p)).length
      : 0;
    $('statTourCount').textContent = `${coreVisited} / 6 вкладок`;
    $('statWeaponsSub').textContent = authed
      ? `Категорий оружия изучено: ${snap.state.weaponCategories.length}`
      : 'Войдите в аккаунт для учёта маршрута';

    // /try widget state
    $('trySubmitBtn').textContent = authed ? 'Бросить' : '🔒 Войти и бросить';
    const ts = authed ? (snap.state.tryStats || {}) : {};
    const total = ts.total || 0;
    const wins = ts.successes || 0;
    const rate = total > 0 ? Math.round((wins / total) * 100) : 0;
    $('tryTotalCount').textContent = String(total);
    $('tryWinRate').textContent = `${rate}%`;
    $('tryCurrentStreak').textContent = String(ts.currentStreak || 0);
    $('tryBestStreak').textContent = String(ts.bestStreak || 0);

    if (authed && ts.lastRoll) {
      $('tryResultText').textContent = `* ${snap.displayName} попытался(ась) ${ts.lastRoll.action}`;
      const b = $('tryOutcomeBadge');
      b.hidden = false;
      b.textContent = ts.lastRoll.success ? 'Удачно' : 'Неудачно';
      b.className = 'try-outcome ' + (ts.lastRoll.success ? 'win' : 'lose');
    } else if (!authed) {
      $('tryResultText').textContent = '* Войдите в аккаунт выше, чтобы бросать /try и копить серию для секретного титула.';
      $('tryOutcomeBadge').hidden = true;
    } else {
      $('tryResultText').textContent = '* Введите любое РП-действие и проверьте благосклонность рандома.';
      $('tryOutcomeBadge').hidden = true;
    }

    // Filter pill counts
    const secretTotal = snap.achievements.filter(a => a.secret).length;
    const unlockedTotal = snap.unlockedCount;
    const lockedTotal = snap.totalAchievements - unlockedTotal;
    for (const btn of $('achFilterBar').querySelectorAll('[data-filter]')) {
      const f = btn.dataset.filter;
      if (f === 'all') btn.textContent = `Все (${snap.totalAchievements})`;
      if (f === 'unlocked') btn.textContent = `Открытые (${unlockedTotal})`;
      if (f === 'locked') btn.textContent = `Не открытые (${lockedTotal})`;
      if (f === 'secret') btn.textContent = `Секретные (${secretTotal})`;
      btn.classList.toggle('active', f === achFilter);
    }

    renderAchievements(snap);
    renderDirectoryList();
  }

  function renderAchievements(snap) {
    const grid = $('achGrid');
    grid.replaceChildren();

    const list = snap.achievements.filter(a => {
      if (achFilter === 'unlocked') return a.isUnlocked;
      if (achFilter === 'locked') return !a.isUnlocked;
      if (achFilter === 'secret') return Boolean(a.secret);
      return true;
    });

    list.sort((a, b) => {
      if (a.isUnlocked !== b.isUnlocked) return a.isUnlocked ? -1 : 1;
      if (a.isUnlocked && b.isUnlocked) return String(b.unlockedAt).localeCompare(String(a.unlockedAt));
      return 0;
    });

    if (!list.length) {
      const empty = document.createElement('p');
      empty.className = 'panel-sub';
      empty.textContent = !snap.isAuthenticated && achFilter === 'unlocked'
        ? 'Войдите в аккаунт выше, чтобы начать открывать достижения.'
        : 'В этой категории пока нет достижений.';
      grid.appendChild(empty);
      return;
    }

    for (const ach of list) {
      const card = document.createElement('article');
      card.className = `ach-card ${ach.isUnlocked ? 'unlocked' : 'locked'}`;
      card.dataset.rarity = ach.rarity;

      const masked = ach.secret && !ach.isUnlocked;

      const head = document.createElement('div');
      head.className = 'ach-head';

      const icon = document.createElement('div');
      icon.className = 'ach-icon';
      icon.textContent = masked ? '🔒' : ach.icon;

      const badges = document.createElement('div');
      badges.className = 'ach-badges';

      const rTag = document.createElement('span');
      rTag.className = 'rarity-tag';
      rTag.dataset.rarity = ach.rarity;
      rTag.textContent = ach.rarityLabel;

      const xpTag = document.createElement('span');
      xpTag.className = 'xp-tag';
      xpTag.textContent = `+${ach.xp} XP`;

      badges.append(rTag, xpTag);
      head.append(icon, badges);

      const title = document.createElement('h3');
      title.className = 'ach-title';
      title.textContent = masked ? 'Засекреченное досье ???' : ach.title;

      const desc = document.createElement('p');
      desc.className = 'ach-desc';
      if (masked) {
        desc.textContent = showSecretHints
          ? `Наводка информатора: ${ach.riddle}`
          : 'Условие скрыто грифом FIB. Включите подсказки выше или экспериментируйте под своим аккаунтом.';
      } else {
        desc.textContent = ach.description;
      }

      card.append(head, title, desc);

      if (snap.isAuthenticated && !ach.isUnlocked && ach.progressData && (!ach.secret || showSecretHints)) {
        const { current, target, unit } = ach.progressData;
        const pct = Math.min(100, Math.round((current / target) * 100));
        const prog = document.createElement('div');
        prog.className = 'ach-prog';

        const lbl = document.createElement('div');
        lbl.className = 'ach-prog-label';
        const s1 = document.createElement('span');
        s1.textContent = 'Прогресс';
        const s2 = document.createElement('span');
        s2.textContent = `${current} / ${target} ${unit}`;
        lbl.append(s1, s2);

        const bar = document.createElement('div');
        bar.className = 'ach-prog-bar';
        const fill = document.createElement('div');
        fill.className = 'ach-prog-fill';
        fill.style.width = `${pct}%`;
        bar.appendChild(fill);

        prog.append(lbl, bar);
        card.appendChild(prog);
      }

      const foot = document.createElement('div');
      foot.className = 'ach-foot';

      if (ach.isUnlocked) {
        const dt = document.createElement('span');
        dt.className = 'ach-date';
        dt.textContent = `✓ Открыто ${fmtDateTime(ach.unlockedAt)}`;

        const equipBtn = document.createElement('button');
        equipBtn.type = 'button';
        const isEq = snap.state.equippedTitle === ach.rewardTitle;
        equipBtn.className = 'equip-mini-btn' + (isEq ? ' equipped' : '');
        equipBtn.textContent = isEq ? `Надет: «${ach.rewardTitle}»` : `Надеть «${ach.rewardTitle}»`;
        if (!isEq) {
          equipBtn.onclick = () => NP.equipTitle(ach.rewardTitle);
        }
        foot.append(dt, equipBtn);
      } else {
        const reward = document.createElement('span');
        reward.style.color = 'var(--muted)';
        reward.textContent = masked ? 'Титул: ???' : `Награда: «${ach.rewardTitle}»`;
        foot.appendChild(reward);

        if (!snap.isAuthenticated) {
          const loginLink = document.createElement('a');
          loginLink.className = 'ach-link';
          loginLink.href = '#account';
          loginLink.textContent = '🔒 Нужен вход →';
          foot.appendChild(loginLink);
        } else if (ach.actionUrl && (!masked || showSecretHints)) {
          const link = document.createElement('a');
          link.className = 'ach-link';
          link.href = ach.actionUrl;
          link.textContent = ach.actionText || 'Перейти →';
          foot.appendChild(link);
        }
      }

      card.appendChild(foot);
      grid.appendChild(card);
    }
  }

  // --- PUBLIC DIRECTORY OF ALL ACCOUNTS ---
  async function loadAccountsDirectory() {
    if (!db || directoryLoading) return;
    directoryLoading = true;
    const grid = $('dirGrid');
    if (!directoryAccounts.length) {
      grid.replaceChildren();
      const loadingEl = document.createElement('span');
      loadingEl.className = 'panel-sub';
      loadingEl.textContent = 'Загрузка списка аккаунтов из таблицы pedia_profiles…';
      grid.appendChild(loadingEl);
    }

    try {
      let rows = null;
      const extRes = await db
        .from('pedia_profiles')
        .select('id,display_name,created_at,avatar,faction,equipped_title,motto,xp,achievements_count,unlocked_achievements')
        .order('created_at', { ascending: false })
        .limit(500);

      if (!extRes.error && Array.isArray(extRes.data)) {
        rows = extRes.data;
        cloudExtended = true;
        $('cloudSqlNotice').hidden = true;
      } else {
        const baseRes = await db
          .from('pedia_profiles')
          .select('id,display_name,created_at')
          .order('created_at', { ascending: false })
          .limit(500);
        if (baseRes.error) throw baseRes.error;
        rows = baseRes.data || [];
        cloudExtended = false;
        $('cloudSqlNotice').hidden = false;
      }

      // Fetch approved forum topics & comments counts per author
      const [topicsRes, commentsRes] = await Promise.all([
        db.from('pedia_topics').select('author_id').eq('status', 'approved').limit(1000),
        db.from('pedia_comments').select('author_id').eq('status', 'approved').limit(2000)
      ]);

      const topicMap = new Map();
      for (const r of (topicsRes.data || [])) {
        topicMap.set(r.author_id, (topicMap.get(r.author_id) || 0) + 1);
      }
      const commentMap = new Map();
      for (const r of (commentsRes.data || [])) {
        commentMap.set(r.author_id, (commentMap.get(r.author_id) || 0) + 1);
      }

      directoryAccounts = rows.map(r => ({
        id: r.id,
        staticId: NP.staticIdFromUuid(r.id),
        displayName: r.display_name || 'Участник',
        createdAt: r.created_at || null,
        avatar: r.avatar || '◈',
        faction: r.faction || 'civilian',
        equippedTitle: r.equipped_title || 'Гражданин штата',
        motto: r.motto || '',
        xp: Number(r.xp) || 0,
        achievementsCount: Number(r.achievements_count) || 0,
        unlockedAchievements: r.unlocked_achievements && typeof r.unlocked_achievements === 'object' ? r.unlocked_achievements : {},
        topicsCount: topicMap.get(r.id) || 0,
        commentsCount: commentMap.get(r.id) || 0
      }));

      renderDirectoryList();
    } catch (err) {
      console.error(err);
      grid.replaceChildren();
      const errEl = document.createElement('span');
      errEl.className = 'status-note err';
      errEl.textContent = 'Не удалось загрузить общий список аккаунтов из Supabase: ' + (err.message || 'проверьте подключение.');
      grid.appendChild(errEl);
    } finally {
      directoryLoading = false;
    }
  }

  function getMergedDirectoryAccounts() {
    const snap = NP.getSnapshot();
    return directoryAccounts.map(acc => {
      if (snap.isAuthenticated && snap.authUser?.id === acc.id) {
        return {
          ...acc,
          displayName: snap.displayName,
          avatar: snap.state.avatar || acc.avatar,
          faction: snap.state.faction || acc.faction,
          equippedTitle: snap.state.equippedTitle || acc.equippedTitle,
          motto: snap.state.motto || acc.motto,
          xp: Math.max(acc.xp, snap.rank.xp),
          achievementsCount: Math.max(acc.achievementsCount, snap.unlockedCount),
          unlockedAchievements: { ...acc.unlockedAchievements, ...snap.state.unlocked }
        };
      }
      return acc;
    });
  }

  function inspectPlayer(acc) {
    const box = $('inspectedPlayerCard');
    box.hidden = false;
    box.replaceChildren();

    const rankInfo = NP.getRankInfo(acc.xp || 0);
    const fac = factionInfo(acc.faction);

    const top = document.createElement('div');
    top.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap';

    const left = document.createElement('div');
    left.style.cssText = 'display:flex;align-items:center;gap:14px;flex-wrap:wrap';

    const av = document.createElement('div');
    av.className = 'arc-avatar';
    av.style.cssText = 'width:54px;height:54px;font-size:25px';
    av.textContent = acc.avatar || '◈';

    const info = document.createElement('div');
    const nm = document.createElement('div');
    nm.style.cssText = 'font-size:18px;font-weight:800;color:#fbf6eb';
    nm.textContent = `${acc.displayName} · Static #${acc.staticId}`;

    const meta = document.createElement('div');
    meta.className = 'panel-sub';
    meta.textContent = `★ ${acc.equippedTitle} · ${fac.label} · В штате с ${fmtDateShort(acc.createdAt)}`;
    info.append(nm, meta);
    left.append(av, info);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'btn';
    closeBtn.textContent = '✕ Закрыть визитку';
    closeBtn.onclick = () => { box.hidden = true; };

    top.append(left, closeBtn);
    box.appendChild(top);

    if (acc.motto) {
      const m = document.createElement('p');
      m.className = 'panel-sub';
      m.style.color = '#d9e3f0';
      m.textContent = `Девиз: «${acc.motto}»`;
      box.appendChild(m);
    }

    const statsLine = document.createElement('div');
    statsLine.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap';
    const c1 = document.createElement('span');
    c1.className = 'chip title-badge';
    c1.textContent = `Уровень ${rankInfo.current.level} · ${rankInfo.current.name} (${fmtInt(acc.xp)} XP)`;
    const c2 = document.createElement('span');
    c2.className = 'chip';
    c2.textContent = `Открыто достижений: ${acc.achievementsCount} / ${NP.ACHIEVEMENTS.length}`;
    const c3 = document.createElement('span');
    c3.className = 'chip';
    c3.textContent = `Форум: ${acc.topicsCount} тем · ${acc.commentsCount} комм.`;
    statsLine.append(c1, c2, c3);
    box.appendChild(statsLine);

    const unlockedIds = Object.keys(acc.unlockedAchievements || {});
    if (unlockedIds.length) {
      const iconsRow = document.createElement('div');
      iconsRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;padding-top:4px';
      for (const a of NP.ACHIEVEMENTS) {
        if (!acc.unlockedAchievements[a.id]) continue;
        const pill = document.createElement('span');
        pill.className = 'chip';
        pill.style.borderColor = 'rgba(236,200,139,.35)';
        pill.style.color = '#f3e5c8';
        pill.textContent = `${a.icon} ${a.title}`;
        iconsRow.appendChild(pill);
      }
      box.appendChild(iconsRow);
    }
  }

  function renderDirectoryList() {
    const grid = $('dirGrid');
    if (!grid) return;

    const all = getMergedDirectoryAccounts();
    $('dirCountBadge').textContent = String(all.length);

    if (!directoryAccounts.length && !directoryLoading) {
      grid.replaceChildren();
      const p = document.createElement('span');
      p.className = 'panel-sub';
      p.textContent = db
        ? 'Пока не найдено ни одного зарегистрированного аккаунта. Создайте первый аккаунт выше!'
        : 'Подключение к Supabase недоступно.';
      grid.appendChild(p);
      return;
    }
    if (!directoryAccounts.length) return;

    const q = ($('dirSearchInput').value || '').trim().toLocaleLowerCase('ru');
    const sortBy = $('dirSortSelect').value;

    const filtered = all.filter(acc => {
      if (!q) return true;
      const fac = factionInfo(acc.faction).label;
      const hay = `${acc.displayName} ${acc.staticId} #${acc.staticId} ${acc.equippedTitle} ${fac}`.toLocaleLowerCase('ru');
      return hay.includes(q);
    });

    filtered.sort((a, b) => {
      if (sortBy === 'xp') {
        if (b.xp !== a.xp) return b.xp - a.xp;
        if (b.achievementsCount !== a.achievementsCount) return b.achievementsCount - a.achievementsCount;
        return String(b.createdAt).localeCompare(String(a.createdAt));
      }
      if (sortBy === 'oldest') return String(a.createdAt).localeCompare(String(b.createdAt));
      if (sortBy === 'activity') {
        const actA = a.topicsCount * 3 + a.commentsCount;
        const actB = b.topicsCount * 3 + b.commentsCount;
        if (actB !== actA) return actB - actA;
        return b.xp - a.xp;
      }
      if (sortBy === 'name') return a.displayName.localeCompare(b.displayName, 'ru');
      return String(b.createdAt).localeCompare(String(a.createdAt));
    });

    grid.replaceChildren();
    if (!filtered.length) {
      const p = document.createElement('span');
      p.className = 'panel-sub';
      p.textContent = 'По вашему запросу аккаунтов не найдено.';
      grid.appendChild(p);
      return;
    }

    const currentUid = NP.getSnapshot().authUser?.id || null;

    for (const acc of filtered) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'account-row-card' + (currentUid === acc.id ? ' is-self' : '');
      btn.onclick = () => inspectPlayer(acc);

      const top = document.createElement('div');
      top.className = 'arc-top';

      const av = document.createElement('div');
      av.className = 'arc-avatar';
      av.textContent = acc.avatar || '◈';

      const main = document.createElement('div');
      main.className = 'arc-main';

      const nameLine = document.createElement('div');
      nameLine.className = 'arc-name-line';

      const nm = document.createElement('span');
      nm.className = 'arc-name';
      nm.textContent = acc.displayName;
      nameLine.appendChild(nm);

      if (currentUid === acc.id) {
        const you = document.createElement('span');
        you.className = 'arc-you';
        you.textContent = 'Вы';
        nameLine.appendChild(you);
      }

      const sub = document.createElement('div');
      sub.className = 'arc-sub';
      const facShort = factionInfo(acc.faction).short;
      sub.textContent = `Static #${acc.staticId} · ${facShort} · ★ ${acc.equippedTitle}`;

      main.append(nameLine, sub);
      top.append(av, main);

      const chips = document.createElement('div');
      chips.className = 'arc-chips';

      const leftStat = document.createElement('span');
      if (cloudExtended || currentUid === acc.id) {
        const rk = NP.getRankInfo(acc.xp || 0);
        leftStat.className = 'arc-xp';
        leftStat.textContent = `LVL ${rk.current.level} · ★ ${acc.achievementsCount}/16 (${fmtInt(acc.xp)} XP)`;
      } else {
        leftStat.textContent = `В штате с ${fmtDateShort(acc.createdAt)}`;
      }

      const rightStat = document.createElement('span');
      rightStat.textContent = `Форум: ${acc.topicsCount + acc.commentsCount}`;

      chips.append(leftStat, rightStat);
      btn.append(top, chips);
      grid.appendChild(btn);
    }
  }

  // --- SUPABASE AUTHENTICATION & SYNC ---
  async function nicknameEmail(login) {
    const v = login.trim().toLowerCase();
    if (v.includes('@')) return v;
    if (!/^[a-z0-9_]{3,24}$/.test(v)) {
      throw new Error('Никнейм должен содержать от 3 до 24 символов: латиница, цифры или _.');
    }
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v));
    return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('') + '@accounts.novarp.invalid';
  }

  function generateSecret() {
    const v = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(v, b => b.toString(16).padStart(2, '0')).join('').match(/.{1,8}/g).join('-');
  }

  async function recoveryCall(body) {
    const r = await db.functions.invoke('account-recovery', { body });
    if (r.error) {
      let msg = 'Сервер восстановления недоступен.';
      try {
        const payload = await r.error.context.json();
        if (payload?.message) msg = payload.message;
      } catch {}
      throw new Error(msg);
    }
    return r.data;
  }

  async function ensureProfileRow(user) {
    // Try extended columns first, fallback to base columns
    let prof = null;
    const ext = await db
      .from('pedia_profiles')
      .select('id,display_name,created_at,avatar,faction,equipped_title,motto,xp,achievements_count,unlocked_achievements')
      .eq('id', user.id)
      .maybeSingle();

    if (!ext.error) {
      prof = ext.data;
    } else {
      const base = await db
        .from('pedia_profiles')
        .select('id,display_name,created_at')
        .eq('id', user.id)
        .maybeSingle();
      if (base.error) throw base.error;
      prof = base.data;
    }

    if (prof) return prof;

    let name = String(user.user_metadata?.display_name || 'Участник').trim().slice(0, 40);
    if (name.length < 2) name = 'Участник';
    const ins = await db.from('pedia_profiles').insert({ id: user.id, display_name: name }).select('id,display_name,created_at').maybeSingle();
    if (ins.error && ins.error.code !== '23505') throw ins.error;
    return ins.data || { id: user.id, display_name: name, created_at: new Date().toISOString() };
  }

  async function refreshSupabaseProfile() {
    if (!db) return;
    try {
      const { data: sessionRes, error: sErr } = await db.auth.getSession();
      if (sErr) throw sErr;
      const session = sessionRes.session;
      sbUser = session?.user || null;
      sbModerator = false;

      if (!sbUser) {
        $('uEditorBtn').hidden = true;
        NP.syncSupabaseAccount(null);
        await loadAccountsDirectory();
        return;
      }

      const prof = await ensureProfileRow(sbUser);
      const modRes = await db.rpc('pedia_is_moderator');
      sbModerator = modRes.data === true;
      $('uEditorBtn').hidden = !sbModerator;

      // Try reading private progress if table exists
      let remoteProgress = null;
      try {
        const progRes = await db.from('pedia_user_progress').select('state').eq('user_id', sbUser.id).maybeSingle();
        if (!progRes.error && progRes.data?.state) remoteProgress = progRes.data.state;
      } catch {}

      const [topicsRes, commentsRes] = await Promise.all([
        db.from('pedia_topics').select('id,title,status,created_at').eq('author_id', sbUser.id).order('created_at', { ascending: false }).limit(8),
        db.from('pedia_comments').select('id', { count: 'exact', head: true }).eq('author_id', sbUser.id)
      ]);

      const topics = topicsRes.data || [];
      const commentsCount = commentsRes.count || 0;

      $('uForumTotals').textContent = `${topics.length} тем · ${commentsCount} комм.`;
      const listEl = $('uTopicsList');
      listEl.replaceChildren();
      if (!topics.length) {
        const p = document.createElement('span');
        p.className = 'panel-sub';
        p.textContent = 'У вас пока нет созданных тем на форуме. Предложите тему, чтобы открыть достижение «Голос улиц»!';
        listEl.appendChild(p);
      } else {
        for (const t of topics.slice(0, 5)) {
          const item = document.createElement('a');
          item.className = 'topic-mini-item';
          item.href = 'forum.html';
          const ttl = document.createElement('span');
          ttl.textContent = t.title;
          const st = document.createElement('span');
          st.className = 'topic-mini-status';
          st.textContent = TOPIC_STATUS_LABELS[t.status] || t.status;
          item.append(ttl, st);
          listEl.appendChild(item);
        }
      }

      NP.syncSupabaseAccount({
        id: sbUser.id,
        email: sbUser.email || '',
        accessToken: session.access_token || '',
        displayName: prof.display_name,
        moderator: sbModerator,
        topicsCount: topics.length,
        commentsCount,
        createdAt: prof.created_at,
        remoteProfile: prof,
        remoteProgress
      });

      await loadAccountsDirectory();
    } catch (err) {
      console.error(err);
      showAuthMsg(err.message || 'Не удалось синхронизировать профиль с базой данных.', true);
    }
  }

  function updateAuthFormMode() {
    for (const b of $('profileAuthTabs').querySelectorAll('[data-mode]')) {
      b.classList.toggle('active', b.dataset.mode === authMode);
    }
    const needSecret = authMode !== 'login';
    $('pAuthSecretWrap').hidden = !needSecret;
    $('pAuthSecret').required = needSecret;
    $('pAuthPassLabel').textContent = authMode === 'reset' ? 'Новый пароль (мин. 8 символов)' : 'Пароль';
    $('pAuthPassword').minLength = authMode === 'login' ? 1 : 8;
    $('pAuthSubmitBtn').textContent = ({
      login: 'Войти и активировать профиль',
      register: 'Создать аккаунт и получить Static ID',
      reset: 'Восстановить пароль'
    })[authMode];
  }

  function bindEvents() {
    $('toggleDossierBtn').onclick = () => {
      const form = $('dossierForm');
      const snap = NP.getSnapshot();
      selectedAvatar = snap.state.avatar;
      $('dossierNameInput').value = snap.displayName || '';
      $('dossierMottoInput').value = snap.state.motto || '';
      buildEditorOptions(snap);
      form.hidden = !form.hidden;
    };

    $('cancelDossierBtn').onclick = () => {
      $('dossierForm').hidden = true;
    };

    $('dossierForm').onsubmit = async e => {
      e.preventDefault();
      if (!db || !sbUser) return;
      const newName = $('dossierNameInput').value.trim();
      if (newName.length < 2 || newName.length > 40) {
        showAuthMsg('Имя должно быть от 2 до 40 символов.', true);
        return;
      }

      try {
        const { error } = await db.from('pedia_profiles').update({ display_name: newName }).eq('id', sbUser.id);
        if (error) throw error;

        NP.updateDossier({
          customName: newName,
          avatar: selectedAvatar,
          faction: $('dossierFactionSelect').value,
          equippedTitle: $('dossierTitleSelect').value,
          motto: $('dossierMottoInput').value
        });

        await refreshSupabaseProfile();
        showAuthMsg('✓ Досье и имя в базе данных обновлены!');
        $('dossierForm').hidden = true;
      } catch (err) {
        showAuthMsg(err.message || 'Не удалось сохранить досье.', true);
      }
    };

    $('copyCardBtn').onclick = async () => {
      const snap = NP.getSnapshot();
      const lines = [
        `=== ДОСЬЕ NOVA RP PEDIA ===`,
        `${snap.state.avatar} ${snap.displayName} [Static #${snap.state.staticId}]`,
        `Титул: ★ ${snap.state.equippedTitle}`,
        `Организация: ${snap.faction.label}`,
        `Ранг: Уровень ${snap.rank.current.level} — ${snap.rank.current.name} (${snap.rank.xp} XP)`,
        `Достижения: ${snap.unlockedCount} из ${snap.totalAchievements}`,
        snap.state.motto ? `Девиз: «${snap.state.motto}»` : null
      ].filter(Boolean).join('\n');

      try {
        await navigator.clipboard.writeText(lines);
        const btn = $('copyCardBtn');
        const old = btn.textContent;
        btn.textContent = '✓ Визитка скопирована!';
        setTimeout(() => { btn.textContent = old; }, 2000);
      } catch {
        prompt('Скопируйте вашу визитку:', lines);
      }
    };

    $('randomTryScenarioBtn').onclick = () => {
      const current = $('tryActionInput').value;
      const pool = TRY_SCENARIOS.filter(s => s !== current);
      $('tryActionInput').value = pool[Math.floor(Math.random() * pool.length)] || TRY_SCENARIOS[0];
    };

    $('tryForm').onsubmit = e => {
      e.preventDefault();
      if (!NP.getSnapshot().isAuthenticated) {
        $('account').scrollIntoView({ behavior: 'smooth', block: 'start' });
        $('pAuthLogin').focus();
        showAuthMsg('Войдите в аккаунт или создайте новый, чтобы использовать /try и получать достижения.', true);
        return;
      }
      NP.rollTry($('tryActionInput').value);
    };

    // Directory search, sort & SQL copy
    $('dirSearchInput').oninput = () => renderDirectoryList();
    $('dirSortSelect').onchange = () => renderDirectoryList();
    $('refreshDirBtn').onclick = () => loadAccountsDirectory();

    $('copySqlSetupBtn').onclick = async () => {
      const status = $('copySqlStatus');
      try {
        const res = await fetch('profile-setup.sql');
        const sql = await res.text();
        await navigator.clipboard.writeText(sql);
        status.textContent = '✓ SQL скопирован! Вставьте его в Supabase → SQL Editor и нажмите Run.';
        status.className = 'status-note ok';
      } catch {
        status.textContent = 'Откройте файл profile-setup.sql в репозитории и скопируйте его содержимое.';
        status.className = 'status-note err';
      }
    };

    // Achievements filters & secret hints
    $('achFilterBar').onclick = e => {
      const btn = e.target.closest('[data-filter]');
      if (!btn) return;
      achFilter = btn.dataset.filter;
      renderDossierAndStats(NP.getSnapshot());
    };

    $('secretHintsToggle').onchange = e => {
      showSecretHints = e.target.checked;
      renderAchievements(NP.getSnapshot());
    };

    // Auth tabs & forms
    $('profileAuthTabs').onclick = e => {
      const b = e.target.closest('[data-mode]');
      if (!b) return;
      authMode = b.dataset.mode;
      showAuthMsg('');
      updateAuthFormMode();
    };

    $('pGenSecretBtn').onclick = () => {
      $('pAuthSecret').value = generateSecret();
      showAuthMsg('Секретный ключ создан — обязательно запишите его в надёжном месте!');
    };

    $('profileAuthForm').onsubmit = async e => {
      e.preventDefault();
      if (!db) return;
      const btn = $('pAuthSubmitBtn');
      btn.disabled = true;
      showAuthMsg('');
      let created = false;
      try {
        const login = $('pAuthLogin').value.trim();
        const password = $('pAuthPassword').value;
        const secret = $('pAuthSecret').value.normalize('NFKC').trim();

        if (authMode === 'reset') {
          const res = await recoveryCall({ action: 'reset', login, password, secret });
          authMode = 'login';
          updateAuthFormMode();
          showAuthMsg(res.message || 'Пароль обновлён. Теперь войдите с новым паролем.');
          $('pAuthSecret').value = '';
          return;
        }

        const email = await nicknameEmail(login);
        if (authMode === 'register') {
          if (login.includes('@')) throw new Error('Укажите игровой никнейм латиницей, а не почту.');
          if (secret.length < 16) throw new Error('Секретный ключ должен быть не короче 16 символов.');
          const cfg = window.NOVA_SUPABASE;
          const settings = await fetch(cfg.url + '/auth/v1/settings', { headers: { apikey: cfg.publishableKey } });
          if (settings.ok) {
            const conf = await settings.json();
            if (conf.mailer_autoconfirm !== true) {
              throw new Error('В Supabase нужно отключить Confirm email для регистрации по никнейму.');
            }
          }
          const { data, error } = await db.auth.signUp({
            email,
            password,
            options: { data: { display_name: login } }
          });
          if (error) throw error;
          if (!data.session) throw new Error('Не удалось открыть сессию аккаунта.');
          created = true;
          try { sessionStorage.removeItem('novaPediaCloudColsMissingV1'); } catch {}
          await refreshSupabaseProfile();
          const rec = await recoveryCall({ action: 'enroll', secret, password });
          showAuthMsg('✓ Аккаунт создан! Вы добавлены в общий реестр жителей и получили первое достижение. ' + (rec.message || ''));
        } else {
          const { error } = await db.auth.signInWithPassword({ email, password });
          if (error) throw error;
          try { sessionStorage.removeItem('novaPediaCloudColsMissingV1'); } catch {}
          await refreshSupabaseProfile();
          showAuthMsg('✓ Вы вошли в аккаунт! Получение достижений активировано.');
        }
      } catch (err) {
        if (created) {
          showAuthMsg('Аккаунт создан и подключён, но секрет восстановления не сохранился: ' + (err.message || ''), true);
          await refreshSupabaseProfile();
        } else {
          showAuthMsg(err.message || 'Ошибка авторизации.', true);
        }
      } finally {
        $('pAuthPassword').value = '';
        $('pAuthSecret').value = '';
        btn.disabled = false;
      }
    };

    $('uLogoutBtn').onclick = async () => {
      if (!db) return;
      await db.auth.signOut();
      sbUser = null;
      sbModerator = false;
      $('dossierForm').hidden = true;
      showAuthMsg('Вы вышли из аккаунта. Чтобы снова открывать достижения, войдите в свой профиль.');
      await refreshSupabaseProfile();
    };
  }

  function initSupabase() {
    const cfg = window.NOVA_SUPABASE;
    if (!window.supabase || !cfg) {
      showAuthMsg('Не удалось загрузить клиент Supabase.', true);
      return;
    }
    db = window.supabase.createClient(cfg.url, cfg.publishableKey);
    refreshSupabaseProfile();
  }

  NP.onChange(snap => renderDossierAndStats(snap));
  bindEvents();
  updateAuthFormMode();
  renderDossierAndStats(NP.getSnapshot());
  initSupabase();
})();
