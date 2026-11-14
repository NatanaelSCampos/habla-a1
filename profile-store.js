/* Perfis locais isolados. As chaves antigas continuam sendo o perfil sem conta. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports)
    module.exports = factory(require('./sync-data.js'));
  else
    root.HablaStore = factory(root.HablaSyncData).create(localStorage, (detail) =>
      root.dispatchEvent(new CustomEvent('habla:store', { detail }))
    );
})(typeof window === 'object' ? window : globalThis, function (codec) {
  'use strict';
  const ACTIVE = 'habla.profile.active.v1',
    DEVICE = 'habla.device.v1';
  const safeUid = (uid) => typeof uid === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(uid);
  const profileKey = (uid) => {
    if (!safeUid(uid)) throw Error('Conta inválida.');
    return 'habla.profile.' + uid + '.v1';
  };
  function create(storage, emit = () => {}, makeId = () => globalThis.crypto.randomUUID()) {
    let active = storage.getItem(ACTIVE) || null;
    if (active && !safeUid(active)) active = null;
    function load(uid = active) {
      if (!uid) return null;
      const raw = storage.getItem(profileKey(uid));
      if (!raw) return null;
      const value = JSON.parse(raw);
      if (
        value.schema !== 1 ||
        value.uid !== uid ||
        !value.values ||
        !value.records ||
        !value.dirty
      )
        throw Error('O histórico desta conta precisa de recuperação. Exporte um backup.');
      return value;
    }
    function commit(value) {
      storage.setItem(profileKey(value.uid), JSON.stringify(value));
    }
    function device() {
      let value = storage.getItem(DEVICE);
      if (!value) {
        value = makeId();
        storage.setItem(DEVICE, value);
      }
      return value;
    }
    function guest() {
      return Object.fromEntries(
        codec.KEYS.map((key) => {
          const raw = storage.getItem(key);
          return [key, raw ? JSON.parse(raw) : null];
        })
      );
    }
    function getItem(key) {
      if (!active || !codec.KEYS.includes(key)) return storage.getItem(key);
      const value = load()?.values[key];
      return value == null ? null : JSON.stringify(value);
    }
    function setItem(key, raw) {
      if (!active || !codec.KEYS.includes(key)) {
        storage.setItem(key, raw);
        emit({ key, uid: null });
        return;
      }
      const current = load();
      if (!current) throw Error('Perfil local indisponível.');
      const values = { ...current.values, [key]: JSON.parse(raw) };
      commit(codec.evolve(current, values, device()));
      emit({ key, uid: active });
    }
    function removeItem(key) {
      if (!active || !codec.KEYS.includes(key)) {
        storage.removeItem(key);
        emit({ key, uid: null });
      } else setItem(key, 'null');
    }
    function activate(uid) {
      if (uid && !load(uid)) throw Error('A conta ainda não possui um histórico local.');
      if (uid) storage.setItem(ACTIVE, uid);
      else storage.removeItem(ACTIVE);
      active = uid || null;
      emit({ profileChanged: true, uid: active });
    }
    function initialize(uid, snapshot, details = {}) {
      if (load(uid)) throw Error('O histórico desta conta já existe neste aparelho.');
      const profile = codec.seed(uid, snapshot, device());
      profile.details = details;
      commit(profile);
      return profile;
    }
    function apply(uid, records) {
      const profile = load(uid);
      if (!profile) throw Error('Perfil ausente.');
      const merged = codec.merge(profile, records);
      commit(merged);
      if (active === uid) emit({ remote: true, uid });
      return merged;
    }
    function acknowledge(uid, entries) {
      const current = load(uid);
      if (!current) return;
      for (const entry of entries)
        if (current.dirty[entry.id] === entry.revision) delete current.dirty[entry.id];
      commit(current);
    }
    function ready(uid) {
      const value = load(uid);
      value.needsBootstrap = false;
      commit(value);
    }
    function snapshot() {
      return Object.fromEntries(
        codec.KEYS.map((key) => {
          const raw = getItem(key);
          return [key, raw ? JSON.parse(raw) : null];
        })
      );
    }
    function replace(values) {
      // Uma gravação por conta evita um backup parcialmente importado.
      if (active) {
        commit(codec.evolve(load(), values, device()));
        emit({ uid: active, remote: false });
        return;
      }
      const before = guest();
      try {
        for (const key of codec.KEYS) {
          if (values[key] == null) storage.removeItem(key);
          else storage.setItem(key, JSON.stringify(values[key]));
        }
      } catch (error) {
        for (const key of codec.KEYS) {
          if (before[key] == null) storage.removeItem(key);
          else storage.setItem(key, JSON.stringify(before[key]));
        }
        throw error;
      }
      emit({ uid: null });
    }
    function archive(reason) {
      const value = { reason, at: new Date().toISOString(), uid: active, values: snapshot() };
      const archives = JSON.parse(storage.getItem('habla.recovery.v1') || '[]');
      archives.push(value);
      storage.setItem('habla.recovery.v1', JSON.stringify(archives.slice(-3)));
      return value;
    }
    function refresh() {
      const uid = storage.getItem(ACTIVE) || null;
      active = safeUid(uid) ? uid : null;
    }
    if (active && !load(active)) {
      active = null;
      storage.removeItem(ACTIVE);
    }
    return {
      getItem,
      setItem,
      removeItem,
      activate,
      initialize,
      apply,
      acknowledge,
      ready,
      snapshot,
      guest,
      load,
      archive,
      replace,
      refresh,
      active: () => active,
      device,
      profileKey,
      codec,
    };
  }
  return { create, profileKey };
});
