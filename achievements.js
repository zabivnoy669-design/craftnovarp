'use strict';
(() => {
  if (window.NovaProfile) return;

  const ACCOUNT_KEY_PREFIX = 'novaPediaAccountV2:';
  const SESSION_NAV_KEY = 'novaPediaLastPageV2';
  const SESSION_BRAND_TAPS = 'novaPediaBrandTapsV2';
  const SESSION_GUEST_PROMPT = 'novaPediaGuestPromptShownV2';
  const SESSION_CLOUD_UNAVAILABLE = 'novaPediaCloudColsMissingV1';

  const origSetItem = Storage.prototype.setItem;
  const origRemoveItem = Storage.prototype.removeItem;
  let internalWrite = false;

  const AVATARS = ['◈', '★', '⚑', '✚', '⚔', '⌖', '♛', '⚡', '🛡', '✪'];

  const FACTIONS = [
    { id: 'civilian', label: 'Свободный житель', short: 'Гражданский' },
    { id: 'lspd', label: 'LSPD · Полиция Лос-Сантоса', short: 'LSPD' },
    { id: 'sahp', label: 'SAHP · Дорожный патруль', short: 'SAHP' },
    { id: 'fib', label: 'FIB · Федеральное бюро', short: 'FIB' },
    { id: 'sang', label: 'SANG · Национальная гвардия', short: 'SANG' },
    { id: 'gov', label: 'GOV · Правительство штата', short: 'GOV' },
    { id: 'ems', label: 'EMS · Медицинская служба', short: 'EMS' },
    { id: 'weazel', label: 'Weazel News · Редакция', short: 'WN' },
    { id: 'bounty', label: 'Частный подрядчик', short: 'ЧВК' }
  ];

  const RANKS = [
    { level: 1, minXp: 0, name: 'Приезжий со спавна' },
    { level: 2, minXp: 150, name: 'Освоившийся житель' },
    { level: 3, minXp: 350, name: 'Знаток районов' },
    { level: 4, minXp: 650, name: 'Снабженец смены' },
    { level: 5, minXp: 1000, name: 'Оперативник штата' },
    { level: 6, minXp: 1450, name: 'Ветеран Nova RP' },
    { level: 7, minXp: 2000, name: 'Хранитель Pedia' },
    { level: 8, minXp: 2500, name: 'Легенда Лос-Сантоса' }
  ];

  const GOV_RECIPES = {
    pistol: [10, 1], ap_pistol: [15, 1], stun_pistol: [5, 1], revolver: [30, 1],
    pdw: [25, 1], thompson: [25, 1], aug: [30, 1], bullpup_mk2: [25, 1],
    special_mk2: [50, 1], carbine_mk2: [40, 1], special: [25, 1], heavy: [50, 1],
    sniper: [1000, 1], shotgun: [20, 1], heavy_shotgun: [40, 1], lmg_mk2: [1500, 1],
    ammo_revolver: [1, 1], ammo_pistol: [1, 1], ammo_stun: [2, 1], ammo_shotgun: [1, 2],
    ammo_smg: [1, 3], ammo_rifle: [1, 3], ammo_sniper: [5, 1], ammo_lmg: [1, 2],
    armor_sahp: [30, 1], armor: [15, 1], balaclava: [5, 1], baton: [5, 1],
    magazine: [1, 1], grip: [1, 1], silencer: [1, 2]
  };

  const GOV_LETHAL_WEAPONS = [
    'pistol', 'ap_pistol', 'revolver', 'pdw', 'thompson',
    'aug', 'bullpup_mk2', 'special_mk2', 'carbine_mk2', 'special',
    'heavy', 'sniper', 'shotgun', 'heavy_shotgun', 'lmg_mk2'
  ];

  const EMS_RECIPES = {
    ems_adrenaline: [15, 1], ems_medium_kit: [10, 1], ems_large_kit: [20, 1],
    ems_self_revive: [500, 1], ems_insurance: [1, 10], ems_first_aid: [10, 1],
    ems_amnesia: [2, 1], ems_poisoning: [2, 1], ems_cold: [2, 1],
    ems_armor: [30, 1], ems_mask: [5, 1]
  };

  const CORE_TOUR_PAGES = ['home', 'gov', 'ems', 'weapons', 'maps', 'forum'];

  const FORBIDDEN_TERMS = [
    'читы', 'чит', 'cheat', 'aimbot', 'взлом', 'админка',
    'godmode', 'деньги', 'багоюз', 'дюп', 'нло', 'ufo', 'секрет'
  ];

  const ACHIEVEMENTS = [
    {
      id: 'citizen_passport',
      title: 'Гражданин со статиком',
      description: 'Создать аккаунт или войти в единый реестр жителей Nova RP Pedia и получить личный Static ID.',
      rarity: 'common',
      rarityLabel: 'Обычное',
      xp: 75,
      rewardTitle: 'Гражданин штата',
      icon: '🪪',
      actionUrl: 'profile.html#account',
      actionText: 'Войти / создать →',
      check: ctx => Boolean(ctx.authUser)
    },
    {
      id: 'pacifist_taser',
      title: 'Пацифист с шокером',
      description: 'Собрать рабочий план крафта госструктур со спецсредствами (шокер или дубинка ≥ 1 шт.) без единого огнестрельного ствола.',
      rarity: 'uncommon',
      rarityLabel: 'Необычное',
      xp: 125,
      rewardTitle: 'Миротворец LSPD',
      icon: '⚡',
      actionUrl: 'index.html',
      actionText: 'К госструктурам →',
      check: ctx => {
        const g = ctx.gov;
        const nonLethal = (g.produced.stun_pistol || 0) + (g.produced.baton || 0);
        if (nonLethal < 1) return false;
        return !GOV_LETHAL_WEAPONS.some(id => (g.produced[id] || 0) > 0 || (g.activeCart[id] || 0) > 0);
      }
    },
    {
      id: 'ems_bureaucrat',
      title: 'Бюрократ 80-го уровня',
      description: 'Запланировать в калькуляторе EMS выдачу сразу 100 или больше медицинских страховок за одну смену.',
      rarity: 'rare',
      rarityLabel: 'Редкое',
      xp: 150,
      rewardTitle: 'Главный страховщик',
      icon: '📋',
      actionUrl: 'ems.html',
      actionText: 'В калькулятор EMS →',
      progress: ctx => ({ current: Math.min(100, ctx.ems.produced.ems_insurance || 0), target: 100, unit: 'страховок' }),
      check: ctx => (ctx.ems.produced.ems_insurance || 0) >= 100
    },
    {
      id: 'dr_house_kit',
      title: 'Таблетка от всего на свете',
      description: 'Собрать в плане EMS полное комбо дежурного врача: самореанимацию, адреналин и все три вида таблеток одновременно.',
      rarity: 'common',
      rarityLabel: 'Обычное',
      xp: 75,
      rewardTitle: 'Дежурный реаниматолог',
      icon: '💊',
      actionUrl: 'ems.html',
      actionText: 'Собрать аптечку →',
      progress: ctx => {
        const req = ['ems_self_revive', 'ems_adrenaline', 'ems_amnesia', 'ems_poisoning', 'ems_cold'];
        const have = req.filter(k => (ctx.ems.produced[k] || 0) >= 1).length;
        return { current: have, target: 5, unit: 'из 5 препаратов' };
      },
      check: ctx => ['ems_self_revive', 'ems_adrenaline', 'ems_amnesia', 'ems_poisoning', 'ems_cold']
        .every(k => (ctx.ems.produced[k] || 0) >= 1)
    },
    {
      id: 'one_man_army',
      title: 'Один против армии',
      description: 'Включить в один план крафта госструктур сразу Снайперскую винтовку (1 000 мат.) и Лёгкий пулемёт MK II (1 500 мат.).',
      rarity: 'epic',
      rarityLabel: 'Эпическое',
      xp: 250,
      rewardTitle: 'Человек-армия',
      icon: '🎯',
      actionUrl: 'index.html',
      actionText: 'Открыть арсенал →',
      check: ctx => (ctx.gov.produced.sniper || 0) >= 1 && (ctx.gov.produced.lmg_mk2 || 0) >= 1
    },
    {
      id: 'deficit_budget',
      title: 'Дефицитный бюджет',
      description: 'Насчитать в режиме количества крафт дороже лимита склада (свыше 25 000 материалов), загнав баланс в красный минус.',
      rarity: 'uncommon',
      rarityLabel: 'Необычное',
      xp: 100,
      rewardTitle: 'Гроза казны',
      icon: '📉',
      actionUrl: 'index.html',
      actionText: 'Проверить лимит →',
      check: ctx => ctx.gov.totalSpent > 25000 || ctx.ems.totalSpent > 25000
    },
    {
      id: 'backup_accountant',
      title: 'Бухгалтер чёрного дня',
      description: 'Скопировать расчёт или экспортировать непустой план крафта в JSON-файл «на случай внезапного рестарта».',
      rarity: 'common',
      rarityLabel: 'Обычное',
      xp: 75,
      rewardTitle: 'Главбух склада',
      icon: '🗄',
      actionUrl: 'index.html',
      actionText: 'К плану крафта →',
      check: ctx => Boolean(ctx.state.flags.exportedOrCopiedPlan)
    },
    {
      id: 'pentagon_tactician',
      title: 'Тактик из Пентагона',
      description: 'Начертить на карте штата план минимум из 7 фигур со стрелкой и кружком зоны (либо разметить сразу обе карты).',
      rarity: 'epic',
      rarityLabel: 'Эпическое',
      xp: 225,
      rewardTitle: 'Генерал генштаба',
      icon: '🗺',
      actionUrl: 'maps.html',
      actionText: 'Открыть штабную карту →',
      progress: ctx => ({ current: Math.min(7, ctx.maps.maxSingleCount), target: 7, unit: 'пометок' }),
      check: ctx => ctx.maps.hasTacticalCombo || ctx.maps.bothMapsMarked
    },
    {
      id: 'weapon_sommelier',
      title: 'Оружейный сомелье',
      description: 'Изучить минимум 4 разные категории вооружения через фильтр в каталоге урона оружия.',
      rarity: 'uncommon',
      rarityLabel: 'Необычное',
      xp: 100,
      rewardTitle: 'Оружейный барон',
      icon: '🔫',
      actionUrl: 'weapons.html',
      actionText: 'В каталог оружия →',
      progress: ctx => ({ current: Math.min(4, ctx.state.weaponCategories.length), target: 4, unit: 'категории' }),
      check: ctx => ctx.state.weaponCategories.length >= 4
    },
    {
      id: 'state_tourist',
      title: 'Турист всего штата',
      description: 'Будучи авторизованным, лично заглянуть во все 6 ключевых уголков Pedia: Главную, Госструктуры, EMS, Оружие, Карты и Форум.',
      rarity: 'rare',
      rarityLabel: 'Редкое',
      xp: 175,
      rewardTitle: 'Следопыт штата',
      icon: '🧭',
      actionUrl: 'home.html',
      actionText: 'К разделам сайта →',
      progress: ctx => {
        const visited = CORE_TOUR_PAGES.filter(p => ctx.state.visitedPages.includes(p)).length;
        return { current: visited, target: CORE_TOUR_PAGES.length, unit: 'из 6 разделов' };
      },
      check: ctx => CORE_TOUR_PAGES.every(p => ctx.state.visitedPages.includes(p))
    },
    {
      id: 'tab_speedrunner',
      title: 'Спидраннер по вкладкам',
      description: 'Совершить 5 переходов между разными страницами сайта быстрее чем за 20 секунд.',
      rarity: 'uncommon',
      rarityLabel: 'Необычное',
      xp: 125,
      rewardTitle: 'Спидраннер',
      icon: '⚡',
      actionUrl: 'catalogs.html',
      actionText: 'Ускориться →',
      check: ctx => Boolean(ctx.state.flags.speedrunnerUnlocked)
    },
    {
      id: 'night_watch',
      title: 'Ночной дозор Лос-Сантоса',
      description: 'Зайти под своим аккаунтом в самую глухую ночную смену — с 00:00 до 05:59 по местному времени.',
      rarity: 'rare',
      rarityLabel: 'Редкое',
      xp: 150,
      rewardTitle: 'Ночной дозорный',
      icon: '🌙',
      check: () => {
        const h = new Date().getHours();
        return h >= 0 && h < 6;
      }
    },
    {
      id: 'street_voice',
      title: 'Голос улиц',
      description: 'Предложить собственную тему или оставить комментарий в обсуждениях на форуме Nova RP Pedia.',
      rarity: 'rare',
      rarityLabel: 'Редкое',
      xp: 175,
      rewardTitle: 'Голос Лос-Сантоса',
      icon: '📣',
      actionUrl: 'forum.html',
      actionText: 'На форум →',
      check: ctx => Boolean(ctx.state.flags.forumContributed)
    },
    {
      id: 'secret_konami',
      title: 'Взломщик Федерального реестра',
      description: 'Вы ввели легендарную комбинацию клавиш (или простучали шифр по логотипу NOVA RP) и открыли скрытый допуск FIB.',
      riddle: 'Старый код из восьми стрелок (↑↑↓↓←→←→) или 5 быстрых кликов по вывеске NOVA RP откроют засекреченный архив…',
      secret: true,
      rarity: 'secret',
      rarityLabel: 'Секретное',
      xp: 300,
      rewardTitle: 'Призрак FIB',
      icon: '🕵️',
      check: ctx => Boolean(ctx.state.flags.konamiUnlocked)
    },
    {
      id: 'secret_forbidden_search',
      title: 'Товарищ админ, я просто спросить',
      description: 'Попытаться найти через строку поиска «читы», «админку», «взлом» или «НЛО». Ваш статик уже записан карандашом.',
      riddle: 'Некоторые игроки ищут в поиске то, за что на сервере сразу прилетает бан или визит людей в чёрном…',
      secret: true,
      rarity: 'secret',
      rarityLabel: 'Секретное',
      xp: 250,
      rewardTitle: 'На карандаше',
      icon: '🛸',
      actionUrl: 'home.html',
      actionText: 'К поиску →',
      check: ctx => Boolean(ctx.state.flags.forbiddenSearched)
    },
    {
      id: 'secret_try_lucky',
      title: 'Любимчик Фортуны (/try ×3)',
      description: 'Выбить три раза подряд «Удачно» в ролевом испытании команды /try в своём профиле. Шанс — всего 12,5%!',
      riddle: 'Три удачные попытки подряд в команде /try в профиле докажут, что рандом сегодня на твоей стороне…',
      secret: true,
      rarity: 'secret',
      rarityLabel: 'Секретное',
      xp: 300,
      rewardTitle: 'Король /try',
      icon: '🎲',
      actionUrl: 'profile.html#tryWidget',
      actionText: 'Бросить /try →',
      progress: ctx => ({ current: Math.min(3, ctx.state.tryStats.bestStreak || 0), target: 3, unit: 'удач подряд' }),
      check: ctx => (ctx.state.tryStats.bestStreak || 0) >= 3
    }
  ];

  const listeners = new Set();

  function staticIdFromUuid(uuid) {
    if (!uuid || typeof uuid !== 'string') return 10000;
    const hex = uuid.replace(/[^0-9a-f]/gi, '').slice(0, 8);
    const num = parseInt(hex || '0', 16);
    return 10000 + (num % 90000);
  }

  function defaultAccountState(userId = null) {
    return {
      version: 2,
      userId,
      staticId: staticIdFromUuid(userId),
      customName: '',
      avatar: '◈',
      faction: 'civilian',
      motto: '',
      equippedTitle: 'Гражданин штата',
      syncedUser: null,
      unlocked: {},
      visitedPages: [],
      weaponCategories: [],
      navTimestamps: [],
      tryStats: {
        total: 0,
        successes: 0,
        currentStreak: 0,
        bestStreak: 0,
        lastRoll: null
      },
      flags: {
        exportedOrCopiedPlan: false,
        konamiUnlocked: false,
        forbiddenSearched: false,
        dossierSaved: false,
        forumContributed: false,
        speedrunnerUnlocked: false
      }
    };
  }

  function readCachedSupabaseSession() {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && /^sb-.*-auth-token$/.test(k)) {
          const parsed = JSON.parse(localStorage.getItem(k) || 'null');
          const u = parsed?.user;
          if (u && typeof u.id === 'string') {
            if (parsed.expires_at && parsed.expires_at * 1000 < Date.now() - 60000) return null;
            const metaName = typeof u.user_metadata?.display_name === 'string' ? u.user_metadata.display_name.trim() : '';
            return {
              id: u.id,
              email: u.email || '',
              accessToken: typeof parsed.access_token === 'string' ? parsed.access_token : '',
              displayName: metaName || 'Участник'
            };
          }
        }
      }
    } catch {
      // ignore storage read issues
    }
    return null;
  }

  let activeSession = readCachedSupabaseSession();

  function storageKeyForUser(userId) {
    return userId ? `${ACCOUNT_KEY_PREFIX}${userId}` : null;
  }

  function loadAccountState(userId) {
    const base = defaultAccountState(userId);
    if (!userId) return base;
    try {
      const raw = JSON.parse(localStorage.getItem(storageKeyForUser(userId)) || 'null');
      if (!raw || typeof raw !== 'object') return base;
      return {
        ...base,
        userId,
        staticId: base.staticId,
        customName: typeof raw.customName === 'string' ? raw.customName.slice(0, 40) : '',
        avatar: AVATARS.includes(raw.avatar) ? raw.avatar : '◈',
        faction: FACTIONS.some(f => f.id === raw.faction) ? raw.faction : 'civilian',
        motto: typeof raw.motto === 'string' ? raw.motto.slice(0, 140) : '',
        equippedTitle: typeof raw.equippedTitle === 'string' && raw.equippedTitle ? raw.equippedTitle.slice(0, 50) : 'Гражданин штата',
        syncedUser: raw.syncedUser && typeof raw.syncedUser === 'object' ? raw.syncedUser : null,
        unlocked: raw.unlocked && typeof raw.unlocked === 'object' && !Array.isArray(raw.unlocked) ? { ...raw.unlocked } : {},
        visitedPages: Array.isArray(raw.visitedPages) ? [...new Set(raw.visitedPages.filter(x => typeof x === 'string'))].slice(0, 20) : [],
        weaponCategories: Array.isArray(raw.weaponCategories) ? [...new Set(raw.weaponCategories.filter(x => typeof x === 'string'))].slice(0, 20) : [],
        navTimestamps: Array.isArray(raw.navTimestamps) ? raw.navTimestamps.filter(n => typeof n === 'number').slice(-6) : [],
        tryStats: {
          ...base.tryStats,
          ...(raw.tryStats && typeof raw.tryStats === 'object' ? raw.tryStats : {})
        },
        flags: {
          ...base.flags,
          ...(raw.flags && typeof raw.flags === 'object' ? raw.flags : {})
        }
      };
    } catch {
      return base;
    }
  }

  let state = loadAccountState(activeSession?.id || null);

  function refreshActiveUserFromStorage() {
    const nextSession = readCachedSupabaseSession();
    const prevId = activeSession?.id || null;
    const nextId = nextSession?.id || null;
    activeSession = nextSession;
    if (prevId !== nextId) {
      state = loadAccountState(nextId);
      if (nextId) recordPageVisit();
    } else if (nextId) {
      state = loadAccountState(nextId);
    } else {
      state = defaultAccountState(null);
    }
  }

  function saveState() {
    if (!activeSession?.id) return;
    const key = storageKeyForUser(activeSession.id);
    if (!key) return;
    try {
      internalWrite = true;
      origSetItem.call(localStorage, key, JSON.stringify(state));
    } catch {
      // ignore quota errors
    } finally {
      internalWrite = false;
    }
  }

  let cloudPushTimer = null;
  function scheduleCloudPush() {
    if (!activeSession?.id || !activeSession?.accessToken) return;
    try {
      if (sessionStorage.getItem(SESSION_CLOUD_UNAVAILABLE) === '1') return;
    } catch {
      // ignore
    }
    const cfg = window.NOVA_SUPABASE;
    if (!cfg?.url || !cfg?.publishableKey || typeof fetch !== 'function') return;

    clearTimeout(cloudPushTimer);
    cloudPushTimer = setTimeout(async () => {
      if (!activeSession?.id || !activeSession?.accessToken) return;
      const xp = getTotalXp();
      const count = ACHIEVEMENTS.filter(a => Boolean(state.unlocked[a.id])).length;
      const headers = {
        apikey: cfg.publishableKey,
        Authorization: `Bearer ${activeSession.accessToken}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      };
      try {
        const profPatch = {
          avatar: state.avatar || '◈',
          faction: state.faction || 'civilian',
          equipped_title: state.equippedTitle || 'Гражданин штата',
          motto: state.motto || '',
          xp,
          achievements_count: count,
          unlocked_achievements: state.unlocked,
          updated_at: new Date().toISOString()
        };
        const r1 = await fetch(`${cfg.url}/rest/v1/pedia_profiles?id=eq.${encodeURIComponent(activeSession.id)}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(profPatch)
        });
        if (!r1.ok) {
          if (r1.status === 400 || r1.status === 404) {
            try { sessionStorage.setItem(SESSION_CLOUD_UNAVAILABLE, '1'); } catch {}
          }
          return;
        }
        await fetch(`${cfg.url}/rest/v1/pedia_user_progress?on_conflict=user_id`, {
          method: 'POST',
          headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify({
            user_id: activeSession.id,
            state: {
              visitedPages: state.visitedPages,
              weaponCategories: state.weaponCategories,
              tryStats: state.tryStats,
              flags: state.flags
            },
            updated_at: new Date().toISOString()
          })
        });
      } catch {
        // offline or schema not applied yet
      }
    }, 350);
  }

  function parseCraftPlan(storageKey, fallbackKey, recipes) {
    const out = { lines: 0, totalQty: 0, totalSpent: 0, stock: 0, mode: 'materials', produced: {}, activeCart: {} };
    try {
      const raw = JSON.parse(
        localStorage.getItem(storageKey) ||
        (fallbackKey ? localStorage.getItem(fallbackKey) : 'null') ||
        'null'
      );
      if (!raw || typeof raw !== 'object') return out;
      out.stock = Number(raw.stock) || 0;
      out.mode = raw.mode === 'quantity' ? 'quantity' : 'materials';
      const active = raw.plans?.[out.mode] || {};
      for (const [id, val] of Object.entries(active)) {
        const rec = recipes[id];
        const n = Math.max(0, Math.floor(Number(val) || 0));
        if (!rec) continue;
        out.activeCart[id] = n;
        const [price, per] = rec;
        if (out.mode === 'quantity') {
          const batches = Math.ceil(n / per);
          const prod = batches * per;
          const spent = batches * price;
          if (n > 0) out.lines++;
          out.produced[id] = prod;
          out.totalQty += n;
          out.totalSpent += spent;
        } else {
          const batches = Math.floor(n / price);
          const prod = batches * per;
          const spent = batches * price;
          if (n > 0) out.lines++;
          out.produced[id] = prod;
          out.totalQty += prod;
          out.totalSpent += spent;
        }
      }
    } catch {
      // ignore malformed JSON
    }
    return out;
  }

  function parseMapsSummary() {
    const keys = [
      'nova-pedia-map-fort-zancudo-v2',
      'nova-pedia-map-federal-prison-v2'
    ];
    let totalStrokes = 0;
    let maxSingleCount = 0;
    let hasTacticalCombo = false;
    let mapsWithMarks = 0;
    for (const k of keys) {
      try {
        const arr = JSON.parse(localStorage.getItem(k) || '[]');
        if (!Array.isArray(arr)) continue;
        const visible = arr.filter(s => s && !s.erase);
        totalStrokes += visible.length;
        if (visible.length > maxSingleCount) maxSingleCount = visible.length;
        if (visible.length >= 3) mapsWithMarks++;
        const hasArrow = visible.some(s => s.kind === 'arrow');
        const hasCircle = visible.some(s => s.kind === 'circle');
        if (visible.length >= 7 && hasArrow && hasCircle) hasTacticalCombo = true;
      } catch {
        // ignore
      }
    }
    return {
      totalStrokes,
      maxSingleCount,
      hasTacticalCombo,
      bothMapsMarked: mapsWithMarks >= 2
    };
  }

  function detectCurrentPage() {
    const p = (location.pathname.split('/').pop() || 'home.html').toLowerCase();
    if (p === '' || p === 'home.html') return 'home';
    if (p === 'index.html') return 'gov';
    if (p === 'ems.html') return 'ems';
    if (p === 'weapons.html') return 'weapons';
    if (p === 'maps.html') return 'maps';
    if (p === 'forum.html') return 'forum';
    if (p === 'catalogs.html') return 'catalogs';
    if (p === 'article.html') return 'article';
    if (p === 'pedia-editor.html') return 'editor';
    if (p === 'profile.html') return 'profile';
    return 'other';
  }

  function buildContext() {
    const authUser = activeSession
      ? {
          id: activeSession.id,
          email: activeSession.email,
          displayName: state.syncedUser?.id === activeSession.id && state.syncedUser?.displayName
            ? state.syncedUser.displayName
            : activeSession.displayName
        }
      : null;

    return {
      state,
      authUser,
      gov: parseCraftPlan('novaCraftGovModes', 'novaCraftModes', GOV_RECIPES),
      ems: parseCraftPlan('novaCraftEmsModes', null, EMS_RECIPES),
      maps: parseMapsSummary()
    };
  }

  function getTotalXp() {
    if (!activeSession?.id) return 0;
    let xp = 0;
    for (const a of ACHIEVEMENTS) {
      if (state.unlocked[a.id]) xp += a.xp;
    }
    return xp;
  }

  function getRankInfo(xp) {
    let current = RANKS[0];
    let next = null;
    for (let i = 0; i < RANKS.length; i++) {
      if (xp >= RANKS[i].minXp) {
        current = RANKS[i];
        next = RANKS[i + 1] || null;
      }
    }
    const maxTotalXp = ACHIEVEMENTS.reduce((s, a) => s + a.xp, 0);
    const floor = current.minXp;
    const ceil = next ? next.minXp : maxTotalXp;
    const pct = ceil > floor ? Math.min(100, Math.round(((xp - floor) / (ceil - floor)) * 100)) : 100;
    return { current, next, xp, maxTotalXp, pct };
  }

  function getAvailableTitles() {
    if (!activeSession?.id) return ['Гость штата'];
    const titles = ['Гражданин штата'];
    for (const a of ACHIEVEMENTS) {
      if (state.unlocked[a.id] && a.rewardTitle && !titles.includes(a.rewardTitle)) {
        titles.push(a.rewardTitle);
      }
    }
    return titles;
  }

  function getDisplayName() {
    if (!activeSession?.id) return 'Гость (без аккаунта)';
    if (state.syncedUser?.displayName) return state.syncedUser.displayName;
    if (state.customName && state.customName.trim()) return state.customName.trim();
    return activeSession.displayName || ('Житель #' + state.staticId);
  }

  function ensureToastStack() {
    let stack = document.getElementById('novaAchToastStack');
    if (!stack && document.body) {
      stack = document.createElement('div');
      stack.id = 'novaAchToastStack';
      stack.className = 'nova-ach-toast-stack';
      stack.setAttribute('aria-live', 'polite');
      document.body.appendChild(stack);
    }
    return stack;
  }

  function showUnlockToast(ach) {
    const stack = ensureToastStack();
    if (!stack) return;
    const card = document.createElement('a');
    card.href = 'profile.html#achievements';
    card.className = 'nova-ach-toast';

    const icon = document.createElement('div');
    icon.className = 'nova-ach-toast-icon';
    icon.textContent = ach.icon;

    const body = document.createElement('div');
    body.className = 'nova-ach-toast-body';

    const kicker = document.createElement('div');
    kicker.className = 'nova-ach-toast-kicker';
    kicker.textContent = `Достижение открыто · +${ach.xp} XP`;

    const title = document.createElement('div');
    title.className = 'nova-ach-toast-title';
    title.textContent = ach.title;

    const sub = document.createElement('div');
    sub.className = 'nova-ach-toast-sub';
    sub.textContent = `Новый титул: «${ach.rewardTitle}»`;

    body.append(kicker, title, sub);
    card.append(icon, body);
    stack.appendChild(card);

    setTimeout(() => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(8px)';
      card.style.transition = 'opacity .25s ease, transform .25s ease';
      setTimeout(() => card.remove(), 280);
    }, 5200);
  }

  function showAuthRequiredToast(reasonText) {
    try {
      if (sessionStorage.getItem(SESSION_GUEST_PROMPT) === reasonText) return;
      sessionStorage.setItem(SESSION_GUEST_PROMPT, reasonText);
    } catch {}
    const stack = ensureToastStack();
    if (!stack) return;
    const card = document.createElement('a');
    card.href = 'profile.html#account';
    card.className = 'nova-ach-toast';

    const icon = document.createElement('div');
    icon.className = 'nova-ach-toast-icon';
    icon.textContent = '🔒';

    const body = document.createElement('div');
    body.className = 'nova-ach-toast-body';

    const kicker = document.createElement('div');
    kicker.className = 'nova-ach-toast-kicker';
    kicker.textContent = 'Нужен вход в аккаунт';

    const title = document.createElement('div');
    title.className = 'nova-ach-toast-title';
    title.textContent = 'Достижения доступны только с аккаунтом';

    const sub = document.createElement('div');
    sub.className = 'nova-ach-toast-sub';
    sub.textContent = 'Нажмите, чтобы войти или зарегистрироваться →';

    body.append(kicker, title, sub);
    card.append(icon, body);
    stack.appendChild(card);

    setTimeout(() => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(8px)';
      card.style.transition = 'opacity .25s ease, transform .25s ease';
      setTimeout(() => card.remove(), 280);
    }, 5000);
  }

  function updateHeaderBadge() {
    const btn = document.getElementById('novaProfileNavBtn');
    if (!btn) return;

    const page = detectCurrentPage();
    btn.classList.toggle('is-current', page === 'profile');
    if (page === 'profile') btn.setAttribute('aria-current', 'page');
    else btn.removeAttribute('aria-current');

    const av = btn.querySelector('.npb-avatar');
    const lbl = btn.querySelector('.npb-label');
    const bdg = btn.querySelector('.npb-badge');

    if (!activeSession?.id) {
      if (av) av.textContent = '◈';
      if (lbl) lbl.textContent = 'Профиль';
      if (bdg) {
        bdg.textContent = '🔒 Вход';
        bdg.title = 'Войдите или создайте аккаунт, чтобы получать достижения';
      }
      return;
    }

    const unlockedCount = ACHIEVEMENTS.filter(a => Boolean(state.unlocked[a.id])).length;
    if (av) av.textContent = state.avatar || '◈';
    if (lbl) {
      const named = state.syncedUser?.displayName || state.customName.trim() || activeSession.displayName || 'Профиль';
      lbl.textContent = named;
    }
    if (bdg) {
      bdg.textContent = `★ ${unlockedCount}/${ACHIEVEMENTS.length}`;
      bdg.title = `Открыто достижений: ${unlockedCount} из ${ACHIEVEMENTS.length}`;
    }
  }

  function notifySubscribers() {
    updateHeaderBadge();
    const snap = getSnapshot();
    for (const fn of listeners) {
      try { fn(snap); } catch (e) { console.error(e); }
    }
  }

  function evaluateAll({ silent = false } = {}) {
    // STRICT RULE: Achievements can ONLY be earned when logged into a Supabase account
    if (!activeSession?.id) {
      notifySubscribers();
      return [];
    }

    const ctx = buildContext();
    const newlyUnlocked = [];
    const nowIso = new Date().toISOString();

    for (const ach of ACHIEVEMENTS) {
      if (state.unlocked[ach.id]) continue;
      let passed = false;
      try {
        passed = Boolean(ach.check(ctx));
      } catch {
        passed = false;
      }
      if (passed) {
        state.unlocked[ach.id] = nowIso;
        newlyUnlocked.push(ach);
      }
    }

    if (newlyUnlocked.length) {
      saveState();
      scheduleCloudPush();
      if (!silent) {
        newlyUnlocked.forEach((ach, idx) => {
          setTimeout(() => showUnlockToast(ach), idx * 450);
        });
      }
    }
    notifySubscribers();
    return newlyUnlocked;
  }

  function getSnapshot() {
    const ctx = buildContext();
    const isAuthenticated = Boolean(activeSession?.id);
    const xp = getTotalXp();
    const rank = getRankInfo(xp);
    const unlockedCount = isAuthenticated
      ? ACHIEVEMENTS.filter(a => Boolean(state.unlocked[a.id])).length
      : 0;
    const factionObj = FACTIONS.find(f => f.id === state.faction) || FACTIONS[0];
    return {
      isAuthenticated,
      state: JSON.parse(JSON.stringify(state)),
      displayName: getDisplayName(),
      faction: factionObj,
      authUser: ctx.authUser,
      gov: ctx.gov,
      ems: ctx.ems,
      maps: ctx.maps,
      rank,
      unlockedCount,
      totalAchievements: ACHIEVEMENTS.length,
      availableTitles: getAvailableTitles(),
      achievements: ACHIEVEMENTS.map(a => ({
        ...a,
        unlockedAt: isAuthenticated ? (state.unlocked[a.id] || null) : null,
        isUnlocked: isAuthenticated ? Boolean(state.unlocked[a.id]) : false,
        progressData: isAuthenticated && typeof a.progress === 'function' ? a.progress(ctx) : null
      }))
    };
  }

  function recordPageVisit() {
    if (!activeSession?.id) return;
    const page = detectCurrentPage();
    let dirty = false;
    if (page !== 'other' && !state.visitedPages.includes(page)) {
      state.visitedPages.push(page);
      dirty = true;
    }
    try {
      const prev = sessionStorage.getItem(SESSION_NAV_KEY);
      if (prev !== page) {
        sessionStorage.setItem(SESSION_NAV_KEY, page);
        const now = Date.now();
        state.navTimestamps = [...(state.navTimestamps || []), now].slice(-5);
        if (
          state.navTimestamps.length >= 5 &&
          now - state.navTimestamps[0] <= 20000 &&
          !state.flags.speedrunnerUnlocked
        ) {
          state.flags.speedrunnerUnlocked = true;
        }
        dirty = true;
      }
    } catch {
      // ignore
    }
    if (dirty) {
      saveState();
      scheduleCloudPush();
    }
  }

  function checkBrandClickEasterEgg() {
    try {
      const now = Date.now();
      const prev = JSON.parse(sessionStorage.getItem(SESSION_BRAND_TAPS) || '[]')
        .filter(t => typeof t === 'number' && now - t < 6000);
      prev.push(now);
      sessionStorage.setItem(SESSION_BRAND_TAPS, JSON.stringify(prev.slice(-6)));
      if (prev.length >= 5) {
        if (!activeSession?.id) {
          showAuthRequiredToast('brand');
          return true;
        }
        if (!state.flags.konamiUnlocked) {
          state.flags.konamiUnlocked = true;
          saveState();
          evaluateAll();
          return true;
        }
      }
    } catch {
      // ignore
    }
    return false;
  }

  function setupGlobalHooks() {
    let checkTimer = null;
    Storage.prototype.setItem = function (key, value) {
      origSetItem.call(this, key, value);
      if (!internalWrite && typeof key === 'string' && !key.startsWith(ACCOUNT_KEY_PREFIX)) {
        clearTimeout(checkTimer);
        checkTimer = setTimeout(() => {
          refreshActiveUserFromStorage();
          evaluateAll();
        }, 80);
      }
    };

    Storage.prototype.removeItem = function (key) {
      origRemoveItem.call(this, key);
      if (!internalWrite && typeof key === 'string' && /^sb-.*-auth-token$/.test(key)) {
        clearTimeout(checkTimer);
        checkTimer = setTimeout(() => {
          refreshActiveUserFromStorage();
          notifySubscribers();
        }, 50);
      }
    };

    window.addEventListener('storage', () => {
      refreshActiveUserFromStorage();
      evaluateAll({ silent: true });
    });

    // Konami code listener: Up Up Down Down Left Right Left Right
    const konami = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight'];
    let kPos = 0;
    document.addEventListener('keydown', e => {
      if (e.key === konami[kPos]) {
        kPos++;
        if (kPos === konami.length) {
          kPos = 0;
          if (!activeSession?.id) {
            showAuthRequiredToast('konami');
            return;
          }
          if (!state.flags.konamiUnlocked) {
            state.flags.konamiUnlocked = true;
            saveState();
            evaluateAll();
          }
        }
      } else {
        kPos = e.key === konami[0] ? 1 : 0;
      }
    });

    // 5 rapid clicks on NOVA RP brand logo
    document.querySelectorAll('.brand').forEach(brand => {
      brand.addEventListener('click', e => {
        const triggered = checkBrandClickEasterEgg();
        if (triggered && detectCurrentPage() === 'home') {
          e.preventDefault();
        }
      });
    });

    // Forbidden search terms Easter egg across search inputs
    const checkForbiddenInput = val => {
      const clean = String(val || '').trim().toLocaleLowerCase('ru');
      if (!clean) return;
      const words = clean.split(/[\s,.;:!?/\\|+()-]+/).filter(Boolean);
      if (FORBIDDEN_TERMS.some(term => clean === term || words.includes(term))) {
        if (!activeSession?.id) {
          showAuthRequiredToast('search');
          return;
        }
        if (!state.flags.forbiddenSearched) {
          state.flags.forbiddenSearched = true;
          saveState();
          evaluateAll();
        }
      }
    };

    ['pediaSearch', 'search', 'forumSearch'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', () => checkForbiddenInput(el.value));
    });

    // Weapons category sommelier hook
    if (detectCurrentPage() === 'weapons') {
      const catEl = document.getElementById('category');
      if (catEl) {
        catEl.addEventListener('change', () => {
          if (!activeSession?.id) return;
          const val = catEl.value.trim();
          if (val && !state.weaponCategories.includes(val)) {
            state.weaponCategories.push(val);
            saveState();
            evaluateAll();
          }
        });
      }
    }

    // Export / copy plan hook on craft calculators
    ['exportPlan', 'copy'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', () => {
          setTimeout(() => {
            const ctx = buildContext();
            if (ctx.gov.lines > 0 || ctx.ems.lines > 0) {
              if (!activeSession?.id) {
                showAuthRequiredToast('export');
                return;
              }
              if (!state.flags.exportedOrCopiedPlan) {
                state.flags.exportedOrCopiedPlan = true;
                saveState();
                evaluateAll();
              }
            }
          }, 60);
        });
      }
    });

    // Forum contribution hook
    if (detectCurrentPage() === 'forum') {
      document.addEventListener('submit', e => {
        const form = e.target;
        if (form && (form.id === 'newTopicForm' || form.classList.contains('forum-comment'))) {
          setTimeout(() => {
            if (!activeSession?.id) return;
            if (!state.flags.forumContributed) {
              state.flags.forumContributed = true;
              saveState();
              evaluateAll();
            }
          }, 650);
        }
      });
    }
  }

  function updateDossier({ customName, avatar, faction, motto, equippedTitle }) {
    if (!activeSession?.id) {
      throw new Error('Войдите в аккаунт или зарегистрируйтесь, чтобы настраивать досье и получать достижения.');
    }
    if (typeof customName === 'string') state.customName = customName.trim().slice(0, 40);
    if (AVATARS.includes(avatar)) state.avatar = avatar;
    if (FACTIONS.some(f => f.id === faction)) state.faction = faction;
    if (typeof motto === 'string') state.motto = motto.trim().slice(0, 140);
    if (typeof equippedTitle === 'string' && getAvailableTitles().includes(equippedTitle)) {
      state.equippedTitle = equippedTitle;
    }
    state.flags.dossierSaved = true;
    saveState();
    scheduleCloudPush();
    evaluateAll();
    return getSnapshot();
  }

  function equipTitle(title) {
    if (!activeSession?.id) return;
    if (getAvailableTitles().includes(title)) {
      state.equippedTitle = title;
      saveState();
      scheduleCloudPush();
      notifySubscribers();
    }
  }

  function rollTry(actionText) {
    if (!activeSession?.id) {
      showAuthRequiredToast('try');
      return null;
    }
    const cleanAction = String(actionText || '').trim().slice(0, 120) || 'испытать удачу Лос-Сантоса';
    const arr = new Uint32Array(1);
    if (window.crypto?.getRandomValues) window.crypto.getRandomValues(arr);
    else arr[0] = Math.floor(Math.random() * 0xffffffff);
    const success = (arr[0] % 2) === 0;

    state.tryStats.total = (state.tryStats.total || 0) + 1;
    if (success) {
      state.tryStats.successes = (state.tryStats.successes || 0) + 1;
      state.tryStats.currentStreak = (state.tryStats.currentStreak || 0) + 1;
      if (state.tryStats.currentStreak > (state.tryStats.bestStreak || 0)) {
        state.tryStats.bestStreak = state.tryStats.currentStreak;
      }
    } else {
      state.tryStats.currentStreak = 0;
    }
    state.tryStats.lastRoll = {
      action: cleanAction,
      success,
      at: new Date().toISOString()
    };
    saveState();
    scheduleCloudPush();
    evaluateAll();
    return {
      action: cleanAction,
      success,
      currentStreak: state.tryStats.currentStreak,
      bestStreak: state.tryStats.bestStreak,
      total: state.tryStats.total,
      successes: state.tryStats.successes
    };
  }

  function syncSupabaseAccount(info) {
    if (!info || !info.id) {
      activeSession = null;
      state = defaultAccountState(null);
      notifySubscribers();
      return;
    }

    if (!activeSession || activeSession.id !== info.id) {
      activeSession = {
        id: info.id,
        email: info.email || '',
        accessToken: info.accessToken || readCachedSupabaseSession()?.accessToken || '',
        displayName: String(info.displayName || 'Участник').trim().slice(0, 40)
      };
      state = loadAccountState(info.id);
      recordPageVisit();
    } else if (info.accessToken) {
      activeSession.accessToken = info.accessToken;
    }

    // Merge remote cloud dossier & achievements if present
    if (info.remoteProfile && typeof info.remoteProfile === 'object') {
      const rp = info.remoteProfile;
      if (AVATARS.includes(rp.avatar) && state.avatar === '◈') state.avatar = rp.avatar;
      if (FACTIONS.some(f => f.id === rp.faction) && state.faction === 'civilian') state.faction = rp.faction;
      if (typeof rp.motto === 'string' && rp.motto && !state.motto) state.motto = rp.motto.slice(0, 140);
      if (rp.unlocked_achievements && typeof rp.unlocked_achievements === 'object' && !Array.isArray(rp.unlocked_achievements)) {
        for (const [k, v] of Object.entries(rp.unlocked_achievements)) {
          if (ACHIEVEMENTS.some(a => a.id === k) && typeof v === 'string' && !state.unlocked[k]) {
            state.unlocked[k] = v;
          }
        }
      }
      if (typeof rp.equipped_title === 'string' && rp.equipped_title && getAvailableTitles().includes(rp.equipped_title)) {
        state.equippedTitle = rp.equipped_title;
      }
    }

    if (info.remoteProgress && typeof info.remoteProgress === 'object') {
      const pg = info.remoteProgress;
      if (Array.isArray(pg.visitedPages)) {
        state.visitedPages = [...new Set([...state.visitedPages, ...pg.visitedPages.filter(x => typeof x === 'string')])].slice(0, 20);
      }
      if (Array.isArray(pg.weaponCategories)) {
        state.weaponCategories = [...new Set([...state.weaponCategories, ...pg.weaponCategories.filter(x => typeof x === 'string')])].slice(0, 20);
      }
      if (pg.tryStats && typeof pg.tryStats === 'object') {
        if ((pg.tryStats.total || 0) > (state.tryStats.total || 0)) {
          state.tryStats = { ...state.tryStats, ...pg.tryStats };
        } else if ((pg.tryStats.bestStreak || 0) > (state.tryStats.bestStreak || 0)) {
          state.tryStats.bestStreak = pg.tryStats.bestStreak;
        }
      }
      if (pg.flags && typeof pg.flags === 'object') {
        for (const k of Object.keys(state.flags)) {
          if (pg.flags[k] === true) state.flags[k] = true;
        }
      }
    }

    state.syncedUser = {
      id: info.id,
      displayName: String(info.displayName || 'Участник').trim().slice(0, 40),
      role: info.moderator ? 'moderator' : 'member',
      topicsCount: Number(info.topicsCount) || 0,
      commentsCount: Number(info.commentsCount) || 0,
      createdAt: info.createdAt || null,
      syncedAt: new Date().toISOString()
    };

    if ((Number(info.topicsCount) || 0) + (Number(info.commentsCount) || 0) > 0) {
      state.flags.forumContributed = true;
    }

    saveState();
    evaluateAll();
    scheduleCloudPush();
  }

  window.NovaProfile = Object.freeze({
    ACHIEVEMENTS,
    FACTIONS,
    AVATARS,
    RANKS,
    staticIdFromUuid,
    getRankInfo,
    getSnapshot,
    updateDossier,
    equipTitle,
    rollTry,
    syncSupabaseAccount,
    evaluateAll,
    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    }
  });

  function init() {
    refreshActiveUserFromStorage();
    recordPageVisit();
    updateHeaderBadge();
    setupGlobalHooks();
    evaluateAll({ silent: false });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
