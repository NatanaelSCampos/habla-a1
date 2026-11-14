/* Consultas oficiais em outra aba: nenhuma resposta ou histórico é enviado automaticamente. */
(function () {
  'use strict';
  const providers = [
    [
      'wordreference',
      'WordReference',
      'Tradução e usos em português',
      (term) => 'https://www.wordreference.com/espt/' + encodeURIComponent(term),
    ],
    [
      'youglish',
      'YouGlish',
      'Expressões em vídeos · filtro América Latina',
      (term) => 'https://youglish.com/pronounce/' + encodeURIComponent(term) + '/spanish/la',
    ],
    [
      'tatoeba',
      'Tatoeba',
      'Exemplos de frases · confira o nível e a região',
      (term) =>
        'https://tatoeba.org/pt-br/sentences/search?from=spa&to=por&query=' +
        encodeURIComponent(term),
    ],
    [
      'forvo',
      'Forvo',
      'Pronúncia por pessoas reais · confira o país',
      (term) => 'https://forvo.com/search/' + encodeURIComponent(term) + '/es/',
    ],
  ];
  let opened = false,
    focusBefore = null;
  const esc = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
    );
  function update() {
    const term = document.getElementById('resourceTerm').value.trim().slice(0, 180);
    document.getElementById('resourceLinks').innerHTML = providers
      .map(
        ([id, title, description, url]) =>
          '<a class="resource-link" data-resource="' +
          id +
          '" ' +
          (term
            ? 'href="' + esc(url(term)) + '" target="_blank" rel="noopener noreferrer"'
            : 'aria-disabled="true"') +
          '><strong>' +
          title +
          ' ↗</strong><span>' +
          description +
          '</span></a>'
      )
      .join('');
  }
  function close() {
    opened = false;
    document.getElementById('resourcesRoot').replaceChildren();
    focusBefore?.focus();
  }
  function open() {
    const selection = String(window.getSelection() || '')
      .trim()
      .slice(0, 180);
    focusBefore = document.activeElement?.closest('#moreRoot')
      ? document.querySelector('[data-act="more-open"]')
      : document.activeElement;
    window.closeMore?.();
    opened = true;
    document.getElementById('resourcesRoot').innerHTML =
      '<div class="account-overlay"><section class="account-dialog" role="dialog" aria-modal="true" aria-labelledby="resourceTitle"><div class="row between"><h2 id="resourceTitle">Consultar espanhol</h2><button class="icon-btn" data-resources-close aria-label="Fechar consulta">×</button></div><p class="muted small">Selecione uma palavra na atividade ou escreva aqui. A consulta abre em outra aba e sua atividade continua salva.</p><label for="resourceTerm">Palavra ou expressão em espanhol</label><input id="resourceTerm" class="field" maxlength="180" value="' +
      esc(selection) +
      '" placeholder="Ex.: buenos días"><div id="resourceLinks"></div><p class="muted tiny">Precisa de internet. Os sites têm seus próprios termos, anúncios e limites de uso. Exemplos reais podem incluir outras variedades de espanhol.</p></section></div>';
    update();
    document.getElementById('resourceTerm').focus();
  }
  function toolbar() {
    if (document.getElementById('resourceToolbar')) return;
    const toolbar = document.createElement('div');
    toolbar.id = 'resourceToolbar';
    toolbar.className = 'resource-toolbar';
    toolbar.innerHTML =
      '<button class="btn ghost sm" data-resources-open>Consultar palavra ou expressão ↗</button>';
    document.getElementById('app').prepend(toolbar);
  }
  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-resources-open]')) open();
    if (event.target.closest('[data-resources-close]')) close();
  });
  document.addEventListener('input', (event) => {
    if (event.target.id === 'resourceTerm') update();
  });
  document.addEventListener('keydown', (event) => {
    if (!opened) return;
    if (event.key === 'Escape') {
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    const nodes = [
        ...document.querySelectorAll(
          '#resourcesRoot button,#resourcesRoot input,#resourcesRoot a[href]'
        ),
      ],
      first = nodes[0],
      last = nodes.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  window.addEventListener('habla:render', toolbar);
  window.addEventListener('habla:store', (event) => {
    if (event.detail?.profileChanged && opened) close();
  });
  toolbar();
})();
