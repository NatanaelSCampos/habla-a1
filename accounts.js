/* Apresentação das contas no primeiro acesso; fila persistente offline com Firebase. */
(function () {
  'use strict';
  const store = window.HablaStore,
    codec = window.HablaSyncData;
  const config = window.HABLA_FIREBASE_CONFIG;
  const configured = !!(config?.apiKey && config?.authDomain && config?.projectId && config?.appId);
  const WELCOME_KEY = 'habla.account.welcome.v1';
  let welcomePending = configured && localStorage.getItem(WELCOME_KEY) !== 'done';
  const background = new Map();
  let api,
    auth,
    db,
    user = null,
    unsubscribe = null,
    epoch = 0,
    initializing = false;
  const flushing = new Set();
  let phase = configured ? 'loading' : 'unconfigured',
    message = '',
    opened = false,
    register = false,
    migration = null;
  const esc = (value) =>
    String(value ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
    );
  const online = () => navigator.onLine !== false;
  const collectionRef = (uid) => api.collection(db, 'users', uid, 'records');
  const metaRef = (uid) => api.doc(db, 'users', uid, 'meta', 'profile');
  function welcomeReady() {
    const uid = store.active();
    return !!uid && (user?.uid === uid || (!online() && !!store.load(uid)));
  }
  function lockWelcome() {
    document.body.classList.toggle('account-welcome-open', welcomePending && opened);
    if (welcomePending && opened) {
      for (const node of document.body.children) {
        if (
          node.id === 'accountsRoot' ||
          node.id === 'toast' ||
          ['SCRIPT', 'STYLE', 'LINK'].includes(node.tagName)
        )
          continue;
        if (!background.has(node)) background.set(node, node.inert);
        node.inert = true;
      }
    } else {
      for (const [node, inert] of background) node.inert = inert;
      background.clear();
    }
  }
  function finishWelcome() {
    if (!welcomePending || !welcomeReady()) return;
    try {
      localStorage.setItem(WELCOME_KEY, 'done');
    } catch (_) {
      toast('Não foi possível guardar sua preferência neste aparelho.');
    }
    welcomePending = false;
    close();
  }
  function label() {
    if (phase === 'error') return 'Sincronização pendente';
    if (phase === 'migration') return 'Escolha seu histórico';
    if (!store.active()) return 'Salvo neste aparelho';
    const profile = store.load();
    if (!online()) return 'Salvo aqui · sem conexão';
    if (Object.keys(profile?.dirty || {}).length) return 'Salvo aqui · envio pendente';
    return phase === 'syncing' || phase === 'loading' ? 'Sincronizando…' : 'Estudos sincronizados';
  }
  function paint() {
    const indicator = document.getElementById('syncIndicator');
    if (indicator) indicator.textContent = label();
    const button = document.getElementById('accountButton');
    if (button) {
      button.textContent = store.active() ? 'Minha conta' : 'Entrar';
      button.setAttribute(
        'aria-label',
        store.active()
          ? 'Abrir minha conta e sincronização'
          : 'Entrar para sincronizar seus estudos'
      );
    }
    for (const node of document.querySelectorAll('[data-sync-label]')) node.textContent = label();
  }
  function update(next, text = '') {
    phase = next;
    message = text;
    paint();
    if (opened) dialog();
  }
  function readable(error) {
    const code = error?.code || '';
    if (/popup-blocked|cancelled-popup|popup-closed/.test(code))
      return 'A janela de entrada foi fechada ou bloqueada. Tente novamente ou entre por e-mail.';
    if (/invalid-credential|wrong-password|user-not-found/.test(code))
      return 'Confira seu e-mail e sua senha e tente novamente.';
    if (/email-already-in-use|account-exists-with-different-credential/.test(code))
      return 'Já existe uma conta com este e-mail. Use a forma de entrada que já utilizou.';
    if (/weak-password/.test(code)) return 'Escolha uma senha com pelo menos oito caracteres.';
    if (/too-many-requests/.test(code)) return 'Aguarde um pouco antes de tentar novamente.';
    if (/network|unavailable/.test(code) || !online())
      return 'Sem conexão agora. Seus estudos continuam salvos neste aparelho.';
    if (/permission-denied|failed-precondition/.test(code))
      return 'Não foi possível sincronizar agora. Seus estudos continuam salvos neste aparelho.';
    return 'Não foi possível concluir agora. Seus estudos continuam salvos neste aparelho. Tente novamente.';
  }
  function close() {
    if (welcomePending) return;
    opened = false;
    document.getElementById('accountsRoot')?.replaceChildren();
    lockWelcome();
    document.getElementById('accountButton')?.focus();
  }
  function dialog() {
    const root = document.getElementById('accountsRoot');
    if (!root) return;
    let body;
    if (!configured)
      body =
        '<p>Você pode continuar estudando e fazendo backup neste aparelho. As contas estarão disponíveis em breve.</p>';
    else if (phase === 'migration') {
      body =
        '<p>' +
        (migration?.exists
          ? 'Sua conta já tem estudos salvos. Vamos abri-los aqui. O histórico sem conta deste aparelho será preservado separadamente.'
          : 'Quer levar os estudos salvos neste aparelho para sua conta?') +
        '</p><div class="account-actions">' +
        (migration?.exists
          ? '<button class="btn" data-account="use-cloud">Continuar com minha conta</button>'
          : '<button class="btn" data-account="use-local">Guardar meus estudos na conta</button><button class="btn secondary" data-account="use-empty">Começar minha conta vazia</button>') +
        '<button class="btn secondary" data-account="guest-backup">Baixar backup do histórico local</button><button class="btn ghost" data-account="logout">' +
        (welcomePending ? 'Usar outra conta' : 'Continuar sem conta') +
        '</button></div>';
    } else if (user || store.active()) {
      const details = user || store.load()?.details || {};
      body =
        '<p class="account-identity">' +
        esc(details.displayName || details.email || 'Minha conta') +
        '</p><p data-sync-label>' +
        esc(label()) +
        '</p><p class="muted small">Você pode estudar sem internet. Ao abrir o Habla conectado, os estudos pendentes serão enviados.</p><p class="muted tiny">Este aparelho guarda uma cópia dos seus estudos mesmo depois de sair. Use sua conta em aparelhos de confiança.</p><div class="account-actions">' +
        (welcomeReady()
          ? '<button class="btn account-start" data-account="welcome-continue">Começar a estudar <span aria-hidden="true">→</span></button>'
          : '') +
        '<button class="btn secondary" data-account="retry">Sincronizar agora</button><button class="btn secondary" data-account="backup">Baixar backup</button><button class="btn ghost" data-account="logout">' +
        (welcomePending ? 'Usar outra conta' : 'Sair da conta') +
        '</button></div>';
    } else {
      const disabled = !auth || !online() ? 'disabled' : '';
      body =
        (welcomePending
          ? '<p>Entre para reunir seus estudos em uma só conta.</p>'
          : '<p>Entre para continuar seus estudos no celular e no computador. Estudar sem conta continua disponível.</p>') +
        '<button class="btn account-google" data-account="google" ' +
        disabled +
        '>Continuar com Google</button><div class="account-divider">ou use seu e-mail</div><form id="accountEmailForm" class="stack"><label>E-mail<input class="field" name="email" type="email" autocomplete="email" required maxlength="254"></label><label>Senha<input class="field" name="password" type="password" autocomplete="' +
        (register ? 'new-password' : 'current-password') +
        '" minlength="8" required maxlength="128"></label><button class="btn" ' +
        disabled +
        '>' +
        (register ? 'Criar minha conta' : 'Entrar por e-mail') +
        '</button></form><div class="account-actions"><button class="btn ghost sm" data-account="register">' +
        (register ? 'Já tenho uma conta' : 'Criar conta por e-mail') +
        '</button><button class="btn ghost sm" data-account="reset-password">Esqueci minha senha</button></div>' +
        (welcomePending
          ? '<p class="account-history-note">Seu histórico anterior continua guardado neste aparelho. Ao entrar, você escolhe quais estudos usar.</p><button class="btn ghost sm" data-account="guest-backup">Baixar backup dos meus estudos</button>'
          : '') +
        (!online()
          ? '<p class="account-connection" role="status">Conecte-se à internet para entrar pela primeira vez. Seus estudos continuam guardados neste aparelho.</p>'
          : '') +
        (!auth && phase === 'error'
          ? '<button class="btn secondary" data-account="retry">Tentar novamente</button>'
          : '');
    }
    const welcome = welcomePending
      ? '<div class="account-welcome-brand">habla <span>SEUS ESTUDOS, COM VOCÊ</span></div><div class="account-devices" aria-hidden="true"><svg viewBox="0 0 260 84" fill="none"><rect x="20" y="8" width="43" height="68" rx="8"/><path d="M34 65h15M35 18h13M90 31h66m-9-9 9 9-9 9M156 54H90m9-9-9 9 9 9"/><rect x="181" y="14" width="62" height="44" rx="4"/><path d="m173 69 8-11h62l8 11H173Z"/></svg><span>Celular e computador</span></div>'
      : '';
    root.innerHTML =
      '<div class="account-overlay' +
      (welcomePending ? ' account-welcome' : '') +
      '"><section class="account-dialog" role="dialog" aria-modal="true" aria-labelledby="accountTitle"' +
      (welcomePending ? ' aria-describedby="accountWelcomeText"' : '') +
      '>' +
      welcome +
      '<div class="row between"><h2 id="accountTitle" tabindex="-1">' +
      (welcomePending ? 'Agora seus estudos vão com você' : 'Conta e sincronização') +
      '</h2>' +
      (welcomePending
        ? ''
        : '<button class="icon-btn" data-account="close" aria-label="Fechar conta">×</button>') +
      '</div>' +
      (welcomePending
        ? '<p id="accountWelcomeText">Comece no celular e continue no computador. Ou faça o caminho contrário: entre com a mesma conta e retome seus estudos de onde parou.</p>'
        : '') +
      body +
      '<p class="account-message" role="status">' +
      esc(message) +
      '</p></section></div>';
    lockWelcome();
    if (welcomePending && !root.contains(document.activeElement))
      document.getElementById('accountTitle')?.focus({ preventScroll: true });
  }
  function open() {
    opened = true;
    dialog();
    document.querySelector('#accountsRoot button')?.focus();
  }
  function card() {
    return (
      '<section class="card account-card"><div><h2>Conta e sincronização</h2><p class="muted small" data-sync-label>' +
      esc(label()) +
      '</p><p class="small">Continue seus estudos em outros aparelhos ou estude aqui sem conta.</p></div><button class="btn secondary" data-account="open">' +
      (store.active() ? 'Minha conta' : 'Entrar para sincronizar') +
      '</button></section>'
    );
  }
  function rows(snapshot) {
    return Object.fromEntries(
      snapshot.docs.map((d) => [
        d.id,
        {
          kind: d.data().kind,
          key: d.data().key,
          payload: d.data().payload,
          deleted: d.data().deleted,
        },
      ])
    );
  }
  async function flush() {
    if (!db || !user || store.active() !== user.uid) return;
    const uid = user.uid,
      token = epoch;
    if (flushing.has(uid)) return;
    flushing.add(uid);
    let again = false,
      failed = false;
    try {
      do {
        again = false;
        const profile = store.load(uid),
          entries = Object.entries(profile.dirty).map(([id, revision]) => ({
            id,
            revision,
            record: profile.records[id],
          }));
        if (!entries.length) break;
        update('syncing');
        for (let i = 0; i < entries.length; i += 350) {
          if (epoch !== token || user?.uid !== uid) return;
          const chunk = entries.slice(i, i + 350),
            batch = api.writeBatch(db);
          for (const entry of chunk)
            batch.set(api.doc(collectionRef(uid), entry.id), {
              ...entry.record,
              updatedAt: api.serverTimestamp(),
            });
          // A promessa só confirma quando o servidor recebe. Offline, o SDK guarda a fila.
          await batch.commit();
          store.acknowledge(uid, chunk);
        }
        again = Object.keys(store.load(uid).dirty).length > 0;
      } while (again && epoch === token && user?.uid === uid);
      if (epoch === token && store.load(uid)?.needsBootstrap) {
        await api.setDoc(metaRef(uid), {
          schema: 1,
          status: 'ready',
          updatedAt: api.serverTimestamp(),
        });
        store.ready(uid);
      }
      if (epoch === token) update('ready');
    } catch (error) {
      failed = true;
      if (epoch === token) update('error', readable(error));
    } finally {
      flushing.delete(uid);
      if (
        (!failed || epoch !== token) &&
        user?.uid === uid &&
        store.active() === uid &&
        Object.keys(store.load(uid)?.dirty || {}).length
      )
        queueMicrotask(flush);
    }
  }
  function connect(uid) {
    unsubscribe?.();
    unsubscribe = null;
    flush();
    unsubscribe = api.onSnapshot(
      collectionRef(uid),
      { includeMetadataChanges: true },
      (snapshot) => {
        if (
          user?.uid !== uid ||
          store.active() !== uid ||
          snapshot.metadata.fromCache ||
          snapshot.metadata.hasPendingWrites
        )
          return;
        try {
          store.apply(uid, rows(snapshot));
          if (!Object.keys(store.load(uid).dirty).length) update('ready');
        } catch (_) {
          update(
            'error',
            'Seu histórico local foi preservado. Não foi possível abrir uma atualização da conta.'
          );
        }
      },
      (error) => {
        if (user?.uid === uid && store.active() === uid) update('error', readable(error));
      }
    );
  }
  async function choose(mode) {
    if (!migration || !user) return;
    const selected = user,
      token = epoch;
    update('loading', 'Preparando seus estudos…');
    try {
      const snapshot = mode === 'local' ? store.guest() : {};
      store.archive('antes-de-entrar-na-conta');
      if (!store.load(selected.uid))
        store.initialize(selected.uid, snapshot, {
          displayName: selected.displayName || '',
          email: selected.email || '',
        });
      if (mode === 'cloud') {
        const remote = await api.getDocsFromServer(collectionRef(selected.uid));
        if (epoch !== token) return;
        store.apply(selected.uid, rows(remote));
        store.ready(selected.uid);
      } else {
        await api.setDoc(metaRef(selected.uid), {
          schema: 1,
          status: 'importing',
          updatedAt: api.serverTimestamp(),
        });
      }
      if (epoch !== token) return;
      migration = null;
      store.activate(selected.uid);
      update('syncing');
      connect(selected.uid);
      finishWelcome();
    } catch (error) {
      update('migration', readable(error));
    }
  }
  async function changed(next) {
    const token = ++epoch;
    unsubscribe?.();
    unsubscribe = null;
    user = next;
    migration = null;
    if (!next) {
      register = false;
      if (store.active()) store.activate(null);
      update('signedout');
      return;
    }
    update('loading', 'Abrindo seus estudos…');
    if (store.load(next.uid)) {
      if (store.active() !== next.uid) store.activate(next.uid);
      connect(next.uid);
      return;
    }
    try {
      const meta = await api.getDocFromServer(metaRef(next.uid));
      if (epoch !== token) return;
      if (meta.exists() && meta.data().status !== 'ready') {
        update(
          'error',
          'Seu histórico está sendo preparado em outro aparelho. Abra o Habla nele para concluir e tente novamente.'
        );
        return;
      }
      migration = { exists: meta.exists() };
      update('migration');
      opened = true;
      dialog();
    } catch (error) {
      update('error', readable(error));
    }
  }
  async function logout() {
    if (
      store.active() &&
      Object.keys(store.load().dirty).length &&
      !confirm(
        'Há estudos ainda não enviados. Eles continuarão salvos nesta conta neste aparelho. Sair agora?'
      )
    )
      return;
    try {
      if (auth) await api.signOut(auth);
      else {
        ++epoch;
        unsubscribe?.();
        user = null;
        store.activate(null);
        update('signedout');
      }
      close();
    } catch (error) {
      update('error', readable(error));
    }
  }
  async function initialize() {
    if (!configured) {
      paint();
      return;
    }
    if (initializing) return;
    initializing = true;
    try {
      if (auth) {
        changed(auth.currentUser);
        return;
      }
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = './assets/vendor/firebase-sdk.js';
        script.onload = resolve;
        script.onerror = () => reject(Error('sdk'));
        document.head.appendChild(script);
      });
      api = window.HablaFirebase;
      const app = api.initializeApp(config);
      auth = api.getAuth(app);
      const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
      const emulators = isLocal && config.emulators;
      // WebKit pode reter frames da conexão persistente por cerca de 30 s.
      // Opção oficial do SDK: respostas curtas nesses navegadores.
      // https://github.com/firebase/firebase-js-sdk/issues/9789
      const webkit =
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
        (/AppleWebKit/.test(navigator.userAgent) &&
          !/Chrome|Chromium|Edg|Android/.test(navigator.userAgent));
      db = api.initializeFirestore(app, {
        localCache: api.persistentLocalCache({ tabManager: api.persistentMultipleTabManager() }),
        ...(webkit ? { experimentalForceLongPolling: true, useFetchStreams: false } : {}),
      });
      if (emulators) {
        api.connectAuthEmulator(auth, 'http://127.0.0.1:' + emulators.auth, {
          disableWarnings: true,
        });
        api.connectFirestoreEmulator(db, '127.0.0.1', emulators.firestore);
      }
      api.onAuthStateChanged(auth, changed, (error) => update('error', readable(error)));
    } catch (_) {
      update(
        'error',
        welcomePending
          ? 'A entrada na conta está indisponível agora. Confira sua conexão e tente novamente. Seus estudos continuam guardados neste aparelho.'
          : 'A entrada na conta está indisponível agora. Você pode continuar estudando neste aparelho.'
      );
    } finally {
      initializing = false;
    }
  }
  document.addEventListener('click', (event) => {
    const action = event.target.closest('[data-account]')?.dataset.account;
    if (!action) return;
    event.preventDefault();
    if (action === 'open') {
      window.closeMore?.();
      open();
    } else if (action === 'close') close();
    else if (action === 'welcome-continue') {
      if (welcomePending) finishWelcome();
      else close();
    } else if (action === 'register') {
      register = !register;
      message = '';
      dialog();
    } else if (action === 'google' && auth && online())
      api.signInWithPopup(auth, new api.GoogleAuthProvider()).catch((error) => {
        message = readable(error);
        dialog();
      });
    else if (action === 'logout') logout();
    else if (action === 'use-local') choose('local');
    else if (action === 'use-empty') choose('empty');
    else if (action === 'use-cloud') choose('cloud');
    else if (action === 'backup') window.downloadBackup?.();
    else if (action === 'guest-backup') window.HablaApp?.downloadGuestBackup();
    else if (action === 'retry') {
      if (user && store.active() === user.uid) {
        connect(user.uid);
      } else if (user) changed(user);
      else initialize();
    } else if (action === 'reset-password' && auth) {
      const email = document.querySelector('#accountEmailForm [name="email"]')?.value;
      if (!email) {
        message = 'Preencha seu e-mail para receber a recuperação.';
        dialog();
        return;
      }
      api
        .sendPasswordResetEmail(auth, email)
        .then(() => {
          message = 'Se houver uma conta com esse e-mail, você receberá as instruções.';
          dialog();
        })
        .catch((error) => {
          message = readable(error);
          dialog();
        });
    }
  });
  document.addEventListener('submit', (event) => {
    if (event.target.id !== 'accountEmailForm') return;
    event.preventDefault();
    if (!auth || !online()) return;
    const form = event.target,
      email = form.elements.email.value.trim(),
      password = form.elements.password.value;
    const operation = register
      ? api.createUserWithEmailAndPassword
      : api.signInWithEmailAndPassword;
    form.querySelector('button').disabled = true;
    operation(auth, email, password)
      .then((result) => {
        form.reset();
        if (register) api.sendEmailVerification(result.user).catch(() => {});
      })
      .catch((error) => {
        message = readable(error);
        dialog();
      });
  });
  document.addEventListener('keydown', (event) => {
    if (!opened) return;
    if (event.key === 'Escape') {
      if (welcomePending) {
        event.preventDefault();
        return;
      }
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    const nodes = [...document.querySelectorAll('#accountsRoot button,#accountsRoot input')].filter(
      (n) => !n.disabled
    );
    const first = nodes[0],
      last = nodes.at(-1);
    if (
      event.shiftKey &&
      (document.activeElement === first || !nodes.includes(document.activeElement))
    ) {
      event.preventDefault();
      last?.focus();
    } else if (
      !event.shiftKey &&
      (document.activeElement === last || !nodes.includes(document.activeElement))
    ) {
      event.preventDefault();
      first?.focus();
    }
  });
  window.addEventListener('habla:store', (event) => {
    paint();
    if (
      event.detail?.uid &&
      event.detail.uid === user?.uid &&
      !event.detail.remote &&
      !event.detail.profileChanged
    )
      flush();
  });
  window.addEventListener('online', () => {
    paint();
    if (opened && welcomePending) dialog();
    if (user) {
      if (store.active() === user.uid) connect(user.uid);
      else changed(user);
    }
  });
  window.addEventListener('offline', () => {
    paint();
    if (opened && welcomePending) dialog();
  });
  window.HablaAccounts = {
    card,
    open,
    refresh: paint,
    status: () => ({
      configured,
      welcomePending,
      phase,
      uid: store.active(),
      pending: store.active() ? Object.keys(store.load()?.dirty || {}).length : 0,
    }),
  };
  if (welcomePending) open();
  initialize();
})();
