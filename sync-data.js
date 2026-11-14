/* Codec de progresso: registros pequenos; atividade diária separada por aparelho. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HablaSyncData = api;
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';
  const MAIN = 'habla_espanol_2026_v1',
    BOOK = 'frecuencias.a1.caderno.v2';
  const LAB = 'habla.lab.v1',
    COACH = 'habla.coach.v1',
    RESUME = 'habla.resume.v1';
  const KEYS = [MAIN, BOOK, LAB, COACH, RESUME];
  const maps = ['progress', 'favorites', 'verbProgress'];
  const counters = ['activity', 'verbActivity', 'workbookActivity', 'scenarioActivity'];
  const bookMaps = ['answers', 'results', 'review', 'notes'];
  const labPrefs = ['units', 'mode', 'count', 'translations'];
  const coachPrefs = [
    'units',
    'diagnosticLength',
    'sceneFilter',
    'sceneId',
    'convoLevel',
    'convoPractice',
    'showTranslations',
  ];
  const kinds = [
    ...maps,
    ...counters,
    'custom',
    'doubts',
    'preferences',
    ...bookMaps.map((k) => 'book.' + k),
    'book.last',
    'lab.results',
    'lab.sessions',
    'lab.preferences',
    'coach.results',
    'coach.conversations',
    'coach.preferences',
    'resume',
  ];
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const id = (kind, key) => encodeURIComponent(kind + ':' + key);
  const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const object = (value) => value && typeof value === 'object' && !Array.isArray(value);
  const safe = (value) => {
    if (!value || typeof value !== 'object') return true;
    return Object.keys(value).every(
      (key) => !['__proto__', 'prototype', 'constructor'].includes(key) && safe(value[key])
    );
  };
  const hash = (text) => {
    let n = 2166136261;
    for (const c of text) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
    return (n >>> 0).toString(36);
  };
  function record(kind, key, value, deleted = false) {
    return { kind, key: String(key), payload: JSON.stringify(deleted ? null : value), deleted };
  }
  function valid(row, documentId) {
    if (
      !row ||
      !kinds.includes(row.kind) ||
      typeof row.key !== 'string' ||
      !row.key ||
      ['__proto__', 'constructor', 'prototype'].includes(row.key) ||
      new TextEncoder().encode(documentId).length > 1400 ||
      typeof row.payload !== 'string' ||
      row.payload.length > 200000 ||
      typeof row.deleted !== 'boolean' ||
      id(row.kind, row.key) !== documentId
    )
      return false;
    try {
      const value = JSON.parse(row.payload);
      if (!safe(value)) return false;
      if (row.deleted) return value === null;
      if (row.kind === 'preferences')
        return (
          ['theme', 'dailyGoal', 'voiceSpeed'].includes(row.key) &&
          (typeof value === 'string' || typeof value === 'number')
        );
      if (row.kind === 'lab.preferences') return labPrefs.includes(row.key);
      if (row.kind === 'coach.preferences') return coachPrefs.includes(row.key);
      if (counters.includes(row.kind))
        return (
          /^\d{4}-\d{2}-\d{2}@[A-Za-z0-9_-]+$/.test(row.key) &&
          object(value) &&
          Object.entries(value).every(
            ([key, count]) =>
              ['attempts', 'good', 'hard'].includes(key) &&
              Number.isSafeInteger(count) &&
              count >= 0
          )
        );
      if (['favorites', 'book.review'].includes(row.kind)) return typeof value === 'boolean';
      if (row.kind === 'book.notes') return typeof value === 'string';
      if (row.kind === 'book.last') return value === null || typeof value === 'string';
      if (row.kind === 'book.answers') return object(value) || Array.isArray(value);
      return object(value);
    } catch (_) {
      return false;
    }
  }
  function flat(snapshot) {
    const out = {},
      main = snapshot[MAIN] || {},
      book = snapshot[BOOK] || {},
      lab = snapshot[LAB] || {},
      coach = snapshot[COACH] || {};
    const put = (kind, key, value) => {
      if (value !== undefined) out[id(kind, String(key))] = record(kind, key, value);
    };
    for (const kind of maps)
      for (const [key, value] of Object.entries(main[kind] || {})) put(kind, key, value);
    for (const kind of ['custom', 'doubts'])
      for (const value of main[kind] || []) if (value?.id) put(kind, value.id, value);
    for (const key of ['dailyGoal', 'theme', 'voiceSpeed']) put('preferences', key, main[key]);
    for (const kind of bookMaps)
      for (const [key, value] of Object.entries(book[kind] || {})) put('book.' + kind, key, value);
    put('book.last', 'current', book.last);
    for (const [key, value] of Object.entries(lab.results || {})) put('lab.results', key, value);
    const occurrences = {};
    for (const value of lab.sessions || []) {
      const signature = value.id || 'legacy-' + hash(JSON.stringify(value));
      const number = (occurrences[signature] = (occurrences[signature] || 0) + 1);
      put('lab.sessions', signature + (value.id ? '' : '-' + number), value);
    }
    for (const key of labPrefs) put('lab.preferences', key, lab[key]);
    for (const value of coach.results || []) if (value.id) put('coach.results', value.id, value);
    for (const value of coach.conversationHistory || [])
      if (value.id) put('coach.conversations', value.id, value);
    for (const key of coachPrefs) put('coach.preferences', key, coach[key]);
    if (snapshot[RESUME]) put('resume', 'current', snapshot[RESUME]);
    return out;
  }
  function evolve(previous, snapshot, deviceId) {
    const next = flat(snapshot),
      old = previous.records || {},
      before = previous.values?.[MAIN] || {},
      main = snapshot[MAIN] || {};
    // Cada aparelho incrementa sua própria contribuição. Reconectar não soma o mesmo treino duas vezes.
    for (const [key, value] of Object.entries(old))
      if (counters.includes(value.kind)) next[key] = value;
    for (const kind of counters) {
      const dates = new Set([...Object.keys(before[kind] || {}), ...Object.keys(main[kind] || {})]);
      for (const day of dates) {
        const a = before[kind]?.[day] || {},
          b = main[kind]?.[day] || {};
        if (equal(a, b)) continue;
        const fields = new Set([...Object.keys(a), ...Object.keys(b)]);
        const decreased = [...fields].some((f) => Number(b[f] || 0) < Number(a[f] || 0));
        if (decreased)
          for (const [key, value] of Object.entries(next))
            if (value.kind === kind && value.key.startsWith(day + '@'))
              next[key] = record(kind, value.key, null, true);
        const key = day + '@' + deviceId,
          docId = id(kind, key);
        const contribution =
          !decreased && next[docId] && !next[docId].deleted ? JSON.parse(next[docId].payload) : {};
        for (const field of fields)
          contribution[field] = decreased
            ? Number(b[field] || 0)
            : Number(contribution[field] || 0) +
              Math.max(0, Number(b[field] || 0) - Number(a[field] || 0));
        if (Object.values(contribution).some(Number)) next[docId] = record(kind, key, contribution);
      }
    }
    for (const [key, value] of Object.entries(old))
      if (!next[key]) next[key] = record(value.kind, value.key, null, true);
    const dirty = { ...previous.dirty },
      records = {},
      revision = (previous.revision || 0) + 1;
    for (const [key, value] of Object.entries(next)) {
      if (!valid(value, key))
        throw Error('Registro de estudo inválido ou grande demais. Exporte um backup.');
      records[key] = value;
      if (!equal(old[key], value)) dirty[key] = revision;
    }
    return { ...previous, values: clone(snapshot), records, dirty, revision };
  }
  function seed(uid, snapshot, deviceId) {
    const empty = {
      schema: 1,
      uid,
      values: {},
      records: {},
      dirty: {},
      revision: 0,
      needsBootstrap: true,
    };
    return evolve(empty, snapshot, deviceId);
  }
  function inflate(records, previous = {}) {
    const snapshot = clone(previous),
      main = (snapshot[MAIN] ||= {}),
      book = (snapshot[BOOK] ||= {}),
      lab = (snapshot[LAB] ||= {}),
      coach = (snapshot[COACH] ||= {});
    for (const kind of [...maps, ...counters]) main[kind] = {};
    main.custom = [];
    main.doubts = [];
    for (const key of ['dailyGoal', 'theme', 'voiceSpeed']) delete main[key];
    for (const kind of bookMaps) book[kind] = {};
    delete book.last;
    lab.results = {};
    lab.sessions = [];
    coach.results = [];
    coach.conversationHistory = [];
    for (const key of labPrefs) delete lab[key];
    for (const key of coachPrefs) delete coach[key];
    delete snapshot[RESUME];
    for (const [docId, row] of Object.entries(records)) {
      if (!valid(row, docId))
        throw Error('Registro da conta inválido; seus dados locais foram preservados.');
      if (row.deleted) continue;
      const value = JSON.parse(row.payload),
        { kind, key } = row;
      if (maps.includes(kind)) main[kind][key] = value;
      else if (counters.includes(kind)) {
        const day = key.split('@')[0],
          target = (main[kind][day] ||= {});
        for (const [field, count] of Object.entries(value))
          target[field] = (target[field] || 0) + Number(count || 0);
      } else if (kind === 'custom' || kind === 'doubts') main[kind].push(value);
      else if (kind === 'preferences') main[key] = value;
      else if (kind.startsWith('book.')) {
        const field = kind.slice(5);
        if (field === 'last') book.last = value;
        else book[field][key] = value;
      } else if (kind === 'lab.results') lab.results[key] = value;
      else if (kind === 'lab.sessions') lab.sessions.push(value);
      else if (kind === 'lab.preferences') lab[key] = value;
      else if (kind === 'coach.results') coach.results.push(value);
      else if (kind === 'coach.conversations') coach.conversationHistory.push(value);
      else if (kind === 'coach.preferences') coach[key] = value;
      else if (kind === 'resume') snapshot[RESUME] = value;
    }
    for (const list of [coach.results, coach.conversationHistory])
      list.sort(
        (a, b) =>
          String(a.date).localeCompare(String(b.date)) || String(a.id).localeCompare(String(b.id))
      );
    lab.sessions.sort(
      (a, b) =>
        String(a.date).localeCompare(String(b.date)) ||
        String(a.id || '').localeCompare(String(b.id || ''))
    );
    return snapshot;
  }
  function merge(profile, remote) {
    const records = { ...remote };
    for (const key of Object.keys(profile.dirty))
      if (profile.records[key]) records[key] = profile.records[key];
    return { ...profile, records, values: inflate(records, profile.values) };
  }
  return {
    MAIN,
    BOOK,
    LAB,
    COACH,
    RESUME,
    KEYS,
    kinds,
    counters,
    id,
    valid,
    flat,
    seed,
    evolve,
    inflate,
    merge,
    clone,
  };
});
