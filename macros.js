'use strict';
(() => {
  const $ = id => document.getElementById(id);

  const LOCAL_MACROS_KEY = 'novaMacrosCustomItemsV2';
  const LOCAL_OVERRIDES_KEY = 'novaMacrosOverridesV1';
  const LOCAL_COUNTS_KEY = 'novaMacrosBuiltinCountsV1';
  const LOCAL_LIKES_KEY = 'novaMacrosLikedIdsV1';
  const LOCAL_FAVS_KEY = 'novaMacrosFavIdsV1';
  const LOCAL_REPORTS_KEY = 'novaMacrosReportedIdsV1';
  const LOCAL_DELETED_KEY = 'novaMacrosDeletedBuiltinIdsV1';
  const LOCAL_AUTHOR_TOKEN_KEY = 'novaMacrosClientAuthorV1';

  const CATEGORIES = {
    government: { label: 'Государственное', badge: 'ГОСУДАРСТВЕННОЕ' },
    crime:      { label: 'Криминальное',    badge: 'КРИМИНАЛЬНОЕ' },
    family:     { label: 'Семьи',           badge: 'СЕМЬИ' },
    rp:         { label: 'RP',              badge: 'RP' },
    other:      { label: 'Прочее',          badge: 'ПРОЧЕЕ' }
  };

  // Готовый проверенный профиль макросов SAHP (GRM1)
  const SAHP_GRM1_CODE =
    'GRM1.eyJ2IjoxLCJraW5kIjoicHJvZmlsZSIsIm5hbWUiOiJTQUhQIiwibWFjcm9zIjpbeyJuYW1lIjoi0JbQtdGC0L7QvSIsImh1ZCI6dHJ1ZSwic3RlcHMiOlt7InR5cGUiOiJtZSIsInRleHQiOiLQu9C10LPQutC40Lwg0LTQstC40LbQtdC90LjQtdC8INC_0YDQsNCy0L7QuSDRgNGD0LrQuCDQv9C-0YLRj9C90YPQu9GB0Y8g0Log0YLQsNC60YLQuNGH0LXRgdC60L7QvNGDINC20LjQu9C10YLRgyJ9LHsidHlwZSI6Im1lIiwidGV4dCI6ItC-0YLQutC40L3Rg9C7INC60L7QttCw0L3Ri9C5INGH0LXRhdC-0Lsg0YEg0LbQtdGC0L7QvdC-0LwsINC00LXQvNC-0L3RgdGC0YDQuNGA0YPRjyDQtdCz0L4g0YfQtdC70L7QstC10LrRgyDQvdCw0L_RgNC-0YLQuNCyIn0seyJ0eXBlIjoiZG8iLCJ0ZXh0Ijoi0J3QsCDQs9GA0YPQtNC4INC30LDQutGA0LXQv9C70LXQvSDQttC10YLQvtC9IFNBSFAgLyDQktC70LDQtNC10LvQtdGGOiBOaWNrIE5hbWUuIn1dfSx7Im5hbWUiOiLQntCx0YvRgdC6IiwiaHVkIjp0cnVlLCJzdGVwcyI6W3sidHlwZSI6Im1lIiwidGV4dCI6ItC90LDQtNC10Lsg0YDQtdC30LjQvdC-0LLRi9C1INC_0LXRgNGH0LDRgtC60LgsINC_0L7RgdC70LUg0YfQtdCz0L4g0YLRidCw0YLQtdC70YzQvdC-INC-0LHRi9GB0LrQsNC7INCy0LXRgNGF0L3QuNC1INC4INC90LjQttC90LjQtSDQutCw0YDQvNCw0L3RiyDQt9Cw0LTQtdGA0LbQsNC90L3QvtCz0L4ifSx7InR5cGUiOiJtZSIsInRleHQiOiLQv9GA0L7RhdC70L7Qv9Cw0Lsg0L_QviDRjdC70LXQvNC10L3RgtCw0Lwg0L7QtNC10LbQtNGLLCDQv9GA0L7QstC10YDRj9GPINGB0LrRgNGL0YLRi9C1INC_0L7Qu9C-0YHRgtC4INC4INC_0L7Rj9GB0L3QvtC5INC-0YLQtNC10LsifSx7InR5cGUiOiJzZWFyY2gifV19LHsibmFtZSI6ItCQ0YDQtdGB0YIiLCJodWQiOnRydWUsInN0ZXBzIjpbeyJ0eXBlIjoibWUiLCJ0ZXh0Ijoi0LTQvtGB0YLQsNC7INC_0LDQutC10YIg0LTQvtC60YPQvNC10L3RgtC-0LIg0LfQsNC00LXRgNC20LDQvdC90L7Qs9C-INC4INCy0L3QtdGBINGE0LjQvdCw0LvRjNC90YvQtSDQtNCw0L3QvdGL0LUg0LIg0LHQsNC30YMg0L_RgNCw0LLQvtC-0YXRgNCw0L3QuNGC0LXQu9GM0L3Ri9GFINC-0YDQs9Cw0L3QvtCyIn0seyJ0eXBlIjoibWUiLCJ0ZXh0Ijoi0L_QtdGA0LXQtNCw0Lsg0LfQsNC00LXRgNC20LDQvdC90L7Qs9C-INC_0L7QtCDRgdGC0YDQsNC20YMg0LTQtdC20YPRgNC90L7QvNGDINGB0L7RgtGA0YPQtNC90LjQutGDINC4INC30LDRhNC40LrRgdC40YDQvtCy0LDQuyDQv9C10YDQtdC00LDRh9GDINCyINC20YPRgNC90LDQu9C1In0seyJ0eXBlIjoiZG8iLCJ0ZXh0Ijoi0JfQsNC00LXRgNC20LDQvdC90YvQuSDQvtGE0LjRhtC40LDQu9GM0L3QviDQstC30Y_RgiDQv9C-0LQg0YHRgtGA0LDQttGDINC4INC_0YDQtdC_0YDQvtCy0L7QttC00LXQvSDQsiDQvNC10YHRgtC-INC-0YLQsdGL0LLQsNC90LjRjyDQvdCw0LrQsNC30LDQvdC40Y8uIn0seyJ0eXBlIjoiYXJyZXN0In1dfSx7Im5hbWUiOiLQoNC-0LfRi9GB0LoiLCJodWQiOnRydWUsInN0ZXBzIjpbeyJ0eXBlIjoibWUiLCJ0ZXh0Ijoi0LTQvtGB0YLQsNC7INGC0LDQutGC0LjRh9C10YHQutC40Lkg0L_Qu9Cw0L3RiNC10YIg0LjQtyDQutGA0LXQv9C70LXQvdC40Y8g0L3QsCDQsdGA0L7QvdC10LbQuNC70LXRgtC1INC4INCw0LrRgtC40LLQuNGA0L7QstCw0Lsg0LHQsNC30YMg0LTQsNC90L3Ri9GFIFNBSFAifSx7InR5cGUiOiJtZSIsInRleHQiOiLQvtGC0LrRgNGL0Lsg0LLQutC70LDQtNC60YMg0YDQvtC30YvRgdC60LAsINCy0LLQtdC7INC_0YDQuNC80LXRgtGLINC_0L7QtNC-0LfRgNC10LLQsNC10LzQvtCz0L4g0Lgg0YPQutCw0LfQsNC7INC40L3QutGA0LjQvNC40L3QuNGA0YPQtdC80YvQtSDRgdGC0LDRgtGM0Lgg0KPQmiJ9LHsidHlwZSI6ImRvIiwidGV4dCI6ItCU0LDQvdC90YvQtSDRg9GB0L_QtdGI0L3QviDQvtCx0L3QvtCy0LvQtdC90YssINC_0YDQsNCy0L7QvdCw0YDRg9GI0LjRgtC10LvRjCDQvtCx0YrRj9Cy0LvQtdC9INCyINGA0L7Qt9GL0YHQui4ifV19LHsibmFtZSI6ImluY2FyL291dCIsImh1ZCI6dHJ1ZSwic3RlcHMiOlt7InR5cGUiOiJtZSIsInRleHQiOiLQvtGC0LrRgNGL0Lsg0LfQsNC00L3RjtGOINC00LLQtdGA0Ywg0L_QsNGC0YDRg9C70YzQvdC-0LPQviDQsNCy0YLQvtC80L7QsdC40LvRjyBTQUhQINC4INC_0YDQuNC00LXRgNC20LDQuyDQtdGRINGA0YPQutC-0LkifSx7InR5cGUiOiJtZSIsInRleHQiOiLQv9C-0LzQvtCzINC30LDQtNC10YDQttCw0L3QvdC-0LzRgyDQuNC30LzQtdC90LjRgtGMINC_0L7Qu9C-0LbQtdC90LjQtSwg0L_QtdGA0LXQvNC10YnQsNGPINC10LPQviDQvtGC0L3QvtGB0LjRgtC10LvRjNC90L4g0YHQsNC70L7QvdCwINC60YDRg9C30LXRgNCwIn0seyJ0eXBlIjoibWUiLCJ0ZXh0Ijoi0LfQsNGF0LvQvtC_0L3Rg9C7INC30LDQtNC90Y7RjiDQtNCy0LXRgNGMINCw0LLRgtC-0LzQvtCx0LjQu9GPLCDQt9Cw0LHQu9C-0LrQuNGA0L7QstCw0LIg0LfQsNC80LrQuCJ9XX0seyJuYW1lIjoi0JzQuNGA0LjQvdC00LAiLCJodWQiOnRydWUsInN0ZXBzIjpbeyJ0eXBlIjoic2F5IiwidGV4dCI6ItCS0Ysg0LjQvNC10LXRgtC1INC_0YDQsNCy0L4g0YXRgNCw0L3QuNGC0Ywg0LzQvtC70YfQsNC90LjQtS4g0JLRgdGRLCDRh9GC0L4g0LLRiyDRgdC60LDQttC10YLQtSwg0LzQvtC20LXRgiDQuCDQsdGD0LTQtdGCINC40YHQv9C-0LvRjNC30L7QstCw0L3QviDQv9GA0L7RgtC40LIg0LLQsNGBINCyINGB0YPQtNC1LiJ9LHsidHlwZSI6InNheSIsInRleHQiOiLQktGLINC40LzQtdC10YLQtSDQv9GA0LDQstC-INC90LAg0LDQtNCy0L7QutCw0YLQsC4g0JXRgdC70Lgg0LLRiyDQvdC1INC80L7QttC10YLQtSDQvtC_0LvQsNGC0LjRgtGMINC10LPQviDRg9GB0LvRg9Cz0LgsINC-0L0g0LHRg9C00LXRgiDQv9GA0LXQtNC-0YHRgtCw0LLQu9C10L0g0LPQvtGB0YPQtNCw0YDRgdGC0LLQvtC8LiJ9LHsidHlwZSI6InNheSIsInRleHQiOiLQktGLINC40LzQtdC10YLQtSDQv9GA0LDQstC-INC90LAg0L7QtNC40L0g0YLQtdC70LXRhNC-0L3QvdGL0Lkg0LfQstC-0L3QvtC6INC00LvQuNGC0LXQu9GM0L3QvtGB0YLRjNGOINC00L4gNSDQvNC40L3Rg9GCLiDQktCw0Lwg0L_QvtC90Y_RgtC90Ysg0LLQsNGI0Lgg0L_RgNCw0LLQsD8ifV19LHsibmFtZSI6ItCc0LXQs9Cw0YTQvtC9IiwiaHVkIjp0cnVlLCJzdGVwcyI6W3sidHlwZSI6Im1lZ2FwaG9uZSIsInRleHQiOiJTQUhQOiDQktC-0LTQuNGC0LXQu9GMINGC0YDQsNC90YHQv9C-0YDRgtC90L7Qs9C-INGB0YDQtdC00YHRgtCy0LAhINCf0YDQuNC20LzQuNGC0LXRgdGMINC6INC-0LHQvtGH0LjQvdC1INC4INC-0YHRgtCw0L3QvtCy0LjRgtC10YHRjCEifSx7InR5cGUiOiJtZWdhcGhvbmUiLCJ0ZXh0IjoiU0FIUDog0JIg0YHQu9GD0YfQsNC1INC90LXQv9C-0LTRh9C40L3QtdC90LjRjywg0L_RgNC-0YLQuNCyINCy0LDRgSDQsdGD0LTQtdGCINC_0YDQuNC80LXQvdC10L3QsCDRhNC40LfQuNGH0LXRgdC60LDRjyDRgdC40LvQsCDQuCDQvtGA0YPQttC40LUhIn1dfSx7Im5hbWUiOiLQqNGC0YDQsNGEIiwiaHVkIjp0cnVlLCJzdGVwcyI6W3sidHlwZSI6Im1lIiwidGV4dCI6ItC00L7RgdGC0LDQuyDRgdC70YPQttC10LHQvdGL0Lkg0L_Qu9Cw0L3RiNC10YIgU0FIUCwg0L_QvtGB0LvQtSDRh9C10LPQviDQsNC60YLQuNCy0LjRgNC-0LLQsNC7INCx0LDQt9GDINC00LDQvdC90YvRhSDQlNC-0YDQvtC20L3QvtCz0L4g0JrQvtC00LXQutGB0LAifSx7InR5cGUiOiJtZSIsInRleHQiOiLQstCy0LXQuyDQu9C40YfQvdGL0LUg0LTQsNC90L3Ri9C1INC90LDRgNGD0YjQuNGC0LXQu9GPLCDRg9C60LDQt9Cw0Lsg0YHRg9C80LzRgyDRiNGC0YDQsNGE0LAg0Lgg0YHRgtCw0YLRjNC4INCU0JosINC30LDRgtC10Lwg0L_QvtC00YLQstC10YDQtNC40Lsg0L7RgtC_0YDQsNCy0LrRgyJ9LHsidHlwZSI6ImRvIiwidGV4dCI6ItCt0LvQtdC60YLRgNC-0L3QvdC-0LUg0YPQstC10LTQvtC80LvQtdC90LjQtSDQviDRiNGC0YDQsNGE0LUg0LHRi9C70L4g0LDQstGC0L7QvNCw0YLQuNGH0LXRgdC60Lgg0L7RgtC_0YDQsNCy0LvQtdC90L4g0L3QsCDRgtC10LvQtdGE0L7QvSDQvdCw0YDRg9GI0LjRgtC10LvRjy4ifSx7InR5cGUiOiJmaW5lIn1dfV19';

  const BUILT_IN_MACROS = [
    {
      id: '00000000-0000-4000-8000-000000005a48',
      is_builtin: true,
      macro_uuid: 'GRM1 · SAHP (8 макросов)',
      author_id: null,
      author_name: 'SAHP',
      category: 'government',
      title: 'SAHP — Профиль макросов',
      description: 'Готовый профиль SAHP (8 макросов): Жетон, Обыск, Арест, Розыск, incar/out, Миринда, Мегафон и Штраф',
      hotkey: 'HUD меню',
      file_name: 'sahp-profile.grm.txt',
      macro_code: SAHP_GRM1_CODE,
      tags: 'SAHP, Жетон, Обыск, Арест, Розыск, incar/out, Миринда, Мегафон, Штраф, гос',
      downloads_count: 0,
      likes_count: 0,
      reports_count: 0,
      is_published: true,
      created_at: '2026-10-31T16:00:00Z',
      updated_at: '2026-10-31T16:00:00Z'
    }
  ];

  // ==========================================================================
  // GRM1.<Base64URL> DECODER + LOSSLESS COMPILER / ENCODER
  // ==========================================================================
  const STEP_TYPE_OPTIONS = [
    { value: 'me',        label: '/me — Действие от 1-го лица', mode: 'text', placeholder: 'легким движением правой руки...' },
    { value: 'do',        label: '/do — Описание от 3-го лица', mode: 'text', placeholder: 'На груди закреплен жетон...' },
    { value: 'try',       label: '/try — Попытка действия',      mode: 'text', placeholder: 'попытался вскрыть замок' },
    { value: 'todo',      label: '/todo — Фраза + действие',     mode: 'text', placeholder: 'Не двигаться!*доставая наручники' },
    { value: 'say',       label: 'Чат (IC) — Обычная речь',      mode: 'text', placeholder: 'Вы имеете право хранить молчание...' },
    { value: 'b',         label: '/b (OOC) — НонРП чат',         mode: 'text', placeholder: 'Откат действия' },
    { value: 'megaphone', label: 'Мегафон — Спецтранспорт',      mode: 'text', placeholder: 'SAHP: Водитель, прижмитесь к обочине!' },
    { value: 'r',         label: 'Рация (/r) — Фракционная',     mode: 'text', placeholder: '10-4, выезжаю на код 0' },
    { value: 'd',         label: 'Департамент (/d)',             mode: 'text', placeholder: 'SAHP to EMS: требуется карета...' },
    { value: 'f',         label: 'Семья (/f) — Чат семьи',       mode: 'text', placeholder: 'Сбор у особняка через 5 минут' },
    { value: 'search',    label: '⚡ search — Системный обыск',   mode: 'action' },
    { value: 'arrest',    label: '⚡ arrest — Системный арест',   mode: 'action' },
    { value: 'fine',      label: '⚡ fine — Выписка штрафа',      mode: 'action' },
    { value: 'cuff',      label: '⚡ cuff — Надеть наручники',    mode: 'action' },
    { value: 'uncuff',    label: '⚡ uncuff — Снять наручники',   mode: 'action' },
    { value: 'incar',     label: '⚡ incar — Посадить в авто',    mode: 'action' },
    { value: 'outcar',    label: '⚡ outcar — Высадить из авто',  mode: 'action' },
    { value: 'drag',      label: '⚡ drag — Вести за собой',      mode: 'action' },
    { value: 'undrag',    label: '⚡ undrag — Отпустить',         mode: 'action' },
    { value: 'frisk',     label: '⚡ frisk — Досмотр',            mode: 'action' },
    { value: 'heal',      label: '⚡ heal — Лечение',             mode: 'action' },
    { value: 'revive',    label: '⚡ revive — Реанимация (ПМП)',  mode: 'action' },
    { value: 'wait',      label: '⏱ wait — Пауза (в мс)',        mode: 'wait', placeholder: '1000' }
  ];

  const STEP_ACTION_NAMES = {
    search: 'Системный обыск задержанного',
    arrest: 'Системный арест / передача в КПЗ',
    fine: 'Выписка штрафа',
    ticket: 'Выписка штрафа',
    cuff: 'Надеть наручники',
    uncuff: 'Снять наручники',
    incar: 'Посадить задержанного в авто',
    putincar: 'Посадить задержанного в авто',
    outcar: 'Высадить задержанного из авто',
    pullout: 'Вытащить из автомобиля',
    heal: 'Лечение игрока',
    revive: 'Реанимация игрока (ПМП)',
    reanimate: 'Реанимация игрока (ПМП)',
    frisk: 'Поверхностный досмотр',
    drag: 'Вести задержанного за собой',
    undrag: 'Отпустить задержанного'
  };

  const TEXT_STEP_TYPES = new Set([
    'me', 'do', 'try', 'todo', 'say', 'chat', 'ic', 'b', 'ooc',
    'megaphone', 'm', 'r', 'rb', 'radio', 'd', 'dep', 'f', 'fb', 's', 'w'
  ]);
  const WAIT_STEP_TYPES = new Set(['wait', 'delay', 'sleep']);

  function getStepMode(rawType, hasText) {
    const t = String(rawType || '').toLowerCase();
    if (TEXT_STEP_TYPES.has(t)) return 'text';
    if (WAIT_STEP_TYPES.has(t)) return 'wait';
    const known = STEP_TYPE_OPTIONS.find(o => o.value === t);
    if (known) return known.mode;
    return hasText ? 'text' : 'action';
  }

  function decodeBase64UrlUtf8(b64url) {
    let b64 = String(b64url || '').trim().replace(/-/g, '+').replace(/_/g, '/');
    const pad = (4 - (b64.length % 4)) % 4;
    if (pad) b64 += '='.repeat(pad);

    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  }

  function encodeUtf8Base64Url(str) {
    const bytes = new TextEncoder().encode(String(str));
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  function describeGrmStep(step) {
    const rawType = String(step?.type ?? step?.rawType ?? 'me').trim();
    const lowerType = rawType.toLowerCase();
    const hasTextProp = Object.prototype.hasOwnProperty.call(step || {}, 'text') || typeof step?.rawText === 'string';
    const rawText = typeof step?.rawText === 'string'
      ? step.rawText
      : (typeof step?.text === 'string' ? step.text : '');
    const text = rawText.trim();

    let waitKey = step?.waitKey || '';
    let waitVal = step?.waitVal ?? '';
    if (!waitKey && WAIT_STEP_TYPES.has(lowerType)) {
      if (step?.ms !== undefined) { waitKey = 'ms'; waitVal = String(step.ms); }
      else if (step?.delay !== undefined) { waitKey = 'delay'; waitVal = String(step.delay); }
      else if (step?.duration !== undefined) { waitKey = 'duration'; waitVal = String(step.duration); }
      else if (text) { waitKey = 'text'; waitVal = text; }
    }

    const extraProps = {};
    if (step && typeof step === 'object') {
      for (const [k, v] of Object.entries(step)) {
        if (!['type', 'text', 'ms', 'delay', 'duration', 'rawType', 'rawText', 'hasTextProp', 'waitKey', 'waitVal', 'extraProps', 'badge', 'cls', 'isAction'].includes(k)) {
          extraProps[k] = v;
        }
      }
    }

    let badge = `⚡ ${rawType}`;
    let cls = 'action';
    let displayText = text || `Системное действие (${rawType})`;
    let isAction = !text;

    if (lowerType === 'me') {
      badge = '/me'; cls = 'me'; displayText = text || '—'; isAction = false;
    } else if (lowerType === 'do') {
      badge = '/do'; cls = 'do'; displayText = text || '—'; isAction = false;
    } else if (lowerType === 'try') {
      badge = '/try'; cls = 'try'; displayText = text || '—'; isAction = false;
    } else if (lowerType === 'todo') {
      badge = '/todo'; cls = 'try'; displayText = text || '—'; isAction = false;
    } else if (lowerType === 'say' || lowerType === 'chat' || lowerType === 'ic') {
      badge = 'Чат'; cls = 'say'; displayText = text || '—'; isAction = false;
    } else if (lowerType === 'b' || lowerType === 'ooc') {
      badge = '/b'; cls = 'say'; displayText = text || '—'; isAction = false;
    } else if (lowerType === 'megaphone' || lowerType === 'm') {
      badge = 'Мегафон'; cls = 'megaphone'; displayText = text || '—'; isAction = false;
    } else if (lowerType === 'r' || lowerType === 'rb' || lowerType === 'radio') {
      badge = 'Рация'; cls = 'action'; displayText = text || '—'; isAction = false;
    } else if (lowerType === 'd' || lowerType === 'dep') {
      badge = '/d Деп.'; cls = 'megaphone'; displayText = text || '—'; isAction = false;
    } else if (lowerType === 'f' || lowerType === 'fb') {
      badge = 'Семья'; cls = 'try'; displayText = text || '—'; isAction = false;
    } else if (WAIT_STEP_TYPES.has(lowerType)) {
      const ms = waitVal || text;
      badge = '⏱ Пауза';
      cls = 'action';
      displayText = ms ? `Ожидание ${ms} мс` : 'Пауза между действиями';
      isAction = true;
    } else if (STEP_ACTION_NAMES[lowerType]) {
      const actionHuman = STEP_ACTION_NAMES[lowerType];
      badge = `⚡ ${rawType}`;
      cls = 'action';
      displayText = text ? `${actionHuman}: ${text}` : `${actionHuman} (${rawType})`;
      isAction = true;
    }

    return {
      rawType,
      rawText: WAIT_STEP_TYPES.has(lowerType) ? String(waitVal || rawText || '') : rawText,
      hasTextProp,
      waitKey,
      extraProps,
      badge,
      cls,
      text: displayText,
      isAction
    };
  }

  function serializeGrmStep(st) {
    const rawType = String(st.rawType || 'me').trim();
    const mode = getStepMode(rawType, Boolean(st.rawText && st.rawText.trim()));
    const out = { ...(st.extraProps || {}), type: rawType };

    if (mode === 'text') {
      out.text = String(st.rawText ?? '');
    } else if (mode === 'wait') {
      const key = st.waitKey && st.waitKey !== 'text' ? st.waitKey : 'ms';
      const num = Number(st.rawText);
      if (st.waitKey === 'text') {
        out.text = String(st.rawText || '1000');
      } else {
        out[key] = Number.isFinite(num) && num >= 0 ? num : 1000;
      }
    } else if (st.rawText && String(st.rawText).trim()) {
      out.text = String(st.rawText).trim();
    }
    return out;
  }

  function buildGrmJsonObject(draft) {
    const version = Number(draft?.version) || 1;
    const kind = draft?.kind === 'macro' && draft.macros.length === 1 ? 'macro' : 'profile';
    const rootName = String(draft?.name || 'Макрос').trim() || 'Макрос';

    if (kind === 'macro') {
      const sub = draft.macros[0] || { name: rootName, hud: true, steps: [] };
      const obj = {
        v: version,
        kind: 'macro',
        name: String(sub.name || rootName).trim() || rootName,
        hud: Boolean(sub.hud)
      };
      if (sub.key) obj.key = sub.key;
      if (sub.extraProps) Object.assign(obj, sub.extraProps);
      obj.steps = (sub.steps || []).map(serializeGrmStep);
      return obj;
    }

    return {
      v: version,
      kind: 'profile',
      name: rootName,
      macros: (draft?.macros || []).map((sub, idx) => {
        const mObj = {
          name: String(sub.name || `Макрос #${idx + 1}`).trim() || `Макрос #${idx + 1}`,
          hud: Boolean(sub.hud)
        };
        if (sub.key) mObj.key = sub.key;
        if (sub.extraProps) Object.assign(mObj, sub.extraProps);
        mObj.steps = (sub.steps || []).map(serializeGrmStep);
        return mObj;
      })
    };
  }

  function encodeGrmDraft(draft) {
    const version = Number(draft?.version) || 1;
    const obj = buildGrmJsonObject(draft);
    const jsonMinified = JSON.stringify(obj);
    return `GRM${version}.${encodeUtf8Base64Url(jsonMinified)}`;
  }

  function parseGrmMacro(rawInput) {
    if (!rawInput || typeof rawInput !== 'string') return null;
    const match = rawInput.trim().match(/(GRM(\d+))\.([A-Za-z0-9_-]+={0,2})/);
    if (!match) return null;

    const fullToken = match[0];
    const formatPrefix = match[1];
    const formatVer = Number(match[2]) || 1;
    const b64Payload = match[3];

    try {
      const jsonStr = decodeBase64UrlUtf8(b64Payload);
      const parsed = JSON.parse(jsonStr);
      if (!parsed || typeof parsed !== 'object') return null;

      let kind = String(parsed.kind || '').toLowerCase();
      let list = [];
      const rootName = String(parsed.name || '').trim();

      if (Array.isArray(parsed.macros)) {
        kind = kind || 'profile';
        list = parsed.macros;
      } else if (Array.isArray(parsed.steps)) {
        kind = kind || 'macro';
        list = [{
          name: rootName || 'Макрос',
          hud: Boolean(parsed.hud),
          key: parsed.key || parsed.hotkey || '',
          steps: parsed.steps
        }];
      } else {
        return null;
      }

      const normalizedMacros = list
        .filter(item => item && typeof item === 'object')
        .map((item, idx) => {
          const rawSteps = Array.isArray(item.steps) ? item.steps : [];
          const extraProps = {};
          for (const [k, v] of Object.entries(item)) {
            if (!['name', 'hud', 'key', 'hotkey', 'bind', 'steps'].includes(k)) {
              extraProps[k] = v;
            }
          }
          return {
            name: String(item.name || `Макрос #${idx + 1}`).trim(),
            hud: Boolean(item.hud),
            key: String(item.key || item.hotkey || item.bind || '').trim(),
            extraProps,
            steps: rawSteps.map(describeGrmStep)
          };
        });

      if (!normalizedMacros.length) return null;

      const totalSteps = normalizedMacros.reduce((sum, m) => sum + m.steps.length, 0);
      const anyHud = normalizedMacros.some(m => m.hud);
      const macroNames = normalizedMacros.map(m => m.name);

      const searchBlob = [
        rootName,
        ...normalizedMacros.flatMap(m => [m.name, ...m.steps.map(st => st.text)])
      ].join(' ');

      return {
        rawToken: fullToken,
        formatPrefix,
        version: Number(parsed.v) || formatVer,
        kind: kind === 'macro' ? 'macro' : 'profile',
        name: rootName || normalizedMacros[0].name || 'GRM Макрос',
        macros: normalizedMacros,
        macroNames,
        totalSteps,
        anyHud,
        prettyJson: JSON.stringify(parsed, null, 2),
        searchBlob
      };
    } catch {
      return null;
    }
  }

  function createStarterGrmDraft(name = 'Мой профиль') {
    return {
      version: 1,
      kind: 'profile',
      name,
      macros: [
        {
          name: 'Жетон',
          hud: true,
          key: '',
          extraProps: {},
          steps: [
            describeGrmStep({ type: 'me', text: 'достал удостоверение из нагрудного кармана и развернул его' }),
            describeGrmStep({ type: 'do', text: 'На груди закреплен жетон сотрудника / Имя: Nick Name.' })
          ]
        }
      ]
    };
  }

  function cloneGrmToDraft(grm) {
    if (!grm) return null;
    return {
      version: grm.version || 1,
      kind: grm.kind === 'macro' ? 'macro' : 'profile',
      name: grm.name || 'Профиль',
      macros: grm.macros.map(sub => ({
        name: sub.name,
        hud: Boolean(sub.hud),
        key: sub.key || '',
        extraProps: { ...(sub.extraProps || {}) },
        steps: sub.steps.map(st => ({
          rawType: st.rawType,
          rawText: st.rawText,
          hasTextProp: st.hasTextProp,
          waitKey: st.waitKey || '',
          extraProps: { ...(st.extraProps || {}) }
        }))
      }))
    };
  }

  function guessCategoryFromGrm(grm) {
    if (!grm) return null;
    const text = `${grm.name} ${grm.searchBlob || ''}`.toLocaleLowerCase('ru');
    if (/(sahp|lspd|lscsd|fib|ems|sang|gov|usss|жетон|миранд|миринд|мегафон|арест|обыск|штраф|розыск|наручник|департамент|крузер)/.test(text)) {
      return 'government';
    }
    if (/(крайм|похищ|ограб|стяжк|мешок|заложник|банда|мафия)/.test(text)) {
      return 'crime';
    }
    if (/(семь|особняк|капт|бизвар|fam)/.test(text)) {
      return 'family';
    }
    return 'rp';
  }

  function formatGrmPlainText(grm) {
    const lines = [
      `Профиль GRM v${grm.version}: ${grm.name}`,
      `Макросов: ${grm.macros.length} | Всего шагов: ${grm.totalSteps}`,
      `Код импорта: ${grm.rawToken}`,
      `========================================`
    ];
    grm.macros.forEach((sub, idx) => {
      lines.push('');
      lines.push(`${idx + 1}. ${sub.name}${sub.hud ? ' [HUD]' : ''}${sub.key ? ` [${sub.key}]` : ''}`);
      sub.steps.forEach(st => {
        lines.push(`   ${st.badge}: ${st.text}`);
      });
    });
    return lines.join('\r\n');
  }

  // ==========================================================================
  // STATE & STORAGE
  // ==========================================================================
  const grmCache = new Map();
  function getDecodedGrmForMacro(m) {
    if (!m) return null;
    const codeStr = String(m.macro_code || '');
    const uuidStr = String(m.macro_uuid || '');
    const cacheKey = `${m.id}::${codeStr.length}:${codeStr.slice(-48)}::${uuidStr}`;
    if (grmCache.has(cacheKey)) return grmCache.get(cacheKey);
    const parsed = parseGrmMacro(codeStr) || parseGrmMacro(uuidStr);
    grmCache.set(cacheKey, parsed);
    return parsed;
  }

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
  let activeSubMacroIndex = -1; // -1 = show all submacros in viewer

  // Active inline visual editor state (null when viewing normally)
  let editingState = null;

  let likedIds = loadJsonSet(LOCAL_LIKES_KEY);
  let favIds = loadJsonSet(LOCAL_FAVS_KEY);
  let reportedIds = loadJsonSet(LOCAL_REPORTS_KEY);
  const copyCountedInSession = new Set();
  const lastDownloadClickAt = new Map();

  const autoFilledFields = new Set();

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

  function loadJsonMap(key) {
    try {
      const obj = JSON.parse(localStorage.getItem(key) || '{}');
      return obj && typeof obj === 'object' ? obj : {};
    } catch {
      return {};
    }
  }

  function saveJsonMap(key, obj) {
    try {
      localStorage.setItem(key, JSON.stringify(obj));
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
    }, 2800);
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

  function canManageRemoteMacro(m) {
    if (!m) return false;
    if (isModerator) return true;
    if (currentUser && m.author_id && String(m.author_id) === String(currentUser.id)) return true;
    return false;
  }

  function canDeleteMacro(m) {
    if (!m) return false;
    if (canManageRemoteMacro(m)) return true;
    if (m.local_token && m.local_token === getClientAuthorToken()) return true;
    return false;
  }

  function isMyMacro(m) {
    if (!m) return false;
    if (currentUser && m.author_id && String(m.author_id) === String(currentUser.id)) return true;
    if (m.local_token && m.local_token === getClientAuthorToken()) return true;
    const overrides = loadJsonMap(LOCAL_OVERRIDES_KEY);
    if (overrides[String(m.id)]) return true;
    return false;
  }

  function hasLocalOverride(m) {
    if (!m) return false;
    const overrides = loadJsonMap(LOCAL_OVERRIDES_KEY);
    return Boolean(overrides[String(m.id)]);
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

  function applyOverridesAndMergeBuiltins(list) {
    const deletedBuiltins = loadJsonSet(LOCAL_DELETED_KEY);
    const localCounts = loadJsonMap(LOCAL_COUNTS_KEY);
    const overrides = loadJsonMap(LOCAL_OVERRIDES_KEY);

    const result = list.map(row => {
      const ov = overrides[String(row.id)];
      if (!ov) return { ...row };
      return {
        ...row,
        ...ov,
        original_snapshot: row.original_snapshot || {
          title: row.title,
          category: row.category,
          description: row.description,
          hotkey: row.hotkey,
          tags: row.tags,
          macro_uuid: row.macro_uuid,
          macro_code: row.macro_code,
          file_name: row.file_name,
          author_name: row.author_name
        }
      };
    });

    for (const b of BUILT_IN_MACROS) {
      if (deletedBuiltins.has(String(b.id))) continue;
      const alreadyExists = result.some(
        r => String(r.id) === String(b.id) || (r.macro_code && r.macro_code.trim() === b.macro_code.trim())
      );
      if (!alreadyExists) {
        const counts = localCounts[String(b.id)] || {};
        const ov = overrides[String(b.id)] || null;
        result.push({
          ...b,
          ...(ov || {}),
          original_snapshot: {
            title: b.title,
            category: b.category,
            description: b.description,
            hotkey: b.hotkey,
            tags: b.tags,
            macro_uuid: b.macro_uuid,
            macro_code: b.macro_code,
            file_name: b.file_name,
            author_name: b.author_name
          },
          downloads_count: Math.max(0, (Number(b.downloads_count) || 0) + (Number(counts.downloads) || 0)),
          likes_count: Math.max(0, (Number(b.likes_count) || 0) + (Number(counts.likes) || 0))
        });
      }
    }
    return result;
  }

  async function loadMacros() {
    remoteAvailable = false;
    let remoteRows = [];

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
          remoteRows = res.data;
        }
      } catch (err) {
        console.warn('Using localStorage macros until pedia_macros table is set up.', err);
      }
    }

    if (remoteAvailable) {
      macros = applyOverridesAndMergeBuiltins(remoteRows);
    } else {
      macros = applyOverridesAndMergeBuiltins(loadLocalCustomMacros());
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
      const grm = getDecodedGrmForMacro(m);
      const hay = `${m.title || ''} ${m.description || ''} ${m.tags || ''} ${m.author_name || ''} ${m.hotkey || ''} ${m.macro_uuid || ''} ${grm ? grm.searchBlob : ''}`.toLocaleLowerCase('ru');
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
      activeSubMacroIndex = -1;
      editingState = null;
    }

    renderList(visible);
    const activeMacro = visible.find(m => String(m.id) === String(selectedId)) || null;
    if (editingState && activeMacro && String(editingState.macroId) === String(activeMacro.id)) {
      renderInlineEditor(activeMacro);
    } else {
      editingState = null;
      renderDetail(activeMacro, bumpDownloads);
    }
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
            : 'Нажмите «+ Предложить макрос», чтобы добавить первый макрос.'
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
        if (String(selectedId) !== String(m.id)) {
          selectedId = String(m.id);
          activeSubMacroIndex = -1;
          editingState = null;
          renderAll(false);
        }
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

  // ==========================================================================
  // INTERACTIVE VISUAL GRM1 EDITOR & LIVE COMPILER
  // ==========================================================================
  function detectPlaceholderToken(grmDraft) {
    if (!grmDraft) return '';
    for (const sub of grmDraft.macros) {
      for (const st of sub.steps) {
        if (st.rawText && st.rawText.includes('Nick Name')) return 'Nick Name';
      }
    }
    return '';
  }

  function openInlineEditor(m) {
    if (!m) return;
    const grm = getDecodedGrmForMacro(m);
    const grmDraft = grm ? cloneGrmToDraft(grm) : null;

    editingState = {
      macroId: String(m.id),
      title: m.title || '',
      category: CATEGORIES[m.category] ? m.category : 'other',
      description: m.description || '',
      hotkey: m.hotkey || '',
      tags: m.tags || '',
      author_name: m.author_name || 'Аноним',
      macro_uuid: m.macro_uuid || '',
      macro_code: m.macro_code || '',
      file_name: m.file_name || '',
      grmDraft,
      activeSubIdx: 0,
      findText: detectPlaceholderToken(grmDraft),
      replaceText: ''
    };
    renderInlineEditor(m);
  }

  function getLiveCompiledCodeFromState() {
    if (!editingState) return '';
    if (editingState.grmDraft) {
      return encodeGrmDraft(editingState.grmDraft);
    }
    return editingState.macro_code || '';
  }

  function refreshLiveEditorCodeOutput() {
    if (!editingState || !editingState.grmDraft) return;
    const compiled = encodeGrmDraft(editingState.grmDraft);
    editingState.macro_code = compiled;
    const totalSteps = editingState.grmDraft.macros.reduce((s, sub) => s + sub.steps.length, 0);

    const statusNode = $('grmEditorLiveStatus');
    if (statusNode) {
      statusNode.textContent = `● РАБОЧИЙ КОД GRM1 ГОТОВ · ${editingState.grmDraft.macros.length} макр. · ${totalSteps} шаг. · ${compiled.length} симв.`;
    }
    const rawNode = $('grmEditorLiveRaw');
    if (rawNode) {
      rawNode.textContent = compiled;
    }
  }

  function renderInlineEditor(m, focusStepIndex = -1) {
    const panel = $('macroDetailPanel');
    if (!panel || !editingState) return;
    panel.replaceChildren();

    const wrap = el('div', 'grm-editor-wrap');

    // 1. Top Editor Banner
    const banner = el('div', 'grm-editor-banner');
    const bannerLeft = el('div', '');
    bannerLeft.append(
      el('strong', '', '✎ Редактор макроса (с автоматической сборкой рабочего кода GRM1)'),
      el('div', '', '')
    );
    bannerLeft.lastChild.appendChild(
      el('span', '', 'Меняйте никнейм, отыгровки /me /do, чат или системные действия — рабочий код для импорта в игру пересобирается мгновенно.')
    );

    const closeEdBtn = el('button', 'mc-cancel-btn', '✕ Закрыть редактор');
    closeEdBtn.type = 'button';
    closeEdBtn.onclick = () => {
      editingState = null;
      renderDetail(m, false);
    };
    banner.append(bannerLeft, closeEdBtn);
    wrap.appendChild(banner);

    // 2. Card Metadata Section
    const metaCard = el('div', 'grm-ed-card');
    metaCard.appendChild(el('div', 'grm-ed-section-title', '1. Название и описание на сайте'));

    const gridTop = el('div', 'grm-ed-grid-2');

    const titleField = el('div', 'mc-field');
    titleField.style.marginBottom = '10px';
    titleField.appendChild(el('label', '', 'Название макроса'));
    const titleInp = el('input', 'mc-input');
    titleInp.type = 'text';
    titleInp.maxLength = 100;
    titleInp.value = editingState.title;
    titleInp.oninput = () => { editingState.title = titleInp.value; };
    titleField.appendChild(titleInp);

    const catField = el('div', 'mc-field');
    catField.style.marginBottom = '10px';
    catField.appendChild(el('label', '', 'Категория'));
    const catSel = el('select', 'mc-select');
    for (const [k, info] of Object.entries(CATEGORIES)) {
      const opt = el('option', '', info.label);
      opt.value = k;
      if (editingState.category === k) opt.selected = true;
      catSel.appendChild(opt);
    }
    catSel.onchange = () => { editingState.category = catSel.value; };
    catField.appendChild(catSel);

    gridTop.append(titleField, catField);
    metaCard.appendChild(gridTop);

    const descField = el('div', 'mc-field');
    descField.style.marginBottom = '10px';
    descField.appendChild(el('label', '', 'Краткое описание'));
    const descInp = el('input', 'mc-input');
    descInp.type = 'text';
    descInp.maxLength = 300;
    descInp.value = editingState.description;
    descInp.oninput = () => { editingState.description = descInp.value; };
    descField.appendChild(descInp);

    const gridBot = el('div', 'grm-ed-grid-2');
    const hkField = el('div', 'mc-field');
    hkField.style.marginBottom = '0';
    hkField.appendChild(el('label', '', 'Клавиша / способ запуска'));
    const hkInp = el('input', 'mc-input');
    hkInp.type = 'text';
    hkInp.maxLength = 60;
    hkInp.placeholder = 'HUD меню, Mouse 5, F4...';
    hkInp.value = editingState.hotkey;
    hkInp.oninput = () => { editingState.hotkey = hkInp.value; };
    hkField.appendChild(hkInp);

    const tagsField = el('div', 'mc-field');
    tagsField.style.marginBottom = '0';
    tagsField.appendChild(el('label', '', 'Теги (через запятую)'));
    const tagsInp = el('input', 'mc-input');
    tagsInp.type = 'text';
    tagsInp.maxLength = 200;
    tagsInp.value = editingState.tags;
    tagsInp.oninput = () => { editingState.tags = tagsInp.value; };
    tagsField.appendChild(tagsInp);

    gridBot.append(hkField, tagsField);
    metaCard.appendChild(gridBot);
    wrap.appendChild(metaCard);

    // 3. Visual GRM1 Step Builder OR Raw Editor
    if (editingState.grmDraft) {
      const draft = editingState.grmDraft;
      if (editingState.activeSubIdx < 0 || editingState.activeSubIdx >= draft.macros.length) {
        editingState.activeSubIdx = 0;
      }

      const builderCard = el('div', 'grm-ed-card');
      const secHead = el('div', 'grm-ed-section-title');
      secHead.appendChild(el('span', '', '2. Конструктор профиля и шагов GRM1'));

      const profileRow = el('div', 'grm-ed-grid-2');
      profileRow.style.marginBottom = '12px';

      const pNameField = el('div', 'mc-field');
      pNameField.style.marginBottom = '0';
      pNameField.appendChild(el('label', '', 'Имя профиля в макрос-клиенте'));
      const pNameInp = el('input', 'mc-input');
      pNameInp.type = 'text';
      pNameInp.maxLength = 60;
      pNameInp.value = draft.name;
      pNameInp.oninput = () => {
        draft.name = pNameInp.value;
        refreshLiveEditorCodeOutput();
      };
      pNameField.appendChild(pNameInp);

      const pKindField = el('div', 'mc-field');
      pKindField.style.marginBottom = '0';
      pKindField.appendChild(el('label', '', 'Тип структуры GRM1'));
      const pKindSel = el('select', 'mc-select');
      const optProf = el('option', '', 'Профиль (несколько макросов — kind: "profile")');
      optProf.value = 'profile';
      const optSingle = el('option', '', 'Одиночный макрос (kind: "macro")');
      optSingle.value = 'macro';
      if (draft.macros.length > 1) {
        optSingle.disabled = true;
        draft.kind = 'profile';
      }
      if (draft.kind === 'macro') optSingle.selected = true;
      else optProf.selected = true;
      pKindSel.append(optProf, optSingle);
      pKindSel.onchange = () => {
        draft.kind = pKindSel.value;
        refreshLiveEditorCodeOutput();
      };
      pKindField.appendChild(pKindSel);

      profileRow.append(pNameField, pKindField);
      builderCard.append(secHead, profileRow);

      // Quick Find & Replace bar (super handy for replacing "Nick Name", "SAHP", badge IDs across all steps)
      const replaceBox = el('div', 'grm-quick-replace');
      replaceBox.style.marginBottom = '14px';
      replaceBox.appendChild(
        el('div', 'grm-quick-replace-label', '⚡ Быстрая замена текста или ника сразу во всех шагах макроса:')
      );
      const findInp = el('input', 'grm-ed-step-input');
      findInp.type = 'text';
      findInp.placeholder = 'Что заменить (напр.: Nick Name)';
      findInp.value = editingState.findText;
      findInp.oninput = () => { editingState.findText = findInp.value; };

      const replInp = el('input', 'grm-ed-step-input');
      replInp.type = 'text';
      replInp.placeholder = 'На что заменить (напр.: ваш Имя Фамилия / #Static)';
      replInp.value = editingState.replaceText;
      replInp.oninput = () => { editingState.replaceText = replInp.value; };

      const doReplBtn = el('button', 'mc-mini-btn', 'Заменить везде');
      doReplBtn.type = 'button';
      doReplBtn.onclick = () => {
        const needle = editingState.findText;
        if (!needle) {
          showToast('Укажите текст для поиска (например: Nick Name)');
          return;
        }
        let count = 0;
        for (const sub of draft.macros) {
          for (const st of sub.steps) {
            if (typeof st.rawText === 'string' && st.rawText.includes(needle)) {
              st.rawText = st.rawText.split(needle).join(editingState.replaceText);
              count++;
            }
          }
        }
        if (count > 0) {
          renderInlineEditor(m);
          showToast(`Заменено в ${count} шаг(ах)! Код GRM1 обновлён`);
        } else {
          showToast(`Текст «${needle}» не найден в шагах`);
        }
      };

      replaceBox.append(findInp, replInp, doReplBtn);
      builderCard.appendChild(replaceBox);

      // Sub-macro Tabs + "+ Добавить подмакрос"
      const tabsRow = el('div', 'grm-ed-tabs');
      draft.macros.forEach((sub, idx) => {
        const tBtn = el(
          'button',
          'grm-sub-tab' + (editingState.activeSubIdx === idx ? ' is-active' : ''),
          `${idx + 1}. ${sub.name || 'Без имени'} (${sub.steps.length})`
        );
        tBtn.type = 'button';
        tBtn.onclick = () => {
          editingState.activeSubIdx = idx;
          renderInlineEditor(m);
        };
        tabsRow.appendChild(tBtn);
      });

      const addSubBtn = el('button', 'grm-ed-add-sub', '＋ Новый подмакрос');
      addSubBtn.type = 'button';
      addSubBtn.onclick = () => {
        draft.kind = 'profile';
        draft.macros.push({
          name: `Макрос ${draft.macros.length + 1}`,
          hud: true,
          key: '',
          extraProps: {},
          steps: [
            { rawType: 'me', rawText: '', hasTextProp: true, waitKey: '', extraProps: {} }
          ]
        });
        editingState.activeSubIdx = draft.macros.length - 1;
        renderInlineEditor(m, 0);
      };
      tabsRow.appendChild(addSubBtn);
      builderCard.appendChild(tabsRow);

      // Active Sub-macro Editor
      const curIdx = editingState.activeSubIdx;
      const curSub = draft.macros[curIdx];

      const subHead = el('div', 'grm-ed-subhead');
      const subHeadLeft = el('div', 'grm-ed-subhead-left');

      const subNameInp = el('input', 'grm-ed-step-input');
      subNameInp.style.maxWidth = '240px';
      subNameInp.style.fontWeight = '700';
      subNameInp.type = 'text';
      subNameInp.maxLength = 60;
      subNameInp.placeholder = 'Название макроса (напр. Жетон)';
      subNameInp.value = curSub.name;
      subNameInp.oninput = () => {
        curSub.name = subNameInp.value;
        const activeTabBtn = tabsRow.querySelectorAll('.grm-sub-tab')[curIdx];
        if (activeTabBtn) {
          activeTabBtn.textContent = `${curIdx + 1}. ${curSub.name || 'Без имени'} (${curSub.steps.length})`;
        }
        refreshLiveEditorCodeOutput();
      };

      const hudLabel = el('label', 'grm-ed-hud-toggle');
      const hudChk = document.createElement('input');
      hudChk.type = 'checkbox';
      hudChk.checked = Boolean(curSub.hud);
      hudChk.onchange = () => {
        curSub.hud = hudChk.checked;
        refreshLiveEditorCodeOutput();
      };
      hudLabel.append(hudChk, el('span', '', 'Показывать в HUD'));
      subHeadLeft.append(subNameInp, hudLabel);

      const subTools = el('div', 'grm-ed-sub-tools');
      const moveLeftBtn = el('button', 'grm-ed-icon-btn', '←');
      moveLeftBtn.type = 'button';
      moveLeftBtn.title = 'Сдвинуть макрос влево';
      moveLeftBtn.disabled = curIdx === 0;
      moveLeftBtn.onclick = () => {
        const tmp = draft.macros[curIdx - 1];
        draft.macros[curIdx - 1] = draft.macros[curIdx];
        draft.macros[curIdx] = tmp;
        editingState.activeSubIdx = curIdx - 1;
        renderInlineEditor(m);
      };

      const moveRightBtn = el('button', 'grm-ed-icon-btn', '→');
      moveRightBtn.type = 'button';
      moveRightBtn.title = 'Сдвинуть макрос вправо';
      moveRightBtn.disabled = curIdx >= draft.macros.length - 1;
      moveRightBtn.onclick = () => {
        const tmp = draft.macros[curIdx + 1];
        draft.macros[curIdx + 1] = draft.macros[curIdx];
        draft.macros[curIdx] = tmp;
        editingState.activeSubIdx = curIdx + 1;
        renderInlineEditor(m);
      };

      const dupSubBtn = el('button', 'grm-ed-icon-btn', '⧉ Копия');
      dupSubBtn.type = 'button';
      dupSubBtn.title = 'Дублировать этот подмакрос';
      dupSubBtn.onclick = () => {
        draft.kind = 'profile';
        const copy = {
          name: `${curSub.name} (копия)`,
          hud: curSub.hud,
          key: curSub.key || '',
          extraProps: { ...(curSub.extraProps || {}) },
          steps: curSub.steps.map(s => ({
            rawType: s.rawType,
            rawText: s.rawText,
            hasTextProp: s.hasTextProp,
            waitKey: s.waitKey || '',
            extraProps: { ...(s.extraProps || {}) }
          }))
        };
        draft.macros.splice(curIdx + 1, 0, copy);
        editingState.activeSubIdx = curIdx + 1;
        renderInlineEditor(m);
      };

      const delSubBtn = el('button', 'grm-ed-icon-btn danger', '🗑 Удалить');
      delSubBtn.type = 'button';
      delSubBtn.disabled = draft.macros.length <= 1;
      delSubBtn.title = draft.macros.length <= 1 ? 'В профиле должен быть минимум 1 макрос' : 'Удалить этот подмакрос';
      delSubBtn.onclick = () => {
        if (draft.macros.length <= 1) return;
        draft.macros.splice(curIdx, 1);
        editingState.activeSubIdx = Math.max(0, curIdx - 1);
        renderInlineEditor(m);
      };

      subTools.append(moveLeftBtn, moveRightBtn, dupSubBtn, delSubBtn);
      subHead.append(subHeadLeft, subTools);
      builderCard.appendChild(subHead);

      // Steps List
      const stepsList = el('div', 'grm-ed-steps-list');
      let focusTargetInput = null;

      curSub.steps.forEach((st, sIdx) => {
        const row = el('div', 'grm-ed-step-row');
        row.appendChild(el('span', 'grm-ed-step-num', `#${sIdx + 1}`));

        const typeSel = el('select', 'grm-ed-type-select');
        const hasKnownOption = STEP_TYPE_OPTIONS.some(o => o.value === st.rawType);
        for (const optDef of STEP_TYPE_OPTIONS) {
          const o = el('option', '', optDef.label);
          o.value = optDef.value;
          if (st.rawType === optDef.value) o.selected = true;
          typeSel.appendChild(o);
        }
        if (!hasKnownOption) {
          const customOpt = el('option', '', `⚡ ${st.rawType} (системное)`);
          customOpt.value = st.rawType;
          customOpt.selected = true;
          typeSel.appendChild(customOpt);
        }

        typeSel.onchange = () => {
          const prevMode = getStepMode(st.rawType, Boolean(st.rawText));
          st.rawType = typeSel.value;
          const nextMode = getStepMode(st.rawType, false);
          if (nextMode === 'action') {
            st.rawText = '';
          } else if (nextMode === 'wait' && prevMode !== 'wait') {
            st.rawText = '1000';
            st.waitKey = 'ms';
          }
          renderInlineEditor(m, sIdx);
        };
        row.appendChild(typeSel);

        const mode = getStepMode(st.rawType, Boolean(st.rawText && st.rawText.trim()));
        if (mode === 'action') {
          const humanName = STEP_ACTION_NAMES[String(st.rawType).toLowerCase()] || `Системное действие «${st.rawType}»`;
          row.appendChild(el('div', 'grm-ed-action-note', `${humanName} — выполняется автоматически`));
        } else {
          const optInfo = STEP_TYPE_OPTIONS.find(o => o.value === st.rawType);
          const txtInp = el('input', 'grm-ed-step-input');
          txtInp.type = mode === 'wait' ? 'number' : 'text';
          if (mode === 'wait') {
            txtInp.min = '0';
            txtInp.step = '50';
          }
          txtInp.placeholder = optInfo?.placeholder || 'Введите текст отыгровки или команды...';
          txtInp.value = st.rawText || '';
          txtInp.oninput = () => {
            st.rawText = txtInp.value;
            refreshLiveEditorCodeOutput();
          };
          if (sIdx === focusStepIndex) {
            focusTargetInput = txtInp;
          }
          row.appendChild(txtInp);
        }

        const stepBtns = el('div', 'grm-ed-step-btns');
        const upBtn = el('button', 'grm-ed-icon-btn', '↑');
        upBtn.type = 'button';
        upBtn.title = 'Поднять шаг выше';
        upBtn.disabled = sIdx === 0;
        upBtn.onclick = () => {
          const tmp = curSub.steps[sIdx - 1];
          curSub.steps[sIdx - 1] = curSub.steps[sIdx];
          curSub.steps[sIdx] = tmp;
          renderInlineEditor(m);
        };

        const downBtn = el('button', 'grm-ed-icon-btn', '↓');
        downBtn.type = 'button';
        downBtn.title = 'Опустить шаг ниже';
        downBtn.disabled = sIdx >= curSub.steps.length - 1;
        downBtn.onclick = () => {
          const tmp = curSub.steps[sIdx + 1];
          curSub.steps[sIdx + 1] = curSub.steps[sIdx];
          curSub.steps[sIdx] = tmp;
          renderInlineEditor(m);
        };

        const delStepBtn = el('button', 'grm-ed-icon-btn danger', '✕');
        delStepBtn.type = 'button';
        delStepBtn.title = 'Удалить шаг';
        delStepBtn.disabled = curSub.steps.length <= 1;
        delStepBtn.onclick = () => {
          if (curSub.steps.length <= 1) return;
          curSub.steps.splice(sIdx, 1);
          renderInlineEditor(m);
        };

        stepBtns.append(upBtn, downBtn, delStepBtn);
        row.appendChild(stepBtns);
        stepsList.appendChild(row);
      });

      builderCard.appendChild(stepsList);

      // Quick Add Step Buttons
      const addBar = el('div', 'grm-ed-add-bar');
      addBar.appendChild(el('span', 'grm-ed-add-label', '+ Добавить шаг:'));
      const quickTypes = [
        { type: 'me', label: '+ /me' },
        { type: 'do', label: '+ /do' },
        { type: 'try', label: '+ /try' },
        { type: 'say', label: '+ Чат' },
        { type: 'megaphone', label: '+ Мегафон' },
        { type: 'search', label: '+ ⚡ search' },
        { type: 'arrest', label: '+ ⚡ arrest' },
        { type: 'fine', label: '+ ⚡ fine' }
      ];
      for (const qt of quickTypes) {
        const qb = el('button', 'grm-ed-quick-step', qt.label);
        qb.type = 'button';
        qb.onclick = () => {
          const isAct = getStepMode(qt.type, false) === 'action';
          curSub.steps.push({
            rawType: qt.type,
            rawText: '',
            hasTextProp: !isAct,
            waitKey: '',
            extraProps: {}
          });
          renderInlineEditor(m, curSub.steps.length - 1);
        };
        addBar.appendChild(qb);
      }
      builderCard.appendChild(addBar);
      wrap.appendChild(builderCard);

      // 4. Live Compiled Working GRM1 Code Preview
      const compiledNow = encodeGrmDraft(draft);
      editingState.macro_code = compiledNow;
      const totalStepsNow = draft.macros.reduce((s, sub) => s + sub.steps.length, 0);

      const liveOut = el('div', 'grm-ed-live-out');
      const liveHead = el('div', 'grm-ed-live-head');
      const statusSpan = el(
        'span',
        '',
        `● РАБОЧИЙ КОД GRM1 ГОТОВ · ${draft.macros.length} макр. · ${totalStepsNow} шаг. · ${compiledNow.length} симв.`
      );
      statusSpan.id = 'grmEditorLiveStatus';

      const liveBtns = el('div', 'mc-detail-badges');
      const copyLiveBtn = el('button', 'mc-inline-copy', '📋 Скопировать рабочий GRM1');
      copyLiveBtn.type = 'button';
      copyLiveBtn.onclick = () => {
        const freshCode = getLiveCompiledCodeFromState();
        copyText(freshCode, 'Рабочий код GRM1 скопирован! Можете сразу импортировать в макрос', m, true);
      };

      const dlLiveBtn = el('button', 'mc-inline-copy', '⬇ Скачать (.txt)');
      dlLiveBtn.type = 'button';
      dlLiveBtn.onclick = () => {
        const freshCode = getLiveCompiledCodeFromState();
        const freshGrm = parseGrmMacro(freshCode);
        downloadMacroFile(
          {
            ...m,
            title: editingState.title || m.title,
            macro_code: freshCode
          },
          freshGrm
        );
      };

      liveBtns.append(copyLiveBtn, dlLiveBtn);
      liveHead.append(statusSpan, liveBtns);

      const rawDiv = el('div', 'mc-grm-raw', compiledNow);
      rawDiv.id = 'grmEditorLiveRaw';
      liveOut.append(liveHead, rawDiv);
      wrap.appendChild(liveOut);

      if (focusTargetInput) {
        setTimeout(() => focusTargetInput.focus(), 15);
      }
    } else {
      // Raw Script / Config Editor + button to convert to GRM1 Builder
      const rawCard = el('div', 'grm-ed-card');
      const rawHead = el('div', 'grm-ed-section-title');
      rawHead.appendChild(el('span', '', '2. Код / конфигурация макроса'));
      const convertBtn = el('button', 'mc-mini-btn', '🛠 Переключить в конструктор GRM1');
      convertBtn.type = 'button';
      convertBtn.onclick = () => {
        editingState.grmDraft = createStarterGrmDraft(editingState.title || 'Профиль');
        renderInlineEditor(m, 0);
      };
      rawHead.appendChild(convertBtn);
      rawCard.appendChild(rawHead);

      const uuidF = el('div', 'mc-field');
      uuidF.style.marginBottom = '10px';
      uuidF.appendChild(el('label', '', 'UUID макроса (необязательно)'));
      const uuidI = el('input', 'mc-input');
      uuidI.type = 'text';
      uuidI.maxLength = 200;
      uuidI.value = editingState.macro_uuid;
      uuidI.oninput = () => {
        editingState.macro_uuid = uuidI.value;
        const detected = parseGrmMacro(uuidI.value);
        if (detected) {
          editingState.grmDraft = cloneGrmToDraft(detected);
          editingState.macro_uuid = '';
          renderInlineEditor(m);
        }
      };
      uuidF.appendChild(uuidI);
      rawCard.appendChild(uuidF);

      const codeF = el('div', 'mc-field');
      codeF.style.marginBottom = '0';
      codeF.appendChild(el('label', '', 'Код или скрипт макроса (или вставьте GRM1....)'));
      const codeTa = el('textarea', 'mc-textarea');
      codeTa.maxLength = 250000;
      codeTa.value = editingState.macro_code;
      codeTa.oninput = () => {
        editingState.macro_code = codeTa.value;
        const detected = parseGrmMacro(codeTa.value);
        if (detected) {
          editingState.grmDraft = cloneGrmToDraft(detected);
          renderInlineEditor(m);
          showToast('Формат GRM1 распознан — включён визуальный редактор шагов!');
        }
      };
      codeF.appendChild(codeTa);
      rawCard.appendChild(codeF);
      wrap.appendChild(rawCard);
    }

    // 5. Save / Publish Copy / Reset / Cancel Footer
    const footer = el('div', 'grm-ed-footer-actions');

    if (hasLocalOverride(m) && m.original_snapshot) {
      const resetBtn = el('button', 'mc-manage-btn danger', '↺ Сбросить к оригиналу');
      resetBtn.type = 'button';
      resetBtn.style.padding = '10px 14px';
      resetBtn.onclick = () => resetMacroOverride(m);
      footer.appendChild(resetBtn);
    }

    const cancelBtn = el('button', 'mc-cancel-btn', 'Отмена');
    cancelBtn.type = 'button';
    cancelBtn.onclick = () => {
      editingState = null;
      renderDetail(m, false);
    };

    const saveAsCopyBtn = el('button', 'mc-secondary-copy', '➕ Опубликовать как новый макрос');
    saveAsCopyBtn.type = 'button';
    saveAsCopyBtn.style.padding = '11px 16px';
    saveAsCopyBtn.style.fontSize = '13px';
    saveAsCopyBtn.onclick = () => saveEditedMacro(m, true);

    const saveMainBtn = el('button', 'mc-submit-btn', '💾 Сохранить изменения');
    saveMainBtn.type = 'button';
    saveMainBtn.onclick = () => saveEditedMacro(m, false);

    footer.append(cancelBtn, saveAsCopyBtn, saveMainBtn);
    wrap.appendChild(footer);

    panel.appendChild(wrap);
  }

  async function saveEditedMacro(m, asNewCopy = false) {
    if (!editingState) return;

    let finalCode = editingState.macro_code.trim();
    let finalUuid = editingState.macro_uuid.trim();

    if (editingState.grmDraft) {
      finalCode = encodeGrmDraft(editingState.grmDraft);
      const count = editingState.grmDraft.macros.length;
      const labelWord = count === 1 ? '1 макрос' : `${count} макросов`;
      finalUuid = `GRM${editingState.grmDraft.version || 1} · ${editingState.grmDraft.name || 'Профиль'} (${labelWord})`.slice(0, 180);
    }

    const parsedCheck = editingState.grmDraft ? parseGrmMacro(finalCode) : null;
    if (editingState.grmDraft && !parsedCheck) {
      showToast('Ошибка проверки кода GRM1 — проверьте поля макроса');
      return;
    }

    const title = (editingState.title.trim() || (parsedCheck ? `${parsedCheck.name} — Профиль макросов` : m.title || 'Макрос')).slice(0, 100);
    const category = CATEGORIES[editingState.category] ? editingState.category : 'other';
    const description = (editingState.description.trim() || (parsedCheck ? `Профиль ${parsedCheck.name}: ${parsedCheck.macroNames.join(', ')}` : m.description || 'Макрос игрока')).slice(0, 300);
    const hotkey = editingState.hotkey.trim().slice(0, 80);
    const tags = editingState.tags.trim().slice(0, 200);
    const fileName = parsedCheck
      ? `${slugifyFilename(parsedCheck.name || title)}.grm.txt`
      : (editingState.file_name || m.file_name || '');

    if (!finalCode && !finalUuid) {
      showToast('Макрос не может быть пустым');
      return;
    }

    const nowIso = new Date().toISOString();

    try {
      if (asNewCopy) {
        const payload = {
          macro_uuid: finalUuid.slice(0, 200),
          author_id: currentUser ? currentUser.id : null,
          author_name: (currentDisplayName || editingState.author_name || 'Аноним').slice(0, 40),
          category,
          title,
          description,
          hotkey,
          file_name: fileName.slice(0, 120),
          macro_code: finalCode,
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

        grmCache.clear();
        editingState = null;
        macros.unshift(createdRow);
        activeCategory = '';
        syncCategoryButtons();
        selectedId = String(createdRow.id);
        activeSubMacroIndex = -1;
        updateGlobalStats();
        renderAll(false);
        showToast('Опубликован новый рабочий макрос GRM1!');
        return;
      }

      // Update existing macro in-place
      const patch = {
        title,
        category,
        description,
        hotkey,
        file_name: fileName.slice(0, 120),
        macro_uuid: finalUuid.slice(0, 200),
        tags,
        macro_code: finalCode,
        updated_at: nowIso
      };

      if (!m.original_snapshot) {
        m.original_snapshot = {
          title: m.title,
          category: m.category,
          description: m.description,
          hotkey: m.hotkey,
          tags: m.tags,
          macro_uuid: m.macro_uuid,
          macro_code: m.macro_code,
          file_name: m.file_name,
          author_name: m.author_name
        };
      }

      let updatedRemotely = false;
      if (remoteAvailable && db && !m.is_builtin && canManageRemoteMacro(m)) {
        const dbPatch = { ...patch };
        delete dbPatch.updated_at;
        const res = await db.from('pedia_macros').update(dbPatch).eq('id', m.id).select().single();
        if (!res.error && res.data) {
          Object.assign(m, res.data);
          updatedRemotely = true;
        }
      }

      if (!updatedRemotely) {
        Object.assign(m, patch);
        const customList = loadLocalCustomMacros();
        const cIdx = customList.findIndex(x => String(x.id) === String(m.id));
        if (cIdx !== -1) {
          Object.assign(customList[cIdx], patch);
          saveLocalCustomMacros(customList);
        } else {
          // Persist customization override so built-in SAHP or catalog macro keeps changes across reloads
          const overrides = loadJsonMap(LOCAL_OVERRIDES_KEY);
          overrides[String(m.id)] = patch;
          saveJsonMap(LOCAL_OVERRIDES_KEY, overrides);
        }
      } else {
        const overrides = loadJsonMap(LOCAL_OVERRIDES_KEY);
        if (overrides[String(m.id)]) {
          delete overrides[String(m.id)];
          saveJsonMap(LOCAL_OVERRIDES_KEY, overrides);
        }
      }

      grmCache.clear();
      editingState = null;
      activeSubMacroIndex = -1;
      renderAll(false);
      showToast('Макрос сохранён! Код GRM1 пересобран и готов к импорту');
    } catch (err) {
      console.error(err);
      showToast('Ошибка сохранения: ' + (err.message || 'попробуйте ещё раз'));
    }
  }

  function resetMacroOverride(m) {
    if (!m || !m.original_snapshot) return;
    if (!confirm('Сбросить ваши изменения и вернуть исходный вариант макроса?')) return;
    const overrides = loadJsonMap(LOCAL_OVERRIDES_KEY);
    delete overrides[String(m.id)];
    saveJsonMap(LOCAL_OVERRIDES_KEY, overrides);
    Object.assign(m, m.original_snapshot);
    grmCache.clear();
    editingState = null;
    activeSubMacroIndex = -1;
    renderAll(false);
    showToast('Возвращён исходный вариант макроса');
  }

  // ==========================================================================
  // VIEWER: DECODED STEPS & DETAIL PANEL
  // ==========================================================================
  function renderGrmDecodedSection(grm, m) {
    const wrap = el('div', 'grm-decoded-box');

    const head = el('div', 'grm-decoded-head');
    const titleWrap = el('div', 'grm-decoded-title');
    titleWrap.append(
      el('span', 'grm-decoded-dot'),
      el(
        'span',
        '',
        grm.kind === 'profile'
          ? `РАСШИФРОВКА GRM v${grm.version} · ПРОФИЛЬ «${grm.name}» (${grm.macros.length} МАКРОСОВ · ${grm.totalSteps} ШАГОВ)`
          : `РАСШИФРОВКА GRM v${grm.version} · МАКРОС «${grm.name}» (${grm.totalSteps} ШАГОВ)`
      )
    );

    const headBtns = el('div', 'mc-detail-badges');

    const editStepsBtn = el('button', 'mc-manage-btn', '✎ Редактировать шаги');
    editStepsBtn.type = 'button';
    editStepsBtn.onclick = () => openInlineEditor(m);
    headBtns.appendChild(editStepsBtn);

    const jsonPre = el('pre', 'mc-script-value', grm.prettyJson);
    jsonPre.hidden = true;
    jsonPre.style.borderTop = '1px solid rgba(181, 201, 229, 0.1)';

    const toggleJsonBtn = el('button', 'mc-inline-copy', '{ } JSON');
    toggleJsonBtn.type = 'button';
    toggleJsonBtn.onclick = () => {
      jsonPre.hidden = !jsonPre.hidden;
      toggleJsonBtn.textContent = jsonPre.hidden ? '{ } JSON' : 'Скрыть JSON';
    };
    headBtns.appendChild(toggleJsonBtn);
    head.append(titleWrap, headBtns);
    wrap.appendChild(head);

    if (grm.macros.length > 1) {
      const filterBar = el('div', 'grm-filter-bar');

      const allBtn = el(
        'button',
        'grm-sub-tab' + (activeSubMacroIndex === -1 ? ' is-active' : ''),
        `Все (${grm.macros.length})`
      );
      allBtn.type = 'button';
      allBtn.onclick = () => {
        activeSubMacroIndex = -1;
        renderDetail(m, false);
      };
      filterBar.appendChild(allBtn);

      grm.macros.forEach((sub, idx) => {
        const b = el(
          'button',
          'grm-sub-tab' + (activeSubMacroIndex === idx ? ' is-active' : ''),
          `${idx + 1}. ${sub.name}`
        );
        b.type = 'button';
        b.onclick = () => {
          activeSubMacroIndex = idx;
          renderDetail(m, false);
        };
        filterBar.appendChild(b);
      });

      wrap.appendChild(filterBar);
    }

    const cardsList = el('div', 'grm-cards-list');
    grm.macros.forEach((sub, idx) => {
      if (activeSubMacroIndex !== -1 && activeSubMacroIndex !== idx) return;

      const card = el('div', 'grm-subcard');
      const cardHead = el('div', 'grm-subcard-head');

      const nameLeft = el('div', 'grm-subcard-name');
      nameLeft.append(
        el('span', 'grm-subcard-idx', String(idx + 1)),
        el('span', '', sub.name)
      );

      const rightBadges = el('div', 'mc-detail-badges');
      if (sub.key) {
        rightBadges.appendChild(el('span', 'mc-mini-chip', `⌨ ${sub.key}`));
      }
      if (sub.hud) {
        rightBadges.appendChild(el('span', 'grm-hud-badge', 'HUD'));
      }
      cardHead.append(nameLeft, rightBadges);
      card.appendChild(cardHead);

      const stepsBox = el('div', 'grm-steps');
      for (const st of sub.steps) {
        const row = el('div', 'grm-step');
        row.append(
          el('span', `grm-step-type ${st.cls}`, st.badge),
          el('span', 'grm-step-text' + (st.isAction ? ' is-action' : ''), st.text)
        );
        stepsBox.appendChild(row);
      }

      card.appendChild(stepsBox);
      cardsList.appendChild(card);
    });

    wrap.appendChild(cardsList);
    wrap.appendChild(jsonPre);
    return wrap;
  }

  function renderDetail(m, bumpDownloads = false) {
    const panel = $('macroDetailPanel');
    if (!panel) return;
    panel.replaceChildren();

    if (!m) {
      const empty = el('div', 'mc-empty-box');
      empty.append(
        el('strong', '', macros.length ? 'Выберите макрос слева' : 'Опубликуйте первый макрос'),
        el('p', '', 'Вставьте строку GRM1.... или создайте свой макрос в визуальном редакторе шагов.')
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
    const grm = getDecodedGrmForMacro(m);

    // 1. Header Row
    const top = el('div', 'mc-detail-top');
    const title = el('h1', 'mc-detail-title', m.title || 'МАКРОС');
    const badges = el('div', 'mc-detail-badges');

    const editBtn = el('button', 'mc-manage-btn', '✎ Редактировать макрос');
    editBtn.type = 'button';
    editBtn.onclick = () => openInlineEditor(m);
    badges.appendChild(editBtn);

    if (hasLocalOverride(m) && m.original_snapshot) {
      const resetSmallBtn = el('button', 'mc-manage-btn', '↺ Сброс');
      resetSmallBtn.type = 'button';
      resetSmallBtn.title = 'Вернуть исходный вариант макроса';
      resetSmallBtn.onclick = () => resetMacroOverride(m);
      badges.appendChild(resetSmallBtn);
    }

    if (canDeleteMacro(m)) {
      const delBtn = el('button', 'mc-manage-btn danger', '✕ Удалить');
      delBtn.type = 'button';
      delBtn.onclick = () => deleteMacro(m);
      badges.appendChild(delBtn);
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

    const pillsRow = el('div', 'mc-pills-row');
    if (grm) {
      pillsRow.appendChild(
        el('span', 'mc-mini-chip', `✓ GRM v${grm.version} · ${grm.macros.length} макр. · ${grm.totalSteps} шаг.`)
      );
    }
    if (hasLocalOverride(m)) {
      pillsRow.appendChild(el('span', 'mc-mini-chip', '✎ Отредактировано'));
    }
    if (m.hotkey) {
      pillsRow.appendChild(el('span', 'mc-mini-chip', `⌨ ${m.hotkey}`));
    }
    for (const t of tagParts) {
      pillsRow.appendChild(el('span', 'mc-mini-tag', t.startsWith('#') ? t : `#${t}`));
    }
    if (pillsRow.childNodes.length) {
      panel.appendChild(pillsRow);
    }

    const hasUuid = Boolean((m.macro_uuid || '').trim());
    const hasCode = Boolean((m.macro_code || '').trim());

    // 3. GRM1 Import String OR UUID Box
    if (grm) {
      const grmCodeBox = el('div', 'mc-code-box');
      const grmCodeHead = el('div', 'mc-code-head');
      grmCodeHead.appendChild(el('span', 'mc-code-label', 'РАБОЧИЙ КОД МАКРОСА (GRM1 · ДЛЯ ИМПОРТА)'));
      const copyGrmBtn = el('button', 'mc-inline-copy', '📋 Копировать GRM1');
      copyGrmBtn.type = 'button';
      copyGrmBtn.onclick = () => copyText(grm.rawToken, 'Код GRM1 скопирован для импорта!', m, true);
      grmCodeHead.appendChild(copyGrmBtn);
      grmCodeBox.append(grmCodeHead, el('div', 'mc-grm-raw', grm.rawToken));
      panel.appendChild(grmCodeBox);

      // 4. Automatic Visual Decoded Steps
      panel.appendChild(renderGrmDecodedSection(grm, m));
    } else {
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
    }

    // 5. Primary Action Bar: Download + Copy Code + Like + Favorite + Report
    const actionBar = el('div', 'mc-action-bar');

    const dlBtn = el('button', 'mc-primary-dl');
    dlBtn.type = 'button';
    dlBtn.append(
      el('span', '', '⬇'),
      el('span', '', grm ? 'Скачать макрос (.txt)' : (m.file_name ? `Скачать (${m.file_name})` : 'Скачать макрос'))
    );
    dlBtn.onclick = () => downloadMacroFile(m, grm);

    const copyMainBtn = el('button', 'mc-secondary-copy');
    copyMainBtn.type = 'button';
    copyMainBtn.append(el('span', '', '📋'), el('span', '', grm ? 'Скопировать GRM1 код' : 'Скопировать код'));
    copyMainBtn.onclick = () => {
      const toCopy = grm
        ? grm.rawToken
        : (hasUuid && !hasCode ? m.macro_uuid.trim() : (hasCode ? m.macro_code : (m.macro_uuid || '')));
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

    // 6. Bottom 2-Column Metadata Grid
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

    const formatCell = el('div', 'mc-meta-cell');
    formatCell.append(
      el('small', '', isModerator && Number(m.reports_count) > 0 ? 'ЖАЛОБ (МОДЕРАЦИЯ)' : 'ФОРМАТ / ЗАПУСК'),
      el('strong', '', isModerator && Number(m.reports_count) > 0
        ? `${m.reports_count} шт.`
        : (grm ? `GRM v${grm.version} (${m.hotkey || (grm.anyHud ? 'HUD меню' : 'Макрос')})` : (m.hotkey || 'Не указана')))
    );

    metaGrid.append(dlCell, likesCell, authorCell, createdCell, updatedCell, formatCell);
    panel.appendChild(metaGrid);
  }

  function persistLocalCountDelta(idStr, dlDelta, likeDelta) {
    const map = loadJsonMap(LOCAL_COUNTS_KEY);
    const cur = map[idStr] || { downloads: 0, likes: 0 };
    cur.downloads = Math.max(0, (Number(cur.downloads) || 0) + dlDelta);
    cur.likes = Math.max(0, (Number(cur.likes) || 0) + likeDelta);
    map[idStr] = cur;
    saveJsonMap(LOCAL_COUNTS_KEY, map);
  }

  async function incrementDownloadCounter(m) {
    const idStr = String(m.id);
    const now = Date.now();
    if (now - (lastDownloadClickAt.get(idStr) || 0) < 1000) return;
    lastDownloadClickAt.set(idStr, now);

    m.downloads_count = (Number(m.downloads_count) || 0) + 1;

    let savedRemotely = false;
    if (remoteAvailable && db) {
      try {
        const res = await db.rpc('pedia_increment_macro_download', { p_macro_id: m.id });
        if (!res.error && typeof res.data === 'number' && res.data > 0) {
          m.downloads_count = res.data;
          savedRemotely = true;
        }
      } catch (err) {
        console.warn('Download counter RPC fallback:', err);
      }
    }

    if (!savedRemotely) {
      if (m.is_builtin) {
        persistLocalCountDelta(idStr, 1, 0);
      } else {
        const customList = loadLocalCustomMacros();
        const idx = customList.findIndex(x => String(x.id) === idStr);
        if (idx !== -1) {
          customList[idx].downloads_count = m.downloads_count;
          saveLocalCustomMacros(customList);
        }
      }
    }

    updateGlobalStats();
    if (!editingState) {
      renderAll(true);
    } else {
      renderList(getFilteredAndSorted());
    }
  }

  function slugifyFilename(title) {
    const clean = String(title || 'nova-macro')
      .toLowerCase()
      .replace(/[^a-zа-яё0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);
    return clean || 'nova-macro';
  }

  async function downloadMacroFile(m, grm) {
    const hasCode = Boolean((m.macro_code || '').trim());
    let content = '';
    let downloadName = '';

    if (grm) {
      content = [
        grm.rawToken,
        '',
        '----------------------------------------',
        formatGrmPlainText(grm)
      ].join('\r\n');
      downloadName = `${slugifyFilename(grm.name || m.title)}.grm.txt`;
    } else if (hasCode && m.file_name) {
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

    let savedRemotely = false;
    if (remoteAvailable && db && !m.is_builtin) {
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
          savedRemotely = true;
        }
      } catch (err) {
        console.warn('Like RPC fallback:', err);
      }
    } else if (remoteAvailable && db && m.is_builtin) {
      try {
        const res = await db.rpc('pedia_toggle_macro_like', {
          p_macro_id: m.id,
          p_guest_delta: delta
        });
        if (!res.error && res.data && typeof res.data.likes_count === 'number' && res.data.likes_count > 0) {
          m.likes_count = res.data.likes_count;
          savedRemotely = true;
        }
      } catch {}
    }

    if (!savedRemotely) {
      if (m.is_builtin) {
        persistLocalCountDelta(idStr, 0, delta);
      } else {
        const customList = loadLocalCustomMacros();
        const idx = customList.findIndex(x => String(x.id) === idStr);
        if (idx !== -1) {
          customList[idx].likes_count = m.likes_count;
          saveLocalCustomMacros(customList);
        }
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
    if (!canDeleteMacro(m)) return;
    if (!confirm(`Удалить макрос «${m.title}» без возможности восстановления?`)) return;

    const idStr = String(m.id);
    if (m.is_builtin) {
      const delSet = loadJsonSet(LOCAL_DELETED_KEY);
      delSet.add(idStr);
      saveJsonSet(LOCAL_DELETED_KEY, delSet);
      if (remoteAvailable && db) {
        await db.from('pedia_macros').delete().eq('id', m.id).catch(() => {});
      }
    } else if (remoteAvailable && db) {
      const res = await db.from('pedia_macros').delete().eq('id', m.id);
      if (res.error) {
        showToast('Ошибка удаления: ' + res.error.message);
        return;
      }
    } else {
      const customList = loadLocalCustomMacros().filter(x => String(x.id) !== idStr);
      saveLocalCustomMacros(customList);
    }

    const overrides = loadJsonMap(LOCAL_OVERRIDES_KEY);
    if (overrides[idStr]) {
      delete overrides[idStr];
      saveJsonMap(LOCAL_OVERRIDES_KEY, overrides);
    }

    macros = macros.filter(x => String(x.id) !== idStr);
    if (String(selectedId) === idStr) selectedId = null;
    editingState = null;
    updateGlobalStats();
    renderAll(false);
    showToast('Макрос удалён');
  }

  // ==========================================================================
  // MODAL: LIVE GRM1 AUTO-RECOGNITION & CREATE TEMPLATE
  // ==========================================================================
  function updateLiveGrmRecognition(allowAutoFill = true) {
    const previewEl = $('grmLivePreview');
    if (!previewEl) return;

    const uuidVal = $('macroUuidInput').value.trim();
    if (/^GRM\d+\./.test(uuidVal) && !$('macroCodeInput').value.trim()) {
      $('macroCodeInput').value = uuidVal;
      $('macroUuidInput').value = '';
    }

    const codeVal = $('macroCodeInput').value.trim();
    const grm = parseGrmMacro(codeVal);

    if (!grm) {
      previewEl.hidden = true;
      previewEl.replaceChildren();
      return;
    }

    previewEl.hidden = false;
    previewEl.replaceChildren();

    const heading = el(
      'strong',
      '',
      grm.kind === 'profile'
        ? `✓ Макрос GRM v${grm.version} распознан: Профиль «${grm.name}» (${grm.macros.length} макросов · ${grm.totalSteps} шагов)`
        : `✓ Макрос GRM v${grm.version} распознан: «${grm.name}» (${grm.totalSteps} шагов)`
    );
    const subText = el(
      'div',
      '',
      'После публикации вы также сможете в любой момент нажать «✎ Редактировать макрос» и настроить любые шаги визуально.'
    );
    const chips = el('div', 'grm-live-chips');
    grm.macros.forEach((sub, idx) => {
      chips.appendChild(el('span', '', `${idx + 1}. ${sub.name} (${sub.steps.length})`));
    });

    const openVisualBtn = el('button', 'mc-mini-btn', '✎ Сразу перейти к визуальному редактированию шагов');
    openVisualBtn.type = 'button';
    openVisualBtn.style.marginTop = '9px';
    openVisualBtn.onclick = async () => {
      const fakeEvt = { preventDefault() {} };
      await handleFormSubmit(fakeEvt);
      const created = macros.find(x => String(x.id) === String(selectedId));
      if (created) {
        openInlineEditor(created);
      }
    };

    previewEl.append(heading, subText, chips, openVisualBtn);

    if (!allowAutoFill) return;

    const titleInput = $('macroTitleInput');
    if (!titleInput.value.trim() || autoFilledFields.has('title')) {
      titleInput.value = grm.kind === 'profile'
        ? `${grm.name} — Профиль макросов`
        : grm.name;
      autoFilledFields.add('title');
    }

    const descInput = $('macroDescInput');
    if (!descInput.value.trim() || autoFilledFields.has('desc')) {
      const namesPreview = grm.macroNames.join(', ');
      descInput.value = (grm.kind === 'profile'
        ? `Готовый профиль ${grm.name} (${grm.macros.length} макросов): ${namesPreview}`
        : `Готовый макрос ${grm.name} (${grm.totalSteps} шагов)`
      ).slice(0, 300);
      autoFilledFields.add('desc');
    }

    const tagsInput = $('macroTagsInput');
    if (!tagsInput.value.trim() || autoFilledFields.has('tags')) {
      const tagList = [grm.name, ...grm.macroNames].filter(Boolean);
      tagsInput.value = Array.from(new Set(tagList)).join(', ').slice(0, 200);
      autoFilledFields.add('tags');
    }

    const hkInput = $('macroHotkeyInput');
    if ((!hkInput.value.trim() || autoFilledFields.has('hotkey')) && grm.anyHud) {
      hkInput.value = 'HUD меню';
      autoFilledFields.add('hotkey');
    }

    const guessedCat = guessCategoryFromGrm(grm);
    if (guessedCat && (!autoFilledFields.has('cat_manual'))) {
      $('macroCatInput').value = guessedCat;
    }
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
    autoFilledFields.clear();
    refreshAuthorBanner();
    $('macroModalTitle').textContent = 'Предложить макрос';
    $('saveMacroSubmitBtn').textContent = 'Опубликовать макрос';
    $('editMacroId').value = '';
    $('macroSubmitForm').reset();
    $('macroFileNameInput').value = '';
    $('macroAuthorInput').value = currentDisplayName || 'Аноним';
    $('macroCatInput').value = activeCategory || 'government';
    $('macroUuidInput').value = '';
    $('grmLivePreview').hidden = true;
    $('macroModalBackdrop').hidden = false;
    setTimeout(() => $('macroCodeInput').focus(), 30);
  }

  function closeModal() {
    $('macroModalBackdrop').hidden = true;
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    const saveBtn = $('saveMacroSubmitBtn');
    saveBtn.disabled = true;

    try {
      let macroUuid = $('macroUuidInput').value.trim();
      let macroCode = $('macroCodeInput').value.trim();

      if (/^GRM\d+\./.test(macroUuid) && !macroCode) {
        macroCode = macroUuid;
        macroUuid = '';
      }

      const grm = parseGrmMacro(macroCode);
      if (grm && !macroUuid) {
        macroUuid = `GRM${grm.version} · ${grm.name} (${grm.macros.length})`.slice(0, 180);
      }
      macroUuid = macroUuid.slice(0, 200);

      const title = ($('macroTitleInput').value.trim() || (grm ? `${grm.name} — Профиль макросов` : '')).slice(0, 100);
      const category = $('macroCatInput').value;
      const description = ($('macroDescInput').value.trim() || (grm ? `Профиль ${grm.name}: ${grm.macroNames.join(', ')}` : '')).slice(0, 300);
      const authorName = ($('macroAuthorInput').value.trim() || currentDisplayName || 'Аноним').slice(0, 40);
      const hotkey = $('macroHotkeyInput').value.trim().slice(0, 80);
      const tags = $('macroTagsInput').value.trim().slice(0, 200);
      const fileName = $('macroFileNameInput').value.trim().slice(0, 120) || (grm ? `${slugifyFilename(grm.name || title)}.grm.txt` : '');

      if (title.length < 2 || description.length < 2) {
        showToast('Укажите название и краткое описание макроса');
        return;
      }

      if (!macroUuid && !macroCode) {
        showToast('Вставьте код GRM1...., конфигурацию макроса или нажмите «Создать шаблон GRM1»');
        return;
      }

      const nowIso = new Date().toISOString();

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
      activeSubMacroIndex = -1;
      editingState = null;
      closeModal();
      updateGlobalStats();
      renderAll(false);
      showToast('Макрос опубликован! Можете редактировать его шаги в любое время');
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

    $('macroTitleInput').addEventListener('input', () => autoFilledFields.delete('title'));
    $('macroDescInput').addEventListener('input', () => autoFilledFields.delete('desc'));
    $('macroTagsInput').addEventListener('input', () => autoFilledFields.delete('tags'));
    $('macroHotkeyInput').addEventListener('input', () => autoFilledFields.delete('hotkey'));
    $('macroCatInput').addEventListener('change', () => autoFilledFields.add('cat_manual'));

    $('macroCodeInput').addEventListener('input', () => updateLiveGrmRecognition(true));
    $('macroUuidInput').addEventListener('input', () => updateLiveGrmRecognition(true));

    const initBuilderBtn = $('initGrmBuilderBtn');
    if (initBuilderBtn) {
      initBuilderBtn.addEventListener('click', () => {
        const starter = createStarterGrmDraft($('macroTitleInput').value.trim() || 'Мой профиль');
        $('macroCodeInput').value = encodeGrmDraft(starter);
        updateLiveGrmRecognition(true);
        showToast('Создан рабочий шаблон GRM1 — после публикации откройте «Редактировать макрос» для добавления шагов!');
      });
    }

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
      updateLiveGrmRecognition(true);
      if (!$('macroTitleInput').value.trim()) {
        $('macroTitleInput').value = file.name.replace(/\.[^.]+$/, '').slice(0, 80);
      }
      showToast(`Файл «${file.name}» загружен`);
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
