/* Liga os módulos existentes ao perfil escolhido, sem interromper respostas em andamento. */
(function () {
  'use strict';
  const store = window.HablaStore,
    codec = window.HablaSyncData;
  const initialUI = codec.clone(ui);
  let suspended = false,
    timer = null,
    lastSaved = '',
    offered = null;
  function reload(reset = false) {
    data = Object.assign(
      {
        progress: {},
        favorites: {},
        activity: {},
        scenarioActivity: {},
        custom: [],
        doubts: [],
        doubtDraft: null,
        doubtQuickDraft: null,
        verbProgress: {},
        verbActivity: {},
        workbookActivity: {},
        theme: 'light',
        dailyGoal: 8,
        voiceSpeed: 0.88,
      },
      loadStore()
    );
    wb = loadWB();
    window.HablaLab?.reload(!reset);
    window.HablaCoach?.reload(!reset);
    if (reset) {
      window.HablaDoubts?.closeQuick();
      window.HablaDoubts?.reload();
      ui = codec.clone(initialUI);
      window.HablaAudio?.stop();
    }
    document.documentElement.dataset.theme = data.theme === 'dark' ? 'dark' : 'light';
    if (reset) render();
    else renderChrome();
    window.HablaAccounts?.refresh();
  }
  function restore(checkpoint) {
    if (
      checkpoint?.schema !== 1 ||
      !Object.hasOwn(initialUI, 'page') ||
      !Object.hasOwn(checkpoint.ui || {}, 'page')
    )
      return;
    suspended = true;
    try {
      for (const key of Object.keys(initialUI))
        if (Object.hasOwn(checkpoint.ui, key)) ui[key] = checkpoint.ui[key];
      ui.listening = false;
      window.HablaLab.restore(checkpoint.lab);
      window.HablaCoach.restore(checkpoint.coach);
      render();
      for (const [id, value] of Object.entries(checkpoint.fields || {})) {
        const node = document.getElementById(id);
        if (node && ['INPUT', 'TEXTAREA'].includes(node.tagName) && node.type !== 'password')
          node.value = value;
      }
      lastSaved = JSON.stringify(checkpoint);
      offered = null;
      notice();
    } finally {
      suspended = false;
    }
  }
  function notice() {
    let node = document.getElementById('resumeNotice');
    if (!node) {
      node = document.createElement('div');
      node.id = 'resumeNotice';
      node.className = 'resume-notice';
      document.getElementById('app').before(node);
    }
    node.hidden = !offered;
    node.innerHTML = offered
      ? '<span>Há uma atividade salva na sua conta.</span><button class="btn secondary sm" data-sync-resume>Continuar atividade</button><button class="icon-btn" data-sync-dismiss aria-label="Fechar aviso">×</button>'
      : '';
  }
  function capture() {
    if (suspended) return;
    const lab = window.HablaLab.checkpoint();
    const answer = document.getElementById('labAnswer');
    if (lab && answer) lab.answer = answer.value;
    const fields = {};
    for (const node of document.querySelectorAll(
      '#app input[id]:not([type="password"]),#app textarea[id]'
    )) {
      if (['text', 'search', 'textarea'].includes(node.type)) fields[node.id] = node.value;
    }
    const checkpoint = {
      schema: 1,
      ui: { ...ui, listening: false },
      lab,
      coach: window.HablaCoach.checkpoint(),
      fields,
    };
    const raw = JSON.stringify(checkpoint);
    if (raw === lastSaved) return;
    try {
      store.setItem(codec.RESUME, raw);
      lastSaved = raw;
    } catch (_) {
      toast('Não foi possível guardar a atividade atual. Faça um backup.');
    }
  }
  function schedule() {
    if (suspended) return;
    clearTimeout(timer);
    timer = setTimeout(capture, 1800);
  }
  window.addEventListener('habla:render', schedule);
  document.addEventListener('input', (event) => {
    if (event.target.closest('#app')) schedule();
  });
  document.addEventListener('change', (event) => {
    if (event.target.closest('#app')) schedule();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') capture();
  });
  window.addEventListener('pagehide', capture);
  window.addEventListener('habla:store', (event) => {
    const detail = event.detail || {};
    if (!detail.remote && !detail.profileChanged) return;
    clearTimeout(timer);
    suspended = true;
    try {
      reload(!!detail.profileChanged);
      const checkpoint = store.snapshot()[codec.RESUME];
      if (detail.profileChanged) {
        lastSaved = '';
        offered = null;
        if (checkpoint) restore(checkpoint);
      } else if (checkpoint && JSON.stringify(checkpoint) !== lastSaved) {
        offered = checkpoint;
        notice();
      }
    } finally {
      suspended = false;
    }
  });
  window.addEventListener('storage', (event) => {
    if (event.key === 'habla.profile.active.v1') {
      store.refresh();
      window.dispatchEvent(new CustomEvent('habla:store', { detail: { profileChanged: true } }));
    } else if (
      (store.active() && event.key === store.profileKey(store.active())) ||
      (!store.active() && codec.KEYS.includes(event.key))
    ) {
      window.dispatchEvent(new CustomEvent('habla:store', { detail: { remote: true } }));
    }
  });
  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-sync-resume]') && offered) {
      capture();
      restore(offered);
      capture();
    }
    if (event.target.closest('[data-sync-dismiss]')) {
      offered = null;
      notice();
    }
  });
  window.HablaApp = {
    reload,
    checkpoint: capture,
    downloadGuestBackup: () => downloadBackup(store.guest()),
  };
  const previous = store.snapshot()[codec.RESUME];
  if (previous) restore(previous);
})();
