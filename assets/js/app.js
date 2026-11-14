// Módulo de conjugação com frases contextualizadas.
// Banco de verbos e atividades.
const VERB_PEOPLE = VERB_BANK.persons;
const VERB_PEOPLE_PT = VERB_BANK.ptPersons;
const VERB_BOOK_KEY = 'frecuencias.a1.caderno.v2';
const UNIT_TITLES = [
  'Nos presentamos',
  'Mi casa, mi barrio',
  'Vamos de viaje',
  'En familia',
  'Igual que todos los días',
  'No me gusta, ¡me encanta!',
  'Buenas intenciones',
  'Cuídate mucho',
  'Experiencias vividas',
  'Fin de trayecto',
];
const CONJ_COUNTS = {
  verbs: VERB_BANK.verbs.length,
  contexts: VERB_BANK.verbs.reduce((n, x) => n + x.contexts.length, 0),
  sentences: VERB_BANK.verbs.reduce((n, x) => n + x.contexts.length * 6, 0),
};
const specialGrammar = [
  {
    label: 'Hay · existência',
    unit: 2,
    note: 'Hay é invariável para singular ou plural. Compare com está/están, que localizam algo definido.',
    examples: [
      ['Hay una farmacia en mi barrio.', 'Há uma farmácia no meu bairro.'],
      ['Hay muchos libros en la habitación.', 'Há muitos livros no quarto.'],
      ['La farmacia está al lado del parque.', 'A farmácia fica ao lado do parque.'],
    ],
  },
  {
    label: 'Gustar · interesses',
    unit: 6,
    note: 'A forma concorda com a coisa de que se gosta: gusta (singular/infinitivo) e gustan (plural).',
    examples: [
      ['Me gusta el fútbol.', 'Eu gosto de futebol.'],
      ['Te gusta estudiar español.', 'Você gosta de estudar espanhol.'],
      ['Nos gustan los libros.', 'Nós gostamos dos livros.'],
      ['A ellos les gustan las películas.', 'Eles gostam dos filmes.'],
    ],
  },
  {
    label: 'Encantar · entusiasmo',
    unit: 6,
    note: 'Segue a mesma lógica de gustar: encanta / encantan.',
    examples: [
      ['Me encanta viajar.', 'Eu adoro viajar.'],
      ['A ella le encanta el café.', 'Ela adora café.'],
      ['Nos encantan las vacaciones.', 'Nós adoramos as férias.'],
    ],
  },
  {
    label: 'Interesar · interesse',
    unit: 6,
    note: 'Interesa / interesan dependem do elemento que desperta interesse.',
    examples: [
      ['Me interesa la tecnología.', 'Eu me interesso por tecnologia.'],
      ['¿Te interesan los museos?', 'Você se interessa por museus?'],
      ['A ustedes les interesa la cultura.', 'Vocês se interessam por cultura.'],
    ],
  },
];
function verbByLemma(key) {
  return VERB_BANK.verbs.find((v) => v.lemma === key) || null;
}
function eligibleVerbs() {
  return VERB_BANK.verbs.filter((v) => ui.verbUnit === 'all' || v.unit <= Number(ui.verbUnit));
}
function eligibleForms() {
  const out = [];
  for (const v of eligibleVerbs()) {
    if (ui.verbChoice !== 'all' && v.lemma !== ui.verbChoice) continue;
    for (let pi = 0; pi < 6; pi++) {
      if (ui.verbPronoun !== 'all' && pi !== Number(ui.verbPronoun)) continue;
      out.push({ lemma: v.lemma, pi });
    }
  }
  return out;
}
function verbEntryId(q) {
  return `${q.lemma}|${q.pi}`;
}
function verbalSentence(v, pi, ci) {
  const suffix = v.contexts[ci][0],
    ptSuffix = v.contexts[ci][1],
    nom = VERB_PEOPLE[pi],
    ptNom = VERB_PEOPLE_PT[pi],
    form = v.es_forms[pi],
    ptForm = v.pt_forms[pi],
    pluralName = v.lemma === 'llamarse' && pi > 2;
  const esSuffix = pluralName ? suffix + ' y Luis' : suffix,
    ptText = pluralName ? ptSuffix + ' e Luis' : ptSuffix;
  return {
    es: `${nom} ${form} ${esSuffix}.`,
    pt: `${ptNom} ${ptForm} ${ptText}.`,
    mask: `${nom} _____ ${esSuffix}.`,
    form,
    ptForm,
    pi,
    lemma: v.lemma,
    unit: v.unit,
    ci,
    id: `${v.lemma}|${pi}|${ci}`,
  };
}
function verbDue() {
  const d = today();
  return eligibleForms().filter((x) => data.verbProgress?.[verbEntryId(x)]?.due <= d);
}
function verbStats() {
  const p = Object.values(data.verbProgress || {});
  return {
    trained: p.filter((x) => x.seen).length,
    well: p.filter((x) => x.reps >= 2).length,
    due: verbDue().length,
  };
}
function chooseVerbQuestion(reviewOnly = false) {
  const forms = reviewOnly ? verbDue() : eligibleForms();
  if (!forms.length) return null;
  let candidates = forms.filter((x) => !ui.verbHistory.includes(verbEntryId(x)));
  if (!candidates.length) {
    ui.verbHistory = [];
    candidates = forms;
  }
  // Retenção: prioriza formas vencidas e dificuldades registradas.
  if (!reviewOnly && ui.verbChoice === 'all' && Math.random() < 0.58) {
    const due = candidates.filter((x) => data.verbProgress?.[verbEntryId(x)]?.due <= today());
    if (due.length) candidates = due;
  }
  const x = candidates[Math.floor(Math.random() * candidates.length)],
    v = verbByLemma(x.lemma);
  let ci = Math.floor(Math.random() * v.contexts.length);
  const old = ui.verbRecentContexts[x.lemma + '|' + x.pi];
  if (v.contexts.length > 1 && old === ci)
    ci = (ci + 1 + Math.floor(Math.random() * (v.contexts.length - 1))) % v.contexts.length;
  ui.verbRecentContexts[x.lemma + '|' + x.pi] = ci;
  ui.verbHistory.push(verbEntryId(x));
  if (ui.verbHistory.length > Math.min(24, eligibleForms().length - 1)) ui.verbHistory.shift();
  return verbalSentence(v, x.pi, ci);
}
function newVerbQuestion() {
  ui.verbQuestion = chooseVerbQuestion(ui.verbReviewOnly);
  ui.verbReveal = false;
  ui.verbPT = false;
  ui.verbHint = false;
  ui.verbTyped = '';
  ui.verbPicked = '';
  ui.verbResult = null;
  render();
  guideShowPage(false);
}
function rateVerb(grade) {
  const q = ui.verbQuestion;
  if (!q) return;
  const key = verbEntryId(q),
    old = data.verbProgress?.[key] || { reps: 0, lapses: 0 };
  const reps = grade === 'again' ? 0 : (old.reps || 0) + 1,
    days =
      grade === 'again'
        ? 0
        : grade === 'hard'
          ? 1
          : grade === 'good'
            ? Math.min(30, Math.round(Math.pow(2, Math.max(1, reps))))
            : Math.min(45, Math.round(Math.pow(3, Math.max(1, reps))));
  data.verbProgress = data.verbProgress || {};
  data.verbProgress[key] = {
    seen: true,
    reps,
    lapses: (old.lapses || 0) + (grade === 'again' ? 1 : 0),
    due: addDays(today(), days),
    lastGrade: grade,
    updated: today(),
  };
  data.verbActivity = data.verbActivity || {};
  const a = data.verbActivity[today()] || { attempts: 0, good: 0 };
  a.attempts++;
  if (grade === 'good' || grade === 'easy') a.good++;
  data.verbActivity[today()] = a;
  save();
  if (ui.verbReviewOnly && !verbDue().length) {
    ui.verbQuestion = null;
    render();
    toast('Revisões de conjugação em dia!');
    return;
  }
  newVerbQuestion();
}
function conjugationOptions(q) {
  const v = verbByLemma(q.lemma);
  const distractors = [...new Set(v.es_forms.filter((x) => x !== q.form))];
  for (const vv of VERB_BANK.verbs) {
    if (vv.lemma !== q.lemma && vv.unit <= v.unit) {
      const s = vv.es_forms[q.pi];
      if (s !== q.form && !distractors.includes(s)) distractors.push(s);
    }
  }
  for (let i = distractors.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [distractors[i], distractors[j]] = [distractors[j], distractors[i]];
  }
  const options = [q.form, ...distractors.slice(0, 3)];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return options;
}
function renderVerbTable(v) {
  const current = !!ui.verbShowTable;
  return `<div class="card verb-table-card"><div class="row between wrap"><div><h3>Conjugación · presente de indicativo</h3><p class="muted small">${escapeHTML(v.note || 'Observe como o verbo muda com a pessoa.')}</p></div><button class="btn secondary sm" data-act="verb-toggle-table">${current ? 'Ocultar tabela' : 'Ver tabela de conjugação'} ${ico('book', 15)}</button></div>
 ${current ? `<div class="verb-table-wrap"><table class="verb-table"><thead><tr><th>Persona</th><th>Español</th><th>Português</th></tr></thead><tbody>${VERB_PEOPLE.map((p, i) => `<tr><th>${escapeHTML(p)}</th><td><b>${escapeHTML(v.es_forms[i])}</b></td><td>${escapeHTML(v.pt_forms[i])}</td></tr>`).join('')}</tbody></table></div>` : ''}</div>`;
}
function verbFilters() {
  const options = eligibleVerbs()
    .slice()
    .sort((a, b) => a.lemma.localeCompare(b.lemma, 'es'));
  return `<div class="verb-filter-box"><div class="verb-filter-grid"><label class="verb-lab">Conteúdo até a unidade<select class="select" id="verbUnit">${[
    ['1', 'Unidade 1 — início'],
    ['2', 'Até a unidade 2'],
    ['3', 'Até a unidade 3'],
    ['4', 'Até a unidade 4'],
    ['5', 'Até a unidade 5'],
    ['6', 'Até a unidade 6'],
    ['7', 'Até a unidade 7'],
    ['8', 'Até a unidade 8'],
    ['9', 'Até a unidade 9'],
    ['all', 'Todas as unidades · A1'],
  ]
    .map(
      ([val, txt]) =>
        `<option value="${val}" ${ui.verbUnit === val ? 'selected' : ''}>${txt}</option>`
    )
    .join('')}</select></label>
 <label class="verb-lab">Verbo<select class="select" id="verbPick"><option value="all" ${ui.verbChoice === 'all' ? 'selected' : ''}>Aleatório entre os disponíveis</option>${options.map((v) => `<option value="${escapeHTML(v.lemma)}" ${ui.verbChoice === v.lemma ? 'selected' : ''}>${escapeHTML(v.lemma)} · ${escapeHTML(v.ptinf)}</option>`).join('')}</select></label>
 <label class="verb-lab">Pessoa<select class="select" id="verbPerson"><option value="all" ${ui.verbPronoun === 'all' ? 'selected' : ''}>Todas as pessoas</option>${VERB_PEOPLE.map((p, i) => `<option value="${i}" ${ui.verbPronoun === String(i) ? 'selected' : ''}>${escapeHTML(p)} — ${escapeHTML(VERB_PEOPLE_PT[i])}</option>`).join('')}</select></label>
 <label class="verb-lab">Tipo de treino<select class="select" id="verbMode"><option value="type" ${ui.verbMode === 'type' ? 'selected' : ''}>Digitar a forma verbal</option><option value="choice" ${ui.verbMode === 'choice' ? 'selected' : ''}>Escolher entre alternativas</option><option value="oral" ${ui.verbMode === 'oral' ? 'selected' : ''}>Falar antes de revelar</option></select></label></div><p class="verb-filter-caption">O conteúdo é organizado pela sequência dos livros. O filtro limita o que já apareceu até a unidade escolhida; use “Todas” para misturar o nível A1 completo.</p></div>`;
}
function renderVerbs() {
  const all = VERB_BANK.verbs,
    v = verbByLemma(ui.verbChoice) || eligibleVerbs()[0],
    stats = verbStats();
  const tabs = [
    ['learn', 'Estudar'],
    ['quiz', 'Praticar'],
    ['review', 'Revisar erros'],
  ];
  return `${heading('NOVO · BANCO DE FRASES', 'Conjugação de verbos', 'Escolha um verbo ou misture vários. Cada exercício muda de pessoa e de contexto, com tradução disponível e revisão espaçada.')}
 <div class="grid four verb-metrics"><div class="card stat"><div class="stat-label">Verbos</div><div class="value">${CONJ_COUNTS.verbs}</div><div class="detail">Conjugados em 6 pessoas</div></div><div class="card stat"><div class="stat-label">Frases possíveis</div><div class="value">${CONJ_COUNTS.sentences.toLocaleString('pt-BR')}</div><div class="detail">Combinações contextualizadas</div></div><div class="card stat"><div class="stat-label">Formas praticadas</div><div class="value">${stats.trained}</div><div class="detail">De ${CONJ_COUNTS.verbs * 6}</div></div><div class="card stat"><div class="stat-label">Revisões</div><div class="value">${stats.due}</div><div class="detail">Para hoje</div></div></div>
 <div class="verb-tabs" role="tablist" aria-label="Seções da conjugação">${tabs.map(([k, l]) => `<button role="tab" aria-selected="${ui.verbTab === k}" data-act="verb-tab" data-value="${k}" class="verb-tab ${ui.verbTab === k ? 'selected' : ''}">${l}</button>`).join('')}</div>
 ${verbFilters()}
 ${ui.verbTab === 'learn' ? renderVerbLearn(v) : ui.verbTab === 'quiz' ? renderVerbQuiz() : renderVerbReview()}
 <div class="method" style="margin-top:20px"><strong>Como fixar:</strong> 1) tente produzir a forma antes de olhar; 2) revele a tradução só se precisar; 3) repita a mesma combinação em outro contexto; 4) volte quando a revisão vencer. Exatidão da forma verbal é verificada automaticamente no modo de digitação, não a pronúncia.</div>`;
}
function renderVerbLearn(v) {
  const shuffled = eligibleVerbs()
    .slice()
    .sort((a, b) => a.unit - b.unit || a.lemma.localeCompare(b.lemma));
  return `<div class="grid two" style="align-items:start"><div class="stack"><div class="card verb-learn-card"><span class="eyebrow">UNIDADE ${v.unit} · ${escapeHTML(UNIT_TITLES[v.unit - 1])}</span><h2 class="verb-head">${escapeHTML(v.lemma)} <span>${escapeHTML(v.ptinf)}</span></h2><p class="muted small" style="margin:8px 0 14px">Presente do indicativo · espanhol internacional com tú e ustedes</p><div class="verb-table-wrap"><table class="verb-table"><thead><tr><th>Persona</th><th>Español</th><th>Português</th></tr></thead><tbody>${VERB_PEOPLE.map((p, i) => `<tr><th>${escapeHTML(p)}</th><td><b>${escapeHTML(v.es_forms[i])}</b></td><td>${escapeHTML(v.pt_forms[i])}</td></tr>`).join('')}</tbody></table></div>${v.note ? `<p class="verb-note">${escapeHTML(v.note)}</p>` : ''}<button class="btn" style="margin-top:16px" data-act="verb-start-focused" data-id="${escapeHTML(v.lemma)}">${ico('play', 16)} Praticar só ${escapeHTML(v.lemma)}</button></div>
 <div class="card"><div class="row between wrap"><h3>Construções especiais do A1</h3><button class="btn secondary sm" data-act="verb-special-toggle">${ui.verbSpecial ? 'Ocultar' : 'Mostrar'}</button></div><p class="muted small" style="margin-top:7px">Alguns verbos seguem regras diferentes de sujeito + forma verbal.</p>${
   ui.verbSpecial
     ? specialGrammar
         .filter((g) => ui.verbUnit === 'all' || g.unit <= Number(ui.verbUnit))
         .map(
           (g) =>
             `<div class="verb-special"><b>${escapeHTML(g.label)}</b><p>${escapeHTML(g.note)}</p>${g.examples.map(([es, pt]) => `<div class="verb-special-example"><span>${escapeHTML(es)}</span><button class="btn secondary sm" data-act="speak" data-text="${escapeHTML(es)}" title="Ouvir">${ico('sound', 14)}</button><small>${escapeHTML(pt)}</small></div>`).join('')}</div>`
         )
         .join('')
     : ''
 }</div></div>
 <div class="stack"><div class="card"><div class="row between wrap"><h3>Frases para entender e repetir</h3><span class="chip green">${v.contexts.length * 6} combinações</span></div><p class="muted small" style="margin:6px 0 14px">Escolha o verbo acima. Leia 2–3 frases, esconda a tradução e tente reconstruir de memória.</p>
 ${v.contexts
   .slice(0, 8)
   .map((c, i) => {
     const p = i % 6,
       q = verbalSentence(v, p, i);
     return `<div class="verb-example"><div><b>${escapeHTML(q.es)}</b>${ui.verbShowAllPT ? `<small>${escapeHTML(q.pt)}</small>` : ''}</div><button class="btn secondary sm" data-act="speak" data-text="${escapeHTML(q.es)}" title="Ouvir espanhol">${ico('sound', 15)}</button><button class="btn secondary sm" data-act="verb-translate-example" data-value="${i}" title="Ver tradução em português">PT</button>${ui.verbTranslatedExamples.includes(i) && !ui.verbShowAllPT ? `<small class="verb-expanded-pt">${escapeHTML(q.pt)}</small>` : ''}</div>`;
   })
   .join('')}
 <div class="row wrap" style="margin-top:13px"><button class="btn secondary sm" data-act="verb-toggle-allpt">${ui.verbShowAllPT ? 'Ocultar todas as traduções' : 'Mostrar todas as traduções'}</button><button class="btn secondary sm" data-act="verb-random-example">Exemplos aleatórios ${ico('shuffle', 14)}</button></div></div>
 <div class="card"><h3>Catálogo por unidade</h3><p class="muted small" style="margin:7px 0 13px">Toque em um verbo para estudar sua conjugação completa.</p>${Array.from(
   new Set(shuffled.map((x) => x.unit))
 )
   .map(
     (unit) =>
       `<div class="verb-catalog-group"><div class="mini-label">UNIDADE ${unit} — ${escapeHTML(UNIT_TITLES[unit - 1])}</div><div class="verb-catalog">${shuffled
         .filter((x) => x.unit === unit)
         .map(
           (x) =>
             `<button data-act="verb-choose" data-id="${escapeHTML(x.lemma)}" class="verb-chip ${ui.verbChoice === x.lemma ? 'picked' : ''}">${escapeHTML(x.lemma)}</button>`
         )
         .join('')}</div></div>`
   )
   .join('')}</div></div></div>`;
}
function renderVerbQuiz() {
  if (!ui.verbQuestion) {
    const total = eligibleForms().length;
    return `<div class="card verb-empty"><h2>${total ? 'Pronto para praticar?' : 'Sem verbos neste filtro'}</h2><p class="muted">${total ? 'Escolha “Começar” para receber uma frase com uma conjugação faltando. Tente lembrar antes de pedir a tradução.' : 'Ajuste o verbo e a unidade.'}</p><button class="btn" data-act="verb-start">Começar treino ${ico('arrow', 15)}</button></div>`;
  }
  const q = ui.verbQuestion,
    v = verbByLemma(q.lemma),
    correct = ui.verbResult?.correct;
  return `<div class="verb-quiz-panel"><div class="row between wrap"><div><span class="eyebrow">CONJUGAÇÃO CONTEXTUAL</span><h2 style="margin:5px 0 0">${escapeHTML(q.lemma)} <span class="muted small">· ${escapeHTML(v.ptinf)}</span></h2></div><span class="chip">${escapeHTML(UNIT_TITLES[q.unit - 1])}</span></div><div class="verb-big-phrase">${ui.verbReveal ? escapeHTML(q.es) : escapeHTML(q.mask)}</div><div class="verb-question-meta">Pessoa: <strong>${escapeHTML(VERB_PEOPLE[q.pi])}</strong> · Presente do indicativo</div>
 ${ui.verbPT || ui.verbReveal ? `<div class="verb-translated">${escapeHTML(q.pt)}</div>` : ''}
 ${
   !ui.verbReveal
     ? `<div class="row wrap" style="margin:13px 0 16px"><button class="btn secondary sm" data-act="verb-toggle-translation">${ui.verbPT ? 'Ocultar tradução' : 'Ver tradução'}</button><button class="btn secondary sm" data-act="verb-toggle-hint">${ui.verbHint ? 'Ocultar dica' : 'Pedir dica'}</button></div>${ui.verbHint ? `<div class="hint">Infinitivo: <strong>${escapeHTML(q.lemma)}</strong> · Pense na terminação ou irregularidade para <strong>${escapeHTML(VERB_PEOPLE[q.pi])}</strong>. Você também pode consultar a tabela abaixo.</div>` : ''}
 ${
   ui.verbMode === 'oral'
     ? `<div class="method">Fale a forma verbal e depois a frase inteira. Toque em “Revelar” para conferir sua tentativa.</div><button class="btn" data-act="verb-reveal">Revelar resposta</button>`
     : ui.verbMode === 'choice'
       ? `<div class="verb-choices">${conjugationOptions(q)
           .map(
             (opt) =>
               `<button class="verb-option ${ui.verbPicked === opt ? 'picked' : ''}" data-act="verb-pick" data-value="${escapeHTML(opt)}">${escapeHTML(opt)}</button>`
           )
           .join(
             ''
           )}</div><button class="btn" data-act="verb-check">Conferir resposta ${ico('check', 15)}</button>`
       : `<label for="verbResponse" class="verb-lab">Escreva apenas a forma verbal</label><div class="row wrap"><input class="input-main verb-response" id="verbResponse" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Ex.: tengo" value="${escapeHTML(ui.verbTyped)}" /><button class="btn" data-act="verb-check">Conferir ${ico('check', 15)}</button><button class="btn secondary" data-act="mic" data-target="verbResponse" title="Ditado por voz, se disponível">${ico('mic', 16)}</button></div>`
 }`
     : `<div class="verb-feedback ${correct === true ? 'good' : correct === false ? 'bad' : ''}"><strong>${ui.verbMode === 'oral' ? 'Resposta-modelo' : correct ? 'Correto!' : 'Vamos reforçar esta forma'}</strong><div class="verb-feedback-form">${escapeHTML(q.form)}</div><p><b>Frase:</b> ${escapeHTML(q.es)}</p><p><b>Tradução:</b> ${escapeHTML(q.pt)}</p>${ui.verbMode !== 'oral' && ui.verbTyped ? `<p><b>Sua resposta:</b> ${escapeHTML(ui.verbTyped)}</p>` : ''}<button class="btn secondary sm" data-act="speak" data-text="${escapeHTML(q.es)}">${ico('sound', 15)} Ouvir frase</button></div>
 <div class="verb-grade"><div class="subheading">Como foi lembrar?</div><div class="answer-rating"><button class="rating again" data-act="verb-grade" data-grade="again">Esqueci<small>Rever hoje</small></button><button class="rating" data-act="verb-grade" data-grade="hard">Difícil<small>Amanhã</small></button><button class="rating" data-act="verb-grade" data-grade="good">Lembrei<small>Espaçar revisão</small></button><button class="rating easy" data-act="verb-grade" data-grade="easy">Fácil<small>Revisar depois</small></button></div></div>`
 }
 </div>${renderVerbTable(v)}<div class="row wrap" style="margin-top:12px"><button class="btn secondary sm" data-act="verb-skip">${ico('shuffle', 15)} Outra frase</button><button class="btn secondary sm" data-act="verb-study-this" data-id="${escapeHTML(v.lemma)}">Estudar este verbo</button></div>`;
}
function renderVerbReview() {
  const due = verbDue(),
    tr = Object.entries(data.verbProgress || {})
      .filter(([_, d]) => d?.seen)
      .sort((a, b) => String(a[1].due).localeCompare(String(b[1].due)))
      .slice(0, 40);
  return `<div class="grid two" style="align-items:start"><div class="card"><h2>${due.length} formas para revisar</h2><p class="muted small" style="margin:10px 0 20px">A revisão trabalha o mesmo verbo e a mesma pessoa, mas muda o contexto da frase para evitar decorar a resposta mecanicamente.</p><button class="btn" data-act="verb-start-review" ${due.length ? '' : 'disabled'}>Revisar agora ${ico('arrow', 15)}</button>${!due.length ? `<p class="verb-note">Nenhuma revisão vencida neste filtro. Você pode praticar novos verbos e voltar amanhã.</p>` : ''}</div><div class="card"><h3>Histórico de conjugação</h3>${
    tr.length
      ? tr
          .map(([id, r]) => {
            const [lemma, p] = id.split('|');
            return `<div class="metric-line"><div><b>${escapeHTML(lemma)} · ${escapeHTML(VERB_PEOPLE[Number(p)] || '')}</b><div class="muted tiny">${r.reps >= 2 ? 'Em consolidação' : 'Em aprendizagem'} · ${r.lapses || 0} esquecimentos</div></div><span class="chip">${r.due <= today() ? 'Hoje' : r.due}</span></div>`;
          })
          .join('')
      : `<div class="empty"><p>Treine algumas conjugações e seu histórico aparecerá aqui.</p></div>`
  }</div></div>`;
}

// Caderno interativo: dados das atividades organizados por unidade.
const BOOK_UNITS = BOOK_DATA.units,
  BOOK_EX = BOOK_DATA.exercises;
const WB_TYPE = {
  choice: 'Escolha única',
  fill: 'Complete a frase',
  match: 'Associação',
  tf: 'Verdadeiro ou falso',
  audio: 'Escuta e compreensão',
  free: 'Produção escrita',
  multi: 'Seleção múltipla',
  order: 'Ordene as palavras',
};
const WB_PT = {
  choice: 'Leia a pergunta em espanhol e escolha uma alternativa.',
  fill: 'Complete a lacuna usando a palavra ou conjugação correta.',
  match: 'Associe cada expressão à opção correspondente.',
  tf: 'Leia a frase e selecione verdadeiro ou falso.',
  audio: 'Ouça com atenção e responda à pergunta.',
  free: 'Escreva livremente em espanhol e compare com o modelo depois. Não existe apenas uma resposta correta.',
  multi: 'Selecione todas as alternativas corretas.',
  order: 'Organize as palavras para formar uma frase em espanhol.',
};
const WB_BASE = () => ({ answers: {}, results: {}, review: {}, notes: {}, last: 'u1-1' });
let wb = loadWB();
function loadWB() {
  try {
    const v = JSON.parse(window.HablaStore.getItem(VERB_BOOK_KEY));
    return v && typeof v === 'object'
      ? Object.assign(WB_BASE(), v, {
          answers: v.answers || {},
          results: v.results || {},
          review: v.review || {},
          notes: v.notes || {},
        })
      : WB_BASE();
  } catch (e) {
    return WB_BASE();
  }
}
function wbSave() {
  try {
    window.HablaStore.setItem(VERB_BOOK_KEY, JSON.stringify(wb));
  } catch (e) {
    toast('Não foi possível salvar o caderno; exporte um backup.');
  }
}
function wbEx(id) {
  return BOOK_EX.find((x) => x.id === id);
}
function wbUnit(n) {
  return BOOK_UNITS.find((x) => x.id === Number(n));
}
function wbDone(ex) {
  return Boolean(wb.results[ex.id]);
}
function wbUnitCount(n) {
  return BOOK_EX.filter((x) => x.unit === Number(n) && wbDone(x)).length;
}
function wbCurrent() {
  return wbEx(ui.wbExercise);
}
function wbOpenUnit(u) {
  ui.wbUnit = Number(u);
  ui.wbExercise = null;
  ui.wbQuery = '';
  ui.wbFilter = 'all';
  render();
  window.scrollTo(0, 0);
}
function wbOpenExercise(id) {
  const e = wbEx(id);
  if (!e) return;
  ui.wbUnit = e.unit;
  ui.wbExercise = e.id;
  wb.last = e.id;
  wbSave();
  render();
  window.scrollTo(0, 0);
}
function wbOptions(items, key) {
  return [...items].sort((a, b) => wbHash(key + '|' + a) - wbHash(key + '|' + b));
}
function wbHash(v) {
  let h = 2166136261;
  for (const c of String(v)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}
function wbAnswered(ex) {
  const a = wb.answers[ex.id] || [];
  return a.some((v) => (Array.isArray(v) ? v.length : String(v ?? '').trim()));
}
function wbAnswerSave(el) {
  const eid = el.dataset.wbId,
    index = Number(el.dataset.wbIndex),
    ex = wbEx(eid);
  if (!ex) return;
  wb.answers[eid] = wb.answers[eid] || [];
  let val = el.value;
  if (ex.kind === 'multi') {
    const v = Array.isArray(wb.answers[eid][index]) ? [...wb.answers[eid][index]] : [];
    wb.answers[eid][index] = el.checked
      ? Array.from(new Set([...v, val]))
      : v.filter((x) => x !== val);
  } else wb.answers[eid][index] = val;
  wbSave();
}
function wbCorrect(ex, q, val) {
  if (ex.kind === 'free') return null;
  if (ex.kind === 'multi') {
    const v = Array.isArray(val) ? val : [];
    return v.length === q.answers.length && v.every((x) => q.answers.includes(x));
  }
  if (['fill', 'order'].includes(ex.kind)) return norm(val) === norm(q.answer);
  return val === q.answer;
}
function wbGrade() {
  const ex = wbCurrent();
  if (!ex) return;
  const ans = wb.answers[ex.id] || [];
  let total = 0,
    score = 0;
  ex.items.forEach((q, i) => {
    const ok = wbCorrect(ex, q, ans[i]);
    if (ok !== null) {
      total++;
      if (ok) score++;
    }
  });
  wb.results[ex.id] = { score, total, when: today() };
  wbSave();
  data.workbookActivity = data.workbookActivity || {};
  const a = data.workbookActivity[today()] || { attempts: 0, good: 0 };
  a.attempts++;
  if (score === total) a.good++;
  data.workbookActivity[today()] = a;
  save();
  render();
  const f = document.getElementById('wbResult');
  if (f) f.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function wbSetWord(btn) {
  const input = document.querySelector(
    `[data-wb-id="${CSS.escape(btn.dataset.wbId)}"][data-wb-index="${btn.dataset.wbIndex}"]`
  );
  if (!input) return;
  input.value = (input.value + ' ' + btn.dataset.word).trim();
  wbAnswerSave(input);
  input.focus();
}
function wbFeedback(ex, q, i) {
  if (!wb.results[ex.id]) return '';
  const v = (wb.answers[ex.id] || [])[i],
    ok = wbCorrect(ex, q, v);
  const answer = ex.kind === 'multi' ? q.answers.join(', ') : q.answer;
  return ok === null
    ? `<div class="wb-feedback neutral">Exemplo para comparar: <strong>${escapeHTML(q.model || '')}</strong><p>Esta produção é aberta e não recebe correção automática.</p></div>`
    : `<div class="wb-feedback ${ok ? 'correct' : 'wrong'}">${ok ? '✓ Correto' : `Resposta esperada: <strong>${escapeHTML(answer)}</strong>`}</div>`;
}
function wbInput(ex, q, i) {
  const ans = (wb.answers[ex.id] || [])[i],
    attr = `data-wb-id="${escapeHTML(ex.id)}" data-wb-index="${i}"`;
  if (['choice', 'audio', 'tf'].includes(ex.kind)) {
    const options = ex.kind === 'tf' ? ['V', 'F'] : wbOptions(q.options || [], ex.id + ':' + i);
    return `<div class="wb-options">${options.map((x) => `<label class="wb-choice"><input type="radio" name="wb-${ex.id}-${i}" ${attr} value="${escapeHTML(x)}" ${ans === x ? 'checked' : ''}><span>${x === 'V' ? 'Verdadeiro' : x === 'F' ? 'Falso' : escapeHTML(x)}</span></label>`).join('')}</div>`;
  }
  if (ex.kind === 'multi') {
    const a = Array.isArray(ans) ? ans : [];
    return `<div class="wb-options">${wbOptions(q.options || [], ex.id + ':' + i)
      .map(
        (x) =>
          `<label class="wb-choice"><input type="checkbox" ${attr} value="${escapeHTML(x)}" ${a.includes(x) ? 'checked' : ''}><span>${escapeHTML(x)}</span></label>`
      )
      .join('')}</div>`;
  }
  if (ex.kind === 'match') {
    const opts = wbOptions(
      ex.items.map((x) => x.answer),
      ex.id + ':' + i
    );
    return `<select class="select wb-select" ${attr}><option value="">Escolha a correspondência…</option>${opts.map((x) => `<option value="${escapeHTML(x)}" ${ans === x ? 'selected' : ''}>${escapeHTML(x)}</option>`).join('')}</select>`;
  }
  if (ex.kind === 'free')
    return `<textarea class="wb-textarea" ${attr} placeholder="Sua resposta em espanhol…">${escapeHTML(ans || '')}</textarea>`;
  return `${
    ex.kind === 'order'
      ? `<div class="wb-wordbank">${q.prompt
          .split(' / ')
          .map(
            (word) =>
              `<button class="wb-token" data-act="wb-word" data-wb-id="${escapeHTML(ex.id)}" data-wb-index="${i}" data-word="${escapeHTML(word)}">${escapeHTML(word)}</button>`
          )
          .join('')}</div>`
      : ''
  }<input class="wb-input" ${attr} value="${escapeHTML(ans || '')}" placeholder="Escreva sua resposta…" autocomplete="off" spellcheck="false">`;
}
function wbExerciseScreen(ex) {
  const unit = wbUnit(ex.unit),
    arr = BOOK_EX.filter((x) => x.unit === ex.unit),
    idx = arr.findIndex((x) => x.id === ex.id),
    done = wb.results[ex.id];
  return `${heading('CADERNO / UNIDADE ' + ex.unit, ex.title, `Exercício ${ex.exercise} · página ${ex.page} · ${unit.title}`)}
<div class="wb-back-row"><button class="btn secondary sm" data-act="wb-unit" data-unit="${ex.unit}">← Voltar à unidade</button><button class="btn secondary sm" data-act="wb-review">${wb.review[ex.id] ? '★ Remover da revisão' : '☆ Marcar para revisar'}</button></div>
<div class="card wb-sheet"><div class="wb-meta"><span class="chip">${escapeHTML(WB_TYPE[ex.kind])}</span><span class="chip">${ex.items.length} questão(ões)</span><span class="chip">Pág. ${ex.page} · exercício ${ex.exercise}</span></div>
<p class="wb-guide">${escapeHTML(WB_PT[ex.kind])} <button class="inline-translation" data-act="wb-help">${ui.wbHelp ? 'Ocultar ajuda' : 'Ver ajuda em português'}</button></p>
${ui.wbHelp ? `<div class="wb-help"> <b>Como resolver:</b> ${escapeHTML(WB_PT[ex.kind])}<br><b>O que você vai praticar:</b> ${escapeHTML(ex.title)}.<br><b>Vocabulário:</b> Completa = complete · Relaciona = associe · Escribe = escreva · Elige = escolha · ¿Dónde? = onde · ¿Qué? = o quê.</div>` : ''}
${ex.items
  .map(
    (
      q,
      i
    ) => `<section class="wb-question"><div class="wb-question-number">QUESTÃO ${i + 1} / ${ex.items.length}</div>${ex.kind === 'audio' ? `<div class="wb-audio"><button class="btn secondary sm" data-act="wb-speak" data-index="${i}">▶ Ouvir texto</button><button class="btn secondary sm" data-act="wb-transcript" data-index="${i}">${ui.wbTranscripts[ex.id + '|' + i] ? 'Ocultar transcrição' : 'Ver transcrição'}</button></div>${ui.wbTranscripts[ex.id + '|' + i] ? `<p class="muted small">${escapeHTML(q.audio)}</p>` : ''}` : ''}
<div class="wb-question-text" lang="es">${escapeHTML(q.prompt)}</div>${wbInput(ex, q, i)}${wbFeedback(ex, q, i)}</section>`
  )
  .join('')}
<div class="wb-actions"><button class="btn" data-act="wb-check">${done ? 'Corrigir novamente' : 'Conferir respostas'}</button><button class="btn secondary sm" data-act="wb-clear">Limpar</button></div>
${done ? `<div class="wb-score" id="wbResult"><strong>${done.total ? `Você acertou ${done.score} de ${done.total}` : 'Produção escrita registrada'}</strong><div>${done.total ? (done.score === done.total ? 'Muito bem! Você pode continuar.' : 'Compare as respostas e tente de novo.') : 'Compare seu texto com o exemplo e veja o que pode melhorar.'}</div></div>` : ''}</div>
<div class="card wb-notes"><h3>Minhas anotações</h3><textarea id="wbNotes" placeholder="Dúvidas ou palavras novas…">${escapeHTML(wb.notes[ex.id] || '')}</textarea><div class="muted tiny">Salvo automaticamente neste dispositivo.</div></div>
<div class="wb-actions wb-next"><button class="btn secondary" data-act="wb-prev" ${idx === 0 ? 'disabled' : ''}>← Anterior</button><button class="btn" data-act="wb-next" ${idx === arr.length - 1 ? 'disabled' : ''}>Próximo exercício →</button></div>`;
}
function wbUnitScreen() {
  const unit = wbUnit(ui.wbUnit),
    all = BOOK_EX.filter((x) => x.unit === unit.id),
    done = all.filter(wbDone).length,
    groups = new Map();
  let filtered = all.filter(
    (x) =>
      (ui.wbFilter === 'all' ||
        (ui.wbFilter === 'pending' && !wbDone(x)) ||
        (ui.wbFilter === 'completed' && wbDone(x)) ||
        (ui.wbFilter === 'review' && wb.review[x.id])) &&
      norm(x.title + ' ' + x.exercise + ' ' + x.page).includes(norm(ui.wbQuery || ''))
  );
  filtered.forEach((x) => {
    if (!groups.has(x.page)) groups.set(x.page, []);
    groups.get(x.page).push(x);
  });
  return `${heading('LIVRO DE EXERCÍCIOS · A1', 'Unidad ' + unit.id + ' · ' + unit.title, unit.subtitle)}
<div class="wb-back-row"><button class="btn secondary sm" data-act="wb-overview">← Todas as unidades</button><span class="chip">${done} / ${all.length} concluídos</span></div><div class="progress-track" style="margin:8px 0 20px"><div class="progress-fill" style="width:${Math.round((done / all.length) * 100)}%"></div></div>
<div class="wb-controls"><input id="wbSearch" class="field" placeholder="Buscar exercício…" value="${escapeHTML(ui.wbQuery)}"><select id="wbFilter" class="select"><option value="all" ${ui.wbFilter === 'all' ? 'selected' : ''}>Todos</option><option value="pending" ${ui.wbFilter === 'pending' ? 'selected' : ''}>Pendentes</option><option value="completed" ${ui.wbFilter === 'completed' ? 'selected' : ''}>Concluídos</option><option value="review" ${ui.wbFilter === 'review' ? 'selected' : ''}>Para revisar</option></select></div>
<div id="wbUnitList" class="wb-page-grid">${wbUnitGroupsHTML(groups)}</div>`;
}
function wbUnitGroupsHTML(groups) {
  return (
    [...groups]
      .map(
        ([pg, items]) =>
          `<section class="card wb-group"><div class="wb-group-title">Página ${pg} <span>${items.length} atividades</span></div>${items.map((e) => `<button class="wb-ex-row" data-act="wb-open" data-id="${escapeHTML(e.id)}"><span class="wb-ex-number">${escapeHTML(e.exercise)}</span><span class="wb-ex-details"><strong>${escapeHTML(e.title)}</strong><small>${escapeHTML(WB_TYPE[e.kind])} · ${e.items.length} questão(ões)</small></span><span class="wb-ex-state">${wbDone(e) ? '✓' : wb.review[e.id] ? '★' : '›'}</span></button>`).join('')}</section>`
      )
      .join('') || '<div class="card">Nenhum exercício encontrado neste filtro.</div>'
  );
}
function wbOverviewScreen() {
  let completed = BOOK_EX.filter(wbDone).length;
  return `${heading('FRECUENCIAS A1', 'Caderno de exercícios', 'Escolha uma unidade, continue de onde parou e pratique quando quiser.')}
<div class="wb-note">As atividades seguem os conteúdos das dez unidades. Algumas foram ajustadas para facilitar o estudo online.</div>
<div class="wb-summary"><div><strong>${completed}</strong><span>atividades concluídas</span></div><div><strong>${BOOK_EX.length}</strong><span>atividades disponíveis</span></div><div><strong>${BOOK_EX.filter((x) => wb.review[x.id]).length}</strong><span>marcadas para revisão</span></div></div>
<div class="wb-actions"><button class="btn" data-act="wb-open" data-id="${escapeHTML(wbEx(wb.last) ? wb.last : 'u1-1')}">Continuar de onde parei →</button></div>
<div class="wb-units">${BOOK_UNITS.map((u) => {
    const n = wbUnitCount(u.id),
      pct = Math.round((100 * n) / u.count);
    return `<button class="card wb-unit-tile" data-act="wb-unit" data-unit="${u.id}"><span class="wb-unit-number">${String(u.id).padStart(2, '0')}</span><span class="wb-unit-info"><b>${escapeHTML(u.title)}</b><small>${escapeHTML(u.subtitle)}</small><span class="wb-unit-bar"><span style="width:${pct}%"></span></span><span class="wb-unit-stat">${n}/${u.count} concluídos · ${pct}%</span></span><span class="wb-chevron">›</span></button>`;
  }).join('')}</div>`;
}
function renderWorkbook() {
  return ui.wbExercise
    ? wbExerciseScreen(wbCurrent())
    : ui.wbUnit
      ? wbUnitScreen()
      : wbOverviewScreen();
}

const STORAGE_KEY = 'habla_espanol_2026_v1';
const NAV = [
  { key: 'home', label: 'Início', icon: 'home' },
  { key: 'lab', label: 'Revisão inteligente', icon: 'spark' },
  { key: 'diagnostic', label: 'Diagnóstico por habilidades', icon: 'chart' },
  { key: 'dialogues', label: 'Conversação progressiva', icon: 'users' },
  { key: 'library', label: 'Estruturas', icon: 'book' },
  { key: 'practice', label: 'Praticar', icon: 'play' },
  { key: 'reviews', label: 'Revisões', icon: 'clock' },
  { key: 'board', label: 'Durante a aula', icon: 'message' },
  { key: 'doubts', label: 'Caderno de dúvidas', icon: 'message' },
  { key: 'scenarios', label: 'Simular conversa', icon: 'users' },
  { key: 'verbs', label: 'Conjugação · 90 verbos', icon: 'book' },
  { key: 'workbook', label: 'Caderno A1 · 10 unidades', icon: 'book' },
  { key: 'progress', label: 'Meu progresso', icon: 'chart' },
];
const NAV_GROUPS = [
  {
    key: 'study',
    label: 'Estudar',
    icon: 'book',
    pages: ['lab', 'library', 'verbs', 'workbook', 'practice', 'reviews'],
  },
  {
    key: 'conversation',
    label: 'Conversar',
    icon: 'users',
    pages: ['diagnostic', 'dialogues', 'scenarios'],
  },
  { key: 'class', label: 'Apoio à aula', icon: 'message', pages: ['board', 'doubts'] },
];
// Estado visual do menu, independente do histórico acadêmico.
let navExpanded = null;
const PATHS = {
  home: '<path d="m3 10 9-7 9 7"/><path d="M5 9v12h14V9"/><path d="M9 21v-7h6v7"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  play: '<path d="m8 5 11 7-11 7z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  message:
    '<path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H5l-3 3V12a9 9 0 1 1 18-0.5z"/><path d="M7 11h10M7 15h6"/>',
  users:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  chart: '<path d="M3 3v18h18"/><path d="M7 16v-4M12 16V7M17 16v-7"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>',
  moon: '<path d="M20.5 13a9 9 0 0 1-9.5-9.5A9 9 0 1 0 20.5 13z"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  back: '<path d="M19 12H5m6 6-6-6 6-6"/>',
  sound: '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7m3-10a9 9 0 0 1 0 13"/>',
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5m-4 0h8"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  spark:
    '<path d="m12 3 1.5 6.5L20 11l-6.5 1.5L12 19l-1.5-6.5L4 11l6.5-1.5z"/><path d="m19 18 .5 1.5L21 20l-1.5.5L19 22l-.5-1.5L17 20l1.5-.5z"/>',
  heart:
    '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 1 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>',
  download: '<path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4"/>',
  upload: '<path d="M12 21V9m-4 4 4-4 4 4M4 7V3h16v4"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2m3 0-1 15H6L5 6M10 10v7m4-7v7"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.3"/>',
  shuffle: '<path d="M18 14l4 4-4 4m-12-16L2 6l4 4M2 6h4a8 8 0 0 1 8 8m8 4h-4a8 8 0 0 1-8-8"/>',
  focus:
    '<path d="M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 1-2 2h-3"/>',
  life: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="m6 6 3 3m6 6 3 3M18 6l-3 3m-6 6-3 3"/>',
  ear: '<path d="M6 10a6 6 0 0 1 12 0c0 3-2 4-4 6-1 1-1 5-4 5a4 4 0 0 1-4-4"/>',
  question: '<circle cx="12" cy="12" r="10"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5m0 3v.5"/>',
  monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8m-4-4v4"/>',
  next: '<path d="m9 18 6-6-6-6"/>',
  close: '<path d="M5 5 19 19M19 5 5 19"/>',
  pencil: '<path d="m4 20 4-.7L20 7.3 16.7 4 4.7 16 4 20z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 5 5"/>',
  star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8l-6.2 3.2L7 14.2l-5-4.9 6.9-1z"/>',
};
function ico(name, size = 19) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name] || PATHS.info}</svg>`;
}
function escapeHTML(s) {
  return String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
}
function loadStore() {
  try {
    const v = JSON.parse(window.HablaStore.getItem(STORAGE_KEY));
    return v && typeof v === 'object' ? v : {};
  } catch (e) {
    return {};
  }
}
let data = Object.assign(
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
function save() {
  try {
    window.HablaStore.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    toast('Não foi possível salvar. Confira o armazenamento do navegador.');
  }
}
let ui = {
  calOffset: 0,
  wbUnit: null,
  wbExercise: null,
  wbQuery: '',
  wbFilter: 'all',
  wbHelp: false,
  wbTranscripts: {},
  page: 'home',
  libraryQuery: '',
  libraryCategory: 'Todas',
  libraryLevel: 'Todos',
  libraryOnly: 'Todas',
  studyId: null,
  showPT: true,
  boardTab: 0,
  boardSearch: '',
  scenarioIndex: 0,
  scenarioScene: 'professor',
  scenarioTurn: 0,
  scenarioMode: 'guided',
  scenarioGrades: [],
  scenarioFilter: 'Todas',
  scenarioShowPT: false,
  scenarioReveal: false,
  scenarioAnswer: '',
  practiceMode: 'translate',
  practiceSource: 'all',
  practiceCategory: 'Todas',
  practiceCount: 10,
  practicePattern: null,
  session: null,
  showHint: false,
  checked: false,
  currentAnswer: '',
  trainingOrigin: 'practice',
  listening: false,
  focusLearn: false,
};
ui.verbTab = 'learn';
ui.verbUnit = '1';
ui.verbChoice = 'ser';
ui.verbPronoun = 'all';
ui.verbMode = 'type';
ui.verbReviewOnly = false;
ui.verbQuestion = null;
ui.verbHistory = [];
ui.verbRecentContexts = {};
ui.verbTranslatedExamples = [];
ui.verbShowAllPT = false;
ui.verbSpecial = false;
ui.verbShowTable = false;
ui.verbPT = false;
ui.verbHint = false;
ui.verbReveal = false;
ui.verbTyped = '';
ui.verbPicked = '';
ui.verbResult = null;
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function addDays(d, days) {
  const k = new Date(d + 'T12:00:00');
  k.setDate(k.getDate() + days);
  return `${k.getFullYear()}-${String(k.getMonth() + 1).padStart(2, '0')}-${String(k.getDate()).padStart(2, '0')}`;
}
function allStructures() {
  const own = (data.custom || [])
    .filter((x) => x && x.id && x.es && x.pt)
    .map((x) => ({
      id: x.id,
      title: x.label || 'Minha frase',
      formula: x.es,
      category: 'Minhas frases',
      level: 'Pessoal',
      purpose: 'Frase que você adicionou depois de uma aula.',
      tip: 'Reveja sempre que precisar.',
      examples: [{ id: x.id + 'e0', es: x.es, pt: x.pt }],
    }));
  return STRUCTURES.concat(own);
}
function allCards() {
  return allStructures().flatMap((st) =>
    st.examples.map((ex) => ({
      ...ex,
      patternId: st.id,
      category: st.category,
      formula: st.formula,
      patternTitle: st.title,
      level: st.level,
      tip: st.tip,
    }))
  );
}
function getStructure(id) {
  return allStructures().find((p) => p.id === id);
}
function getCard(id) {
  return allCards().find((x) => x.id === id);
}
function dueCards() {
  const now = today();
  return allCards().filter((x) => data.progress[x.id]?.due && data.progress[x.id].due <= now);
}
function progressCount() {
  return Object.keys(data.progress).filter((id) => data.progress[id]?.seen).length;
}
function masteredCount() {
  return Object.values(data.progress).filter((x) => x && x.reps >= 2 && x.lastGrade !== 'again')
    .length;
}
function lifetimeAttempts() {
  return studiedDates().reduce((n, d) => n + dayActivity(d).attempts, 0);
}
function activityToday() {
  return dayActivity(today());
}
function activityLast(n = 7) {
  return Array.from({ length: n }, (_, i) => {
    const d = addDays(today(), i - n + 1);
    return { date: d, attempts: dayActivity(d).attempts };
  });
}
function streak() {
  let n = 0,
    d = today();
  if (dayActivity(d).attempts === 0) d = addDays(d, -1);
  while (dayActivity(d).attempts > 0) {
    n++;
    d = addDays(d, -1);
    if (n > 9999) break;
  }
  return n;
}
function statusOfPattern(p) {
  const ps = p.examples.map((x) => data.progress[x.id]).filter((x) => x?.seen);
  if (!ps.length) return 'Novo';
  if (ps.length === p.examples.length && ps.every((x) => x.reps >= 2)) return 'Consolidando';
  return 'Em prática';
}
function fav(id) {
  return !!data.favorites[id];
}
function chip(t, color = '') {
  return `<span class="chip ${color}">${escapeHTML(t)}</span>`;
}
function navBtn(it) {
  return `<button class="nav-link ${ui.page === it.key ? 'active' : ''}" data-act="nav" data-page="${it.key}">${ico(it.icon, 19)} <span>${escapeHTML(it.label)}</span>${it.key === 'reviews' && dueCards().length ? `<span class="count">${dueCards().length}</span>` : it.key === 'doubts' && (data.doubts || []).some((x) => x.status === 'pending') ? `<span class="count">${data.doubts.filter((x) => x.status === 'pending').length}</span>` : ''}</button>`;
}
function renderChrome() {
  navExpanded = document.querySelector('#sidebarNav details[open]')?.dataset.navGroup || null;
  const currentGroup = NAV_GROUPS.find(
    (group) => group.pages.includes(ui.page) || (ui.page === 'study' && group.key === 'study')
  );
  document.getElementById('sidebarNav').innerHTML =
    navBtn(NAV[0]) +
    NAV_GROUPS.map((group) => {
      const current =
        group.pages.includes(ui.page) || (ui.page === 'study' && group.key === 'study');
      const expanded = currentGroup ? current : navExpanded === group.key;
      return `<details class="nav-group" name="study-navigation" data-nav-group="${group.key}" ${expanded ? 'open' : ''}><summary>${ico(group.icon)}<span>${group.label}</span>${ico('next', 15)}</summary><div class="nav-group-links">${group.pages.map((key) => navBtn(NAV.find((item) => item.key === key))).join('')}${group.key === 'class' ? `<button class="nav-link nav-resource" data-resources-open>${ico('search')}<span>Consultar espanhol</span></button>` : ''}</div></details>`;
    }).join('') +
    '<div class="nav-personal">' +
    navBtn(NAV.find((item) => item.key === 'progress')) +
    `<button class="nav-link" data-account="open">${ico('users')}<span>Conta e sincronização</span></button></div>`;
  const dc = document.getElementById('doubtFabCount');
  if (dc) {
    const n = (data.doubts || []).filter((x) => x.status === 'pending').length;
    dc.hidden = !n;
    dc.textContent = n > 99 ? '99+' : String(n);
  }
  document.getElementById('breadcrumb').textContent =
    'habla / ' + (NAV.find((x) => x.key === ui.page)?.label || 'Estrutura');
  document.getElementById('themeBtn').innerHTML = ico(data.theme === 'dark' ? 'sun' : 'moon', 18);
  document.getElementById('sidebarBottom').innerHTML =
    `<div class="mini-label">Sua meta diária</div><strong>${Math.min(activityToday().attempts, data.dailyGoal)} / ${data.dailyGoal} atividades</strong><p>🔥 ${streak()} dias seguidos · ${studiedDays()} dias ativos</p><div class="progress-track"><div class="progress-fill" style="width:${Math.min(100, (100 * activityToday().attempts) / data.dailyGoal)}%"></div></div><button class="btn secondary sm" data-act="guide-replay" style="width:100%;margin-top:13px">Ver apresentação de novo</button>`;
  const short = { home: 'Início', lab: 'Revisão', verbs: 'Verbos', workbook: 'Caderno' };
  document.getElementById('mobileNav').innerHTML =
    ['home', 'lab', 'verbs', 'workbook']
      .map((k) => NAV.find((n) => n.key === k))
      .map(
        (it) =>
          `<button aria-label="${short[it.key]}" data-act="nav" data-page="${it.key}" class="${ui.page === it.key ? 'active' : ''}">${ico(it.icon, 21)}<span>${short[it.key]}</span></button>`
      )
      .join('') +
    `<button data-act="more-open" aria-label="Abrir todos os recursos" class="${['board', 'doubts', 'diagnostic', 'dialogues', 'scenarios', 'reviews', 'progress', 'library', 'study', 'practice'].includes(ui.page) ? 'active' : ''}">${ico('message', 21)}<span>Mais</span></button>`;
}
function closeMore() {
  document.getElementById('moreRoot').innerHTML = '';
}
function openMore() {
  const mobileItem = (it) =>
    `<button data-act="more-nav" data-page="${it.key}" class="${ui.page === it.key ? 'active' : ''}">${ico(it.icon, 19)}<span>${escapeHTML(it.label)}</span></button>`;
  document.getElementById('moreRoot').innerHTML =
    `<div class="more-overlay" data-act="more-close"><section class="more-sheet" role="dialog" aria-modal="true" aria-label="Todos os recursos"><div class="sheet-grip"></div><div class="row between"><h2>Seu espaço de estudo</h2><button class="icon-btn" data-act="more-close" aria-label="Fechar menu">×</button></div>${NAV_GROUPS.map((group) => `<section class="more-group"><h3>${group.label}</h3><div class="more-grid">${group.pages.map((key) => mobileItem(NAV.find((item) => item.key === key))).join('')}${group.key === 'class' ? `<button class="nav-resource" data-resources-open>${ico('search')}<span>Consultar espanhol</span></button>` : ''}</div></section>`).join('')}<section class="more-group"><h3>Minha conta</h3><div class="more-grid">${mobileItem(NAV[0])}${mobileItem(NAV.find((item) => item.key === 'progress'))}<button data-account="open">${ico('users')}<span>Conta e sincronização</span></button></div></section><div class="row wrap"><button class="btn secondary sm" data-act="guide-replay">▶ Ver tutorial inicial</button><button class="btn secondary sm" data-act="guide-screen-replay">? Como usar esta tela</button><button class="btn secondary sm" data-act="install-help">⊕ Adicionar à tela inicial</button></div></section></div>`;
}
function installHelp() {
  closeMore();
  if (installEvent) {
    installEvent.prompt();
    installEvent.userChoice.finally(() => (installEvent = null));
    return;
  }
  const isIos = /iPhone|iPad/i.test(navigator.userAgent);
  toast(
    isIos
      ? 'No Safari: Compartilhar → Adicionar à Tela de Início.'
      : 'No menu do navegador, escolha Instalar aplicativo ou Adicionar à tela inicial.'
  );
}
function go(page) {
  if (ui.listening) stopListening();
  if (guideFlow?.type !== 'welcome') {
    guideFlow = null;
    guideRemoveHighlight();
    guideRoot().innerHTML = '';
  }
  closeMore();
  ui.page = page;
  ui.showHint = false;
  ui.checked = false;
  if (page === 'workbook') {
    ui.wbExercise = null;
    ui.wbUnit = null;
  }
  render();
  window.scrollTo({ top: 0, behavior: 'instant' });
  if (guideFlow?.type !== 'welcome') guideShowPage(false);
}
function render() {
  window.HablaAudio?.stop();
  document.documentElement.dataset.theme = data.theme === 'dark' ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]').content =
    data.theme === 'dark' ? '#111111' : '#fafafa';
  renderChrome();
  const views = {
    diagnostic: () =>
      window.HablaCoach
        ? window.HablaCoach.diagnostic()
        : heading('Diagnóstico', 'Carregando', 'Atualize a página.'),
    dialogues: () =>
      window.HablaCoach
        ? window.HablaCoach.dialogues()
        : heading('Conversação', 'Carregando', 'Atualize a página.'),
    doubts: () =>
      window.HablaDoubts
        ? window.HablaDoubts.render()
        : heading('Dúvidas', 'Carregando', 'Atualize a página se necessário.'),
    lab: () =>
      window.HablaLab
        ? window.HablaLab.render()
        : heading('Revisão', 'Carregando', 'Atualize a página se necessário.'),
    home: renderHome,
    library: renderLibrary,
    study: renderStudy,
    practice: renderPractice,
    reviews: renderReviews,
    board: renderBoard,
    scenarios: renderScenarios,
    verbs: renderVerbs,
    workbook: renderWorkbook,
    progress: renderProgress,
  };
  document.getElementById('app').innerHTML = (views[ui.page] || renderHome)();
  window.HablaAccounts?.refresh();
  window.dispatchEvent(new Event('habla:render'));
}
function heading(kicker, title, subtitle, extra = '') {
  return `<div class="page-head"><div><div class="eyebrow">${escapeHTML(kicker)}</div><h1>${escapeHTML(title)}</h1><p>${escapeHTML(subtitle)}</p></div>${extra}</div>`;
}
function renderHome() {
  const due = dueCards().length;
  const total = allStructures().length,
    cards = allCards().length;
  return `
<section class="hero"><div class="hero-inner"><div class="eyebrow">SEU LABORATÓRIO DE ESPANHOL</div><h1>Fale primeiro.<br>Corrija depois.</h1><p>Não precisa montar frases perfeitas de primeira. Treine estruturas reutilizáveis, pratique como numa aula e revise o que o cérebro quase esqueceu.</p><div class="row wrap hero-buttons"><button class="btn" data-act="quick-practice">${ico('play', 17)} Começar treino curto</button><button class="btn secondary" data-act="nav" data-page="board">${ico('message', 17)} Abrir apoio da aula</button></div></div></section>
<div class="grid four" style="margin:18px 0 30px"><div class="card stat"><div class="stat-label">${ico('book', 15)} Estruturas</div><div class="value">${total}</div><div class="detail">${cards} frases para treinar</div></div><div class="card stat"><div class="stat-label">${ico('clock', 15)} Para revisar</div><div class="value">${due}</div><div class="detail">Vencidas até hoje</div></div><div class="card stat"><div class="stat-label">${ico('check', 15)} Já praticadas</div><div class="value">${progressCount()}</div><div class="detail">Frases diferentes</div></div><div class="card stat"><div class="stat-label">${ico('spark', 15)} Sequência</div><div class="value">${streak()}</div><div class="detail">Dias com prática</div></div></div>
${renderMiniStreak()}<div class="section-title"><h2>Escolha como quer praticar</h2></div><div class="card" style="padding:18px;margin-bottom:17px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><div><strong>🧠 Revisão inteligente</strong><p class="muted small" style="margin:5px 0">Selecione quantas unidades quiser e combine ditado, conjugação, conversação e exercícios.</p></div><button class="btn primary" data-act="nav" data-page="lab">Montar meu estudo</button></div><div class="grid three">
<button class="quick-tile" data-act="nav" data-page="library"><span class="tile-ico">${ico('book')}</span><b>Estudar uma estrutura</b><span>Entenda a fórmula e veja variações antes de produzir suas frases.</span></button>
<button class="quick-tile" data-act="start-random"><span class="tile-ico">${ico('shuffle')}</span><b>Treinar aleatoriamente</b><span>Produza frases de temas misturados sem olhar a resposta.</span></button>
<button class="quick-tile" data-act="start-review"><span class="tile-ico">${ico('clock')}</span><b>Revisão espaçada</b><span>${due ? 'Você tem ' + due + ' frases esperando revisão.' : 'Tudo em dia. Você pode conhecer novas frases.'}</span></button>
<button class="quick-tile" data-act="nav" data-page="diagnostic"><span class="tile-ico">${ico('chart')}</span><b>Diagnóstico por habilidades</b><span>Descubra suas maiores dificuldades e monte um plano de reforço por unidade.</span></button>
<button class="quick-tile" data-act="nav" data-page="dialogues"><span class="tile-ico">${ico('users')}</span><b>Conversação progressiva</b><span>Pratique 20 cenários com ajuda gradual e repita as falas difíceis.</span></button>
<button class="quick-tile" data-act="nav" data-page="doubts"><span class="tile-ico">${ico('message')}</span><b>Caderno de dúvidas</b><span>Guarde suas perguntas, leve para o Víctor e registre a explicação depois da aula.</span></button>
<button class="quick-tile" data-act="nav" data-page="board"><span class="tile-ico">${ico('message')}</span><b>Cola durante a aula</b><span>Frases de emergência em espanhol, por situação.</span></button>
<button class="quick-tile" data-act="nav" data-page="scenarios"><span class="tile-ico">${ico('users')}</span><b>Simular uma conversa</b><span>Pratique diálogos de aula, café, compras, viagens, trabalho e mais.</span></button>
<button class="quick-tile" data-act="nav" data-page="verbs"><span class="tile-ico">${ico('book')}</span><b>Conjugar em frases</b><span>90 verbos, mais de 4.300 frases, áudio, tradução e revisão dos erros.</span></button>
 <button class="quick-tile" data-act="nav" data-page="workbook"><span class="tile-ico">${ico('book')}</span><b>Exercícios por unidade</b><span>Pratique 236 atividades organizadas pelas dez unidades do Frecuencias A1.</span></button>
 <button class="quick-tile" data-act="nav" data-page="progress"><span class="tile-ico">${ico('chart')}</span><b>Ver minha evolução</b><span>Confira seus hábitos e salve as frases que faltaram na aula.</span></button></div>
<div style="height:29px"></div><div class="section-title"><h2>O método: menos releitura, mais lembrança</h2></div><div class="info-steps"><div class="info-step"><span class="num">1</span><div><b>Reconheça a estrutura</b><p>Leia 2 ou 3 exemplos e entenda onde trocar as palavras.</p></div></div><div class="info-step"><span class="num">2</span><div><b>Tente recuperar sem olhar</b><p>Fale primeiro; digite ou revele a resposta depois.</p></div></div><div class="info-step"><span class="num">3</span><div><b>Revise perto do esquecimento</b><p>Marque como foi a lembrança; o painel agenda o próximo contato.</p></div></div></div>
<p class="footer-note">Conteúdo em espanhol latino-americano amplamente compreensível (tú / ustedes). O acervo mistura A1 e algumas estruturas A1+ úteis em aula. Você pode estudar até sem internet depois do primeiro acesso. Use o áudio e o microfone quando estiverem disponíveis.</p>`;
}
function getFilteredPatterns() {
  const q = norm(ui.libraryQuery),
    arr = allStructures();
  return arr.filter((s) => {
    if (ui.libraryCategory !== 'Todas' && s.category !== ui.libraryCategory) return false;
    if (ui.libraryLevel !== 'Todos' && s.level !== ui.libraryLevel) return false;
    if (ui.libraryOnly === 'Favoritas' && !fav(s.id)) return false;
    if (ui.libraryOnly === 'Em prática' && statusOfPattern(s) === 'Novo') return false;
    const hay = [
      s.title,
      s.formula,
      s.purpose,
      s.category,
      ...s.examples.map((x) => x.es + ' ' + x.pt),
    ].join(' ');
    return !q || norm(hay).includes(q);
  });
}
function patternCard(s) {
  return `<article class="pattern-card" role="button" tabindex="0" data-act="study" data-id="${escapeHTML(s.id)}"><button aria-label="${fav(s.id) ? 'Remover favorito' : 'Favoritar estrutura'}" title="Favoritar estrutura" class="heart ${fav(s.id) ? 'saved' : ''}" data-act="favorite" data-id="${escapeHTML(s.id)}">${ico('heart', 18)}</button><div class="row wrap">${chip(s.level, s.level === 'A1' ? 'green' : '')} ${chip(statusOfPattern(s), statusOfPattern(s) === 'Em prática' ? 'orange' : '')}</div><div class="pattern-formula">${escapeHTML(s.formula)}</div><p>${escapeHTML(s.purpose)}</p><div class="bottom"><span class="tag">${escapeHTML(s.category)} · ${s.examples.length} exemplos</span><span class="go">Estudar ${ico('arrow', 14)}</span></div></article>`;
}
function renderLibraryList() {
  const arr = getFilteredPatterns();
  const el = document.getElementById('libraryList');
  if (el)
    el.innerHTML = arr.length
      ? arr.map(patternCard).join('')
      : `<div class="empty" style="grid-column:1/-1"><h3>Nenhuma estrutura encontrada</h3><p>Tente outra busca ou remova os filtros.</p><button class="btn secondary sm" data-act="clear-filters">Limpar filtros</button></div>`;
  const label = document.getElementById('libraryCount');
  if (label) label.textContent = arr.length + ' estruturas encontradas';
}
function renderLibrary() {
  const groups = ['Todas', ...GROUPS, ...((data.custom || []).length ? ['Minhas frases'] : [])];
  const opts = (choices, sel) =>
    choices
      .map(
        (x) =>
          `<option value="${escapeHTML(x)}" ${x === sel ? 'selected' : ''}>${escapeHTML(x)}</option>`
      )
      .join('');
  return `${heading('Aprenda por blocos', 'Biblioteca de estruturas', 'Escolha um padrão de frase, estude algumas variações e pratique só ele — ou misture tudo depois.', `<button class="btn" data-act="nav" data-page="practice">${ico('play', 17)} Montar treino</button>`)}
<div class="tools"><label class="search-wrap">${ico('search', 18)}<input id="librarySearch" placeholder="Buscar em português ou espanhol..." value="${escapeHTML(ui.libraryQuery)}" aria-label="Buscar estruturas" /></label><select class="select" id="filterCat" aria-label="Filtrar por categoria">${opts(groups, ui.libraryCategory)}</select><select class="select" id="filterLevel" aria-label="Filtrar por nível">${opts(['Todos', 'A1', 'A1+', 'Pessoal'], ui.libraryLevel)}</select></div>
<div class="tools"><div class="segment">${['Todas', 'Favoritas', 'Em prática'].map((x) => `<button data-act="only-filter" data-value="${x}" class="${ui.libraryOnly === x ? 'active' : ''}">${x}</button>`).join('')}</div><span id="libraryCount" class="muted small" style="margin-left:auto">${getFilteredPatterns().length} estruturas encontradas</span></div>
<div class="library-list" id="libraryList">${getFilteredPatterns().map(patternCard).join('') || '<p class="muted">Nenhuma estrutura neste filtro.</p>'}</div>`;
}
function renderStudy() {
  const s = getStructure(ui.studyId);
  if (!s)
    return `${heading('Biblioteca', 'Estrutura não encontrada', 'Volte à biblioteca.')}<button class="btn" data-act="nav" data-page="library">Ver estruturas</button>`;
  return `<div class="study-header"><button class="back" data-act="nav" data-page="library">${ico('back', 18)} Voltar à biblioteca</button><span style="margin-left:auto">${chip(s.category)} ${chip(s.level, s.level === 'A1' ? 'green' : '')}</span></div><div class="formula-box"><div class="eyebrow">${escapeHTML(s.title)}</div><h1>${escapeHTML(s.formula)}</h1><p>${escapeHTML(s.purpose)}</p><div class="row wrap" style="margin-top:22px"><button class="btn" data-act="start-pattern" data-id="${escapeHTML(s.id)}">${ico('play', 16)} Praticar esta estrutura</button><button class="btn secondary" data-act="favorite" data-id="${escapeHTML(s.id)}">${ico('heart', 16)} ${fav(s.id) ? 'Favoritada' : 'Favoritar'}</button></div></div>
<div class="grid two" style="margin-top:20px;align-items:start"><div class="card"><div class="row between"><h2>Veja como usar</h2><button class="btn sm secondary" data-act="toggle-pt">${ui.showPT ? 'Ocultar' : 'Mostrar'} português</button></div><p class="muted small" style="margin-top:5px">Fale cada frase em voz alta antes de escutar.</p>${s.examples.map((e, i) => `<div class="example"><div class="row between align-start"><div><div class="es">${escapeHTML(e.es)}</div>${ui.showPT ? `<div class="pt">${escapeHTML(e.pt)}</div>` : ''}</div><button class="icon-btn" data-act="speak" data-text="${escapeHTML(e.es)}" title="Ouvir em espanhol" aria-label="Ouvir frase ${i + 1}">${ico('sound', 17)}</button></div></div>`).join('')}</div>
<div class="stack"><div class="card soft"><div class="subheading">Regra para lembrar</div><p style="color:var(--text)">${escapeHTML(s.tip)}</p></div><div class="card"><h3>Mini rotina de recuperação</h3><div class="stack" style="gap:12px;margin-top:14px"><div class="row align-start"><span class="num">1</span><div class="small">Leia uma das frases e repita em voz alta duas vezes.</div></div><div class="row align-start"><span class="num">2</span><div class="small">Oculte o português e mude uma informação da frase.</div></div><div class="row align-start"><span class="num">3</span><div class="small">Clique em <strong>Praticar esta estrutura</strong> e tente lembrar sem olhar.</div></div></div></div><div class="method"><strong>${statusOfPattern(s)}</strong><br>Esta estrutura tem ${s.examples.length} frases. Um acerto isolado não basta: revisá-la em dias diferentes aumenta a chance de retenção.</div></div></div>`;
}
function renderPractice() {
  if (ui.session) return renderSession();
  const categories = ['Todas', ...GROUPS, ...((data.custom || []).length ? ['Minhas frases'] : [])];
  const practiceModes = [
    ['translate', 'Tradução ativa', 'Veja o português e produza espanhol.'],
    ['cloze', 'Completar', 'Recupere palavras dentro de uma frase.'],
    ['listen', 'Escuta e ditado', 'Ouça a frase e escreva o que entendeu.'],
    ['mental', 'Falar e revelar', 'Responda em voz alta, sem precisar digitar.'],
    ['mixed', 'Misturado', 'Alterna os exercícios anteriores.'],
  ];
  return `${heading('Produção ativa', 'Monte seu treino', 'Escolha um tipo de exercício, um conjunto de frases e quantas tentativas deseja fazer. A resposta só aparece depois da sua tentativa.')}
<div class="grid two" style="align-items:start"><div class="card"><div class="setup-options">
<div><label class="opt-label">1. Tipo de exercício</label><div class="stack" style="gap:7px">${practiceModes.map(([v, n, desc]) => `<button class="choice ${ui.practiceMode === v ? 'active' : ''}" data-act="practice-mode" data-value="${v}" style="display:flex;align-items:center;text-align:left;gap:13px;padding:13px"><span style="flex:1"><strong>${n}</strong><span style="display:block;font-size:11px;font-weight:400;margin-top:4px">${desc}</span></span>${ui.practiceMode === v ? ico('check', 18) : ''}</button>`).join('')}</div></div>
<div><label class="opt-label">2. Seleção de frases</label><div class="choice-row">${[
    ['all', 'Todas'],
    ['unseen', 'Ainda não praticadas'],
    ['favorites', 'Favoritas'],
    ['due', 'Para revisar'],
    ['category', 'Uma categoria'],
    ['custom', 'Minhas frases'],
  ]
    .map(
      ([k, t]) =>
        `<button class="choice ${ui.practiceSource === k ? 'active' : ''}" data-act="practice-source" data-value="${k}">${t}</button>`
    )
    .join('')}</div>${
    ui.practiceSource === 'category'
      ? `<select class="select" style="margin-top:10px;width:100%" id="practiceCategory">${categories
          .filter((x) => x !== 'Todas')
          .map(
            (x) =>
              `<option value="${escapeHTML(x)}" ${ui.practiceCategory === x ? 'selected' : ''}>${escapeHTML(x)}</option>`
          )
          .join('')}</select>`
      : ''
  }</div>
<div><label class="opt-label">3. Duração (número de frases)</label><div class="choice-row">${[5, 10, 20, 30].map((n) => `<button class="choice ${ui.practiceCount === n ? 'active' : ''}" data-act="practice-count" data-value="${n}">${n} frases</button>`).join('')}</div></div></div><button style="margin-top:24px" class="btn full" data-act="start-config">${ico('play', 17)} Iniciar prática</button></div>
<div class="stack"><div class="card soft"><div class="subheading">Como treinar para reter melhor</div><h3>Produza antes de reconhecer.</h3><p class="small" style="margin-top:9px">A sensação de “eu sei quando leio” é diferente de conseguir falar sem ajuda. Digitar ou falar de memória treina a recuperação necessária durante a aula.</p><div class="separator"></div><p class="small">Ao terminar cada exercício, marque <strong>Esqueci, Difícil, Lembrei</strong> ou <strong>Fácil</strong>. Isso determina o intervalo da revisão.</p></div><div class="card"><div class="subheading">Recomendação de hoje</div><h3>${dueCards().length ? `${dueCards().length} frases para revisar` : 'Misture novas frases'}</h3><p class="small" style="margin:8px 0 18px">${dueCards().length ? 'Dê prioridade às frases que já estão no seu ciclo de memória.' : 'Comece com poucas frases, sem excesso de estudo no mesmo dia.'}</p><button class="btn secondary" data-act="${dueCards().length ? 'start-review' : 'quick-practice'}">${dueCards().length ? 'Revisar agora' : 'Treino de 8 frases'} ${ico('arrow', 15)}</button></div><div class="method">Dica: em geral, 8 a 15 frases bem recuperadas são mais úteis que ler 100 frases passivamente. Faça uma sessão curta antes da aula e outra em um dia diferente.</div></div></div>`;
}
function norm(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[«»¿?¡!.,:;()\-\u2014\u2013'“”]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function editDistance(a, b) {
  const m = a.length,
    n = b.length,
    prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let past = prev[0];
    prev[0] = i;
    for (let j = 1; j <= n; j++) {
      let old = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, past + (a[i - 1] === b[j - 1] ? 0 : 1));
      past = old;
    }
  }
  return prev[n];
}
function answerSimilarity(a, b) {
  let x = norm(a),
    y = norm(b);
  if (!x) return 0;
  if (x === y) return 1;
  return Math.max(0, 1 - editDistance(x, y) / Math.max(x.length, y.length));
}
function clozeData(s) {
  const stop = new Set([
    'yo',
    'tu',
    'el',
    'la',
    'lo',
    'los',
    'las',
    'un',
    'una',
    'me',
    'te',
    'se',
    'mi',
    'mis',
    'su',
    'sus',
    'de',
    'del',
    'a',
    'al',
    'en',
    'y',
    'o',
    'por',
    'para',
    'que',
    'es',
  ]);
  const matches = [...s.matchAll(/[\p{L}]+/gu)];
  const match = matches.find((m, i) => i < 6 && !stop.has(norm(m[0]))) || matches[0];
  if (!match) return { display: s, answer: s };
  return {
    display: s.slice(0, match.index) + '_____ ' + s.slice(match.index + match[0].length),
    answer: match[0],
  };
}
function randomSubset(arr, count) {
  const cp = [...arr];
  for (let i = cp.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [cp[i], cp[j]] = [cp[j], cp[i]];
  }
  return cp.slice(0, Math.min(count, cp.length));
}
function getSessionCards(source, count, opts = {}) {
  let items = allCards();
  if (source === 'due')
    items = items
      .filter((x) => data.progress[x.id]?.due && data.progress[x.id].due <= today())
      .sort((a, b) => (data.progress[a.id].due || '').localeCompare(data.progress[b.id].due || ''));
  if (source === 'unseen') items = items.filter((x) => !data.progress[x.id]?.seen);
  if (source === 'favorites') items = items.filter((x) => fav(x.patternId));
  if (source === 'category')
    items = items.filter((x) => x.category === (opts.category || ui.practiceCategory));
  if (source === 'custom') items = items.filter((x) => x.category === 'Minhas frases');
  if (source === 'pattern') items = items.filter((x) => x.patternId === opts.patternId);
  return source === 'due' ? items.slice(0, count) : randomSubset(items, count);
}
function beginPractice(
  source = ui.practiceSource,
  mode = ui.practiceMode,
  count = ui.practiceCount,
  opts = {}
) {
  let cards = getSessionCards(source, count, opts);
  if (!cards.length) {
    toast(
      source === 'due'
        ? 'Sem revisões pendentes. Explore novas estruturas!'
        : 'Nenhuma frase disponível nesta seleção.'
    );
    if (source === 'pattern') go('library');
    return false;
  }
  const modes = ['translate', 'cloze', 'listen', 'mental'];
  const queue = cards.map((c) => ({
    ...c,
    mode: mode === 'mixed' ? modes[Math.floor(Math.random() * modes.length)] : mode,
    retry: false,
  }));
  ui.session = { queue, index: 0, ratings: [], startCount: queue.length, source, mode };
  ui.checked = false;
  ui.currentAnswer = '';
  ui.showHint = false;
  ui.trainingOrigin = 'practice';
  ui.page = 'practice';
  render();
  window.scrollTo(0, 0);
  guideShowPage(false);
  return true;
}
function currentQuestion() {
  const s = ui.session;
  return s?.queue[s.index] || null;
}
function renderSession() {
  const s = ui.session;
  const q = currentQuestion();
  if (!q) return renderSessionDone();
  const mode = q.mode;
  const cloze = mode === 'cloze' ? clozeData(q.es) : null;
  const title = {
    translate: 'Traduza para o espanhol',
    cloze: 'Complete a parte que falta',
    listen: 'Escute e escreva em espanhol',
    mental: 'Responda em voz alta, de memória',
  }[mode];
  let mainPrompt =
    mode === 'translate' || mode === 'mental'
      ? escapeHTML(q.pt)
      : mode === 'cloze'
        ? escapeHTML(cloze.display)
        : `<button class="btn secondary" data-act="speak" data-text="${escapeHTML(q.es)}" style="font-size:17px;padding:15px 19px">${ico('sound', 21)} Ouvir frase em espanhol</button>`;
  return `<div class="practice-shell"><div class="row between" style="margin-bottom:19px"><button class="back" data-act="end-session">${ico('close', 16)} Sair do treino</button>${chip(q.category)} </div><div class="practice-progress"><span>Frase <strong>${s.index + 1}</strong> de <strong>${s.queue.length}</strong></span><span>${s.ratings.length} respostas concluídas</span></div><div class="practice-track"><div style="width:${Math.round((100 * s.index) / s.queue.length)}%"></div></div>
<div class="question-card"><div class="row wrap between"><div class="eyebrow" style="margin:0">${escapeHTML(title)}</div>${chip(q.level, q.level === 'A1' ? 'green' : '')}</div><div class="prompt">${mainPrompt}</div>
${mode === 'listen' ? `<p class="small muted" style="margin:-8px 0 19px">Ouça quantas vezes precisar antes de responder.</p>` : ''}
${!ui.checked && mode !== 'mental' ? `<label for="userAnswer" class="sr-only">Sua resposta em espanhol</label><input id="userAnswer" class="input-main" autocomplete="off" autocapitalize="sentences" spellcheck="false" placeholder="${mode === 'cloze' ? 'Palavra que falta...' : 'Digite sua resposta em espanhol...'}" value="${escapeHTML(ui.currentAnswer)}" />` : ''}
${!ui.checked && mode === 'mental' ? `<div class="method">Fale a tradução em espanhol antes de revelar. Não precisa ser perfeita: o objetivo é lembrar sem olhar.</div>` : ''}
${!ui.checked ? `<div class="question-foot"><div class="row wrap"><button class="btn secondary sm" data-act="toggle-hint">${ico('info', 15)} ${ui.showHint ? 'Ocultar dica' : 'Preciso de uma dica'}</button>${mode !== 'mental' && mode !== 'cloze' ? `<button class="btn secondary sm" data-act="mic" data-target="userAnswer" aria-label="Falar pelo microfone">${ico('mic', 15)} Ditado por voz</button>` : ''}</div><button class="btn" data-act="check-answer">${mode === 'mental' ? 'Revelar resposta' : 'Conferir resposta'} ${ico('arrow', 16)}</button></div>${ui.showHint ? `<div class="hint"><strong>Estrutura:</strong> ${escapeHTML(q.formula)}<br>${escapeHTML(q.tip)}${mode === 'listen' ? `<br><strong>Sentido em português:</strong> ${escapeHTML(q.pt)}` : ''}</div>` : ''}${mode !== 'mental' && mode !== 'cloze' ? '<div class="voice-note">Você pode responder falando ou digitando, como preferir.</div>' : ''}` : ''}
${ui.checked ? `<div class="answer-result"><div class="eyebrow" style="margin:0">Resposta de referência</div><div class="expected">${escapeHTML(q.es)}</div><div class="row wrap" style="margin-top:8px"><button class="btn sm secondary" data-act="speak" data-text="${escapeHTML(q.es)}">${ico('sound', 16)} Ouvir</button><span class="small muted">${escapeHTML(q.pt)}</span></div>${ui.currentAnswer ? `<div class="note" style="margin-top:12px">Sua tentativa: <strong>${escapeHTML(ui.currentAnswer)}</strong></div>` : ''}${mode === 'cloze' ? `<div class="note">Palavra esperada: <strong>${escapeHTML(cloze.answer)}</strong></div>` : ''}${ui.currentAnswer && mode !== 'mental' ? `<div class="note" style="margin-top:7px">${feedbackText(ui.currentAnswer, mode === 'cloze' ? cloze.answer : q.es)}</div>` : ''}<div class="note" style="margin-top:7px">Outras traduções também podem estar corretas. Compare o sentido e a estrutura; depois avalie sua lembrança.</div></div><div class="subheading" style="margin-top:19px">Como você se saiu?</div><div class="answer-rating"><button class="rating again" data-act="rate" data-grade="again">Esqueci<small>Rever em breve</small></button><button class="rating" data-act="rate" data-grade="hard">Difícil<small>Amanhã</small></button><button class="rating" data-act="rate" data-grade="good">Lembrei<small>Espaçar</small></button><button class="rating easy" data-act="rate" data-grade="easy">Fácil<small>Mais adiante</small></button></div>` : ''}
</div><div class="row between" style="margin-top:14px"><span class="muted small">${mode === 'translate' ? 'Dica: pense primeiro em voz alta.' : mode === 'cloze' ? 'Treine recuperar a palavra, não só reconhecer.' : mode === 'listen' ? 'Treine ouvido + memória, não só leitura.' : 'Recuperação oral é a habilidade usada na aula.'}</span><span class="muted tiny">${ico('spark', 13)} Sem pressa</span></div></div>`;
}
function feedbackText(answer, correct) {
  const sim = answerSimilarity(answer, correct);
  if (sim > 0.985) return 'A escrita coincide com o modelo (ignorando acentos e pontuação).';
  if (sim > 0.83) return 'Sua escrita está bem próxima do modelo. Confira as pequenas diferenças.';
  if (sim > 0.58) return 'Você recuperou parte da frase. Confira palavras e conjugação.';
  return 'Compare sua tentativa com o modelo. O importante é identificar o que faltou.';
}
function renderSessionDone() {
  const results = ui.session?.ratings || [];
  const good = results.filter((x) => x === 'good' || x === 'easy').length;
  return `<div class="practice-shell"><div class="card session-done"><span class="big">${ico('check', 34)}</span><div class="eyebrow">TREINO CONCLUÍDO</div><h1>Você praticou. Isso conta.</h1><p class="muted" style="max-width:470px">Fez ${results.length} tentativas e marcou ${good} como lembradas com boa confiança. As revisões futuras foram ajustadas ao seu feedback.</p><div class="grid two" style="width:min(390px,100%);margin:14px 0"><div class="card soft" style="padding:15px"><div class="value" style="font-size:28px;font-weight:800">${results.length}</div><div class="muted tiny">Tentativas</div></div><div class="card soft" style="padding:15px"><div class="value" style="font-size:28px;font-weight:800">${good}</div><div class="muted tiny">Lembrei / Fácil</div></div></div><div class="row wrap" style="justify-content:center"><button class="btn" data-act="repeat-session">Treinar outras frases</button><button class="btn secondary" data-act="end-session">Voltar ao início</button></div></div></div>`;
}
function registerGrade(card, grade) {
  const old = data.progress[card.id] || { interval: 0, reps: 0, ease: 2.3, lapses: 0 };
  const p = { ...old };
  if (grade === 'again') {
    p.reps = 0;
    p.interval = 1;
    p.ease = Math.max(1.4, (p.ease || 2.3) - 0.2);
    p.lapses = (p.lapses || 0) + 1;
  } else if (grade === 'hard') {
    p.interval = Math.max(1, Math.round((p.interval || 1) * 1.15));
    p.ease = Math.max(1.4, (p.ease || 2.3) - 0.1);
    p.reps = (p.reps || 0) + 1;
  } else if (grade === 'good') {
    p.interval =
      p.reps === 0
        ? 1
        : p.interval <= 1
          ? 3
          : Math.max(p.interval + 1, Math.round(p.interval * (p.ease || 2.3)));
    p.reps = (p.reps || 0) + 1;
  } else {
    p.interval = p.reps === 0 ? 3 : Math.max(4, Math.round(p.interval * (p.ease || 2.3) * 1.3));
    p.ease = Math.min(3, (p.ease || 2.3) + 0.12);
    p.reps = (p.reps || 0) + 1;
  }
  p.seen = true;
  p.lastGrade = grade;
  p.last = today();
  p.due = addDays(today(), p.interval);
  p.attempts = (p.attempts || 0) + 1;
  data.progress[card.id] = p;
  const d = today();
  if (!data.activity[d]) data.activity[d] = { attempts: 0, good: 0 };
  data.activity[d].attempts++;
  if (grade === 'good' || grade === 'easy') data.activity[d].good++;
  save();
}
function gradeCurrent(grade) {
  const s = ui.session,
    card = currentQuestion();
  if (!s || !card || !ui.checked) return;
  registerGrade(card, grade);
  s.ratings.push(grade);
  if (grade === 'again' && !card.retry) {
    const repeat = { ...card, retry: true };
    s.queue.splice(Math.min(s.index + 4, s.queue.length), 0, repeat);
  }
  s.index++;
  ui.checked = false;
  ui.currentAnswer = '';
  ui.showHint = false;
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function renderReviews() {
  const due = dueCards(),
    future = allCards()
      .filter((x) => data.progress[x.id]?.due && data.progress[x.id].due > today())
      .sort((a, b) => data.progress[a.id].due.localeCompare(data.progress[b.id].due));
  const next7 = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(today(), i);
    const v = allCards().filter((x) => data.progress[x.id]?.due === d).length;
    return { date: d, n: v };
  });
  return `${heading('Memória de longo prazo', 'Suas revisões', 'As frases voltam em intervalos diferentes conforme sua lembrança: difícil revisa mais cedo; fácil revisa mais tarde.', `<button class="btn" data-act="start-review" ${due.length ? '' : 'disabled'}>${ico('play', 16)} Revisar ${due.length} agora</button>`)}
<div class="grid three" style="margin-bottom:22px"><div class="card stat"><div class="stat-label">Para hoje</div><div class="value">${due.length}</div><div class="detail">Inclui revisões atrasadas</div></div><div class="card stat"><div class="stat-label">Agendadas</div><div class="value">${future.length}</div><div class="detail">Para os próximos dias</div></div><div class="card stat"><div class="stat-label">Já praticadas</div><div class="value">${progressCount()}</div><div class="detail">Frases com histórico</div></div></div>
<div class="grid two" style="align-items:start"><div class="card"><h2>Vencendo agora</h2><p class="muted small" style="margin:5px 0 15px">Comece pelas que precisam voltar à memória.</p>${
    due.length
      ? due
          .slice(0, 10)
          .map(
            (x) =>
              `<div class="metric-line"><div style="max-width:80%"><strong>${escapeHTML(x.es)}</strong><div class="muted tiny">${escapeHTML(x.category)}</div></div>${chip('Hoje', 'orange')}</div>`
          )
          .join('')
      : `<div class="empty"><div style="color:var(--accent)">${ico('check', 26)}</div><h3>Revisões em dia</h3><p>Você pode estudar novas estruturas ou treinar algumas aleatoriamente.</p><button class="btn secondary sm" data-act="start-random">Treinar novas frases</button></div>`
  }</div>
<div class="stack"><div class="card"><h2>Próximos 7 dias</h2><p class="small muted" style="margin:6px 0 14px">Quantidade estimada, que muda após cada revisão.</p>${next7.map((v, i) => `<div class="metric-line"><span>${i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : new Date(v.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' })}</span><strong>${v.n} frases</strong></div>`).join('')}</div><div class="card soft"><h3>Como os intervalos funcionam</h3><p class="small" style="margin-top:8px">O painel usa um sistema simples de repetição espaçada baseado na sua autoavaliação: 1, 3 e depois mais dias quando você lembra; intervalos menores quando acha difícil. Isso ajuda, mas não substitui a conversa real.</p></div></div></div>`;
}
function renderBoard() {
  const q = norm(ui.boardSearch);
  const section = EMERGENCY[ui.boardTab];
  let all = q
    ? EMERGENCY.flatMap((c) =>
        c.phrases.filter((p) => norm(p.join(' ')).includes(q)).map((p) => ({ name: c.name, p }))
      )
    : section.phrases.map((p) => ({ name: section.name, p }));
  return `${heading('Cola de conversação', 'Painel para usar na aula', 'Não precisa abandonar o espanhol quando travar. Ache a situação, diga a frase e continue a conversa.', `<button class="btn secondary" data-act="nav" data-page="scenarios">${ico('users', 17)} Simular perguntas</button>`)}
<div class="card soft" style="margin-bottom:18px"><div class="row align-start">${ico('info', 19)}<div><strong>A regra de ouro</strong><p class="small" style="margin-top:3px">Tente dizer algo simples antes de buscar ajuda. Use as frases deste painel para pedir repetição, ganhar tempo e reformular — não para fugir de falar.</p></div></div></div>
<div class="tools"><label class="search-wrap">${ico('search', 18)}<input id="boardSearch" value="${escapeHTML(ui.boardSearch)}" placeholder="Buscar: repetir, entender, conexión..." aria-label="Buscar frases para aula" /></label><button class="btn secondary sm" data-act="copy-lesson">${ico('copy', 15)} Copiar pedido ao Víctor</button></div>
<div class="board-layout"><div class="board-tabs">${EMERGENCY.map((c, i) => `<button class="${ui.boardTab === i && !q ? 'active' : ''}" data-act="board-tab" data-index="${i}">${ico(c.icon, 17)} ${escapeHTML(c.name)} <span class="tiny">${c.phrases.length}</span></button>`).join('')}</div>
<div class="card"><div class="row between" style="margin-bottom:8px"><div><div class="subheading">${q ? 'RESULTADOS DA BUSCA' : escapeHTML(section.name)}</div><h2>${q ? 'Frases encontradas' : 'Diga isto em espanhol'}</h2></div>${chip(all.length + ' frases')}</div>${all.length ? all.map(({ name, p }) => `<div class="phrase-row"><div><div class="es">${escapeHTML(p[0])}</div><div class="pt">${escapeHTML(p[1])}</div>${q ? `<div class="muted tiny" style="margin-top:4px">${escapeHTML(name)}</div>` : ''}</div><div class="actions"><button class="icon-btn" title="Ouvir" aria-label="Ouvir frase" data-act="speak" data-text="${escapeHTML(p[0])}">${ico('sound', 17)}</button><button class="icon-btn" title="Copiar" aria-label="Copiar frase" data-act="copy" data-text="${escapeHTML(p[0])}">${ico('copy', 17)}</button></div></div>`).join('') : `<div class="empty"><h3>Nenhuma frase encontrada</h3><p>Procure outra palavra ou expressão.</p></div>`}</div></div>
<div class="card soft" style="margin-top:18px"><div class="subheading">Meu acordo com o professor</div><p class="small" style="color:var(--text)">«Víctor, quiero intentar hablar más español durante nuestras clases. Pero a veces es difícil para mí encontrar las palabras. ¿Puedes hablar más despacio y darme un poco de tiempo para responder?»</p><div class="row wrap" style="margin-top:13px"><button class="btn sm secondary" data-act="speak" data-text="Víctor, quiero intentar hablar más español durante nuestras clases. Pero a veces es difícil para mí encontrar las palabras. ¿Puedes hablar más despacio y darme un poco de tiempo para responder?">${ico('sound', 15)} Ouvir</button><button class="btn sm secondary" data-act="copy-lesson">${ico('copy', 15)} Copiar</button></div></div>`;
}
function renderScenarios() {
  const set = SCENARIO_SETS.find((x) => x.id === ui.scenarioScene) || SCENARIO_SETS[0];
  const turn = Math.min(ui.scenarioTurn, set.turns.length);
  const s = set.turns[turn];
  const groups = ['Todas', ...new Set(SCENARIO_SETS.map((x) => x.group))];
  const done = turn >= set.turns.length;
  const count = ui.scenarioGrades.length,
    good = ui.scenarioGrades.filter((x) => x === 'good').length;
  return `${heading('Conversação do mundo real', 'Simule situações do dia a dia', 'Treine falas simples em espanhol. Ouça a outra pessoa, responda sem ler e revele a estrutura somente se precisar.', `<button class="btn secondary" data-act="scenario-random">${ico('shuffle', 16)} Situação surpresa</button>`)}
 <div class="card flat" style="margin-bottom:18px">
 <div class="row between wrap"><h3>Escolha uma situação</h3><span class="chip green">${SCENARIO_SETS.length} cenários · ${SCENARIO_SETS.reduce((n, x) => n + x.turns.length, 0)} interações</span></div>
 <div class="scenario-setup" style="margin:12px 0 5px"><label class="muted small" for="sceneGroup">Tema:</label><select id="sceneGroup" class="select" aria-label="Tema dos cenários"><option value="Todas">Todas</option>${groups
   .slice(1)
   .map(
     (g) =>
       `<option value="${escapeHTML(g)}" ${ui.scenarioFilter === g ? 'selected' : ''}>${escapeHTML(g)}</option>`
   )
   .join(
     ''
   )}</select><span class="muted small">Um diálogo tem várias etapas; avance no seu ritmo.</span></div>
 <div class="scenario-chooser">${SCENARIO_SETS.filter(
   (x) => !ui.scenarioFilter || ui.scenarioFilter === 'Todas' || ui.scenarioFilter === x.group
 )
   .map(
     (x) =>
       `<button class="scene-tile ${x.id === set.id ? 'active' : ''}" data-act="scenario-set" data-id="${escapeHTML(x.id)}" title="${escapeHTML(x.description)}"><span class="scene-emoji">${x.emoji}</span><b>${escapeHTML(x.title)}</b><span>${x.turns.length} falas · ${escapeHTML(x.group)}</span></button>`
   )
   .join('')}</div></div>
 <div class="scenario">
 <div class="scenario-toolbar" style="margin-bottom:14px"><div class="row wrap">${chip(set.emoji + ' ' + set.title, 'green')}${chip('Interlocutor: ' + set.role)}</div><div class="row wrap"><label class="muted small" for="scenarioMode">Ajuda:</label><select class="select" id="scenarioMode"><option value="guided" ${ui.scenarioMode === 'guided' ? 'selected' : ''}>Com tradução</option><option value="challenge" ${ui.scenarioMode === 'challenge' ? 'selected' : ''}>Sem tradução</option></select></div></div>
 <div class="row" style="margin-bottom:14px"><div class="scene-step-track" aria-label="Progresso de falas">${set.turns.map((_, i) => `<span class="${i < turn ? 'done' : ''}" title="Etapa ${i + 1}"></span>`).join('')}</div><span class="muted small" style="white-space:nowrap">${Math.min(turn + 1, set.turns.length)} / ${set.turns.length}</span></div>
 ${
   done
     ? `<div class="card scenario-finish"><div class="huge">✨</div><h2>Conversa concluída!</h2><p class="muted">Você passou por ${set.turns.length} situações em “${escapeHTML(set.title)}”.</p><h1>${good} de ${count}</h1><p class="muted small">Etapas que você marcou como respondidas sem ajuda. Isso é uma autoavaliação, não uma nota de pronúncia.</p><div class="row wrap"><button class="btn" data-act="scenario-set" data-id="${escapeHTML(set.id)}">${ico('play', 16)} Praticar outra vez</button><button class="btn secondary" data-act="scenario-random">${ico('shuffle', 16)} Outro cenário</button></div></div>`
     : `<div class="card"><div class="row between wrap" style="margin-bottom:15px"><div><div class="eyebrow">${escapeHTML(set.description)}</div><div class="small muted">Turno ${turn + 1} · ${escapeHTML(set.role)} fala com você</div></div><button class="btn sm secondary" data-act="speak" data-text="${escapeHTML(s.q)}">${ico('sound', 15)} Ouvir pergunta</button></div>
 <div class="chat"><div class="avatar">${set.emoji}</div><div class="bubble"><div class="subheading">${escapeHTML(set.role.toUpperCase())}</div><div class="question" lang="es">${escapeHTML(s.q)}</div>${ui.scenarioMode === 'guided' ? `<div class="translation">${escapeHTML(s.pt)}</div>` : ''}</div></div>
 <div style="margin-top:22px"><div class="subheading">Agora é com você · fale primeiro</div><textarea id="scenarioAnswer" class="textarea" placeholder="Tente dizer em voz alta; se quiser, digite aqui ou use o microfone..." aria-label="Sua resposta em espanhol">${escapeHTML(ui.scenarioAnswer)}</textarea><div class="row wrap" style="margin-top:9px"><button class="btn secondary sm" data-act="mic" data-target="scenarioAnswer">${ico('mic', 15)} Falar no microfone</button><button class="btn secondary sm" data-act="scenario-hint">${ico('info', 15)} ${ui.showHint ? 'Ocultar pista' : 'Ver pista'}</button>${ui.scenarioMode === 'challenge' ? `<button class="btn secondary sm" data-act="scenario-translate">${ico('book', 15)} Ver tradução</button>` : ''}</div></div>
 ${ui.scenarioShowPT ? `<div class="hint"><strong>Em português:</strong> ${escapeHTML(s.pt)}</div>` : ''}
 ${ui.showHint ? `<div class="hint">Comece com: <strong>${escapeHTML(s.hint)}</strong>${s.focus ? `<div class="small" style="margin-top:5px">Estrutura-chave: ${escapeHTML(s.focus)}</div>` : ''}</div>` : ''}
 ${ui.scenarioReveal ? `<div class="answer-result"><div class="subheading">Duas formas de responder</div>${s.examples.map((e) => `<div class="row between" style="margin:9px 0;gap:12px"><strong lang="es">${escapeHTML(e)}</strong><button class="icon-btn" data-act="speak" data-text="${escapeHTML(e)}" aria-label="Ouvir resposta" title="Ouvir">${ico('sound', 16)}</button></div>`).join('')}<div class="muted small" style="margin-top:12px">Você pode responder de outra maneira e estar correto. Compare a ideia, não apenas as palavras.</div></div>` : ''}
 <div class="row between wrap" style="margin-top:21px"><button class="btn secondary" data-act="scenario-prev" ${turn === 0 ? 'disabled' : ''}>${ico('back', 16)} Voltar</button><div class="row wrap"><button class="btn secondary" data-act="scenario-reveal">${ui.scenarioReveal ? 'Ocultar respostas' : 'Ver respostas-modelo'}</button>${ui.scenarioReveal ? `<button class="btn" data-act="scenario-next">Próxima fala ${ico('arrow', 16)}</button>` : ''}</div></div>
 ${ui.scenarioReveal ? `<div class="scene-grade" style="margin-top:18px"><span class="small muted">Como você se saiu?</span><button class="btn secondary sm" data-act="scenario-grade" data-grade="hard">Precisei de ajuda</button><button class="btn sm" data-act="scenario-grade" data-grade="good">Respondi sem ajuda</button></div>` : ''}
 </div>`
 }
 <div class="callout" style="margin-top:16px"><strong>Treino de retenção:</strong> antes de revelar, responda uma vez sem olhar. Depois que conferir, repita a resposta mudando uma palavra e faça uma pergunta de volta. Na próxima rodada, escolha <strong>Sem tradução</strong>.</div></div>`;
}
function renderProgress() {
  const days = activityLast(14),
    max = Math.max(1, ...days.map((x) => x.attempts));
  const weak = allStructures()
    .map((st) => ({
      st,
      grades: st.examples.map((e) => data.progress[e.id]).filter((x) => x?.seen),
    }))
    .filter((x) => x.grades.length)
    .map((x) => ({
      title: x.st.formula,
      id: x.st.id,
      bad: x.grades.reduce((n, r) => n + (r.lapses || 0), 0),
      count: x.grades.length,
    }))
    .sort((a, b) => b.bad - a.bad || a.count - b.count)
    .slice(0, 6);
  return `${heading('Retenção e consistência', 'Meu progresso', 'Acompanhe seu hábito, registre frases que faltaram durante a aula e faça backup do que já estudou.')}
${window.HablaAccounts?.card() || ''}${renderCalendar()}<div class="grid four" style="margin:18px 0 20px"><div class="card stat"><div class="stat-label">Tentativas totais</div><div class="value">${lifetimeAttempts()}</div><div class="detail">Em todos os treinos</div></div><div class="card stat"><div class="stat-label">Frases praticadas</div><div class="value">${progressCount()}</div><div class="detail">De ${allCards().length} disponíveis</div></div><div class="card stat"><div class="stat-label">Em consolidação</div><div class="value">${masteredCount()}</div><div class="detail">Lembradas em mais de um ciclo</div></div><div class="card stat"><div class="stat-label">Dias seguidos</div><div class="value">${streak()}</div><div class="detail">Com pelo menos um treino</div></div></div>
<div class="grid two" style="align-items:start"><div class="card"><h2>Seus últimos 14 dias</h2><p class="muted small" style="margin-top:7px">Quantidade de tentativas por dia, sem exigir uma sequência perfeita.</p><div class="mini-bars" style="height:153px;margin-top:14px">${days.map((d) => `<div class="mini-bar-col" title="${d.date}: ${d.attempts} tentativas"><div class="mini-bar ${d.attempts ? 'has' : ''}" style="height:${Math.max(4, (95 * d.attempts) / max)}px"></div><span>${d.date.slice(-2)}</span></div>`).join('')}</div><p class="muted tiny" style="margin-top:8px">A altura mostra o volume; não mede sua fluência.</p></div><div class="card"><h2>Estruturas para reforçar</h2><p class="muted small" style="margin:7px 0 12px">Prioridade para estruturas em que você marcou “Esqueci”.</p>${weak.length ? weak.map((x) => `<div class="metric-line"><div><strong>${escapeHTML(x.title)}</strong><div class="muted tiny">${x.count} frases praticadas</div></div><button class="btn ghost sm" data-act="study" data-id="${escapeHTML(x.id)}">Estudar</button></div>`).join('') : `<div class="empty"><h3>Sem histórico ainda</h3><p>Treine algumas frases e esta seção passa a mostrar suas dificuldades.</p></div>`}</div></div>
<div style="height:22px"></div><div class="grid two" style="align-items:start"><div class="card"><h2>Frases que eu quis dizer</h2><p class="small muted" style="margin:7px 0 20px">Depois de cada aula, registre 1 a 3 ideias em que você travou. Elas entram na biblioteca e nos exercícios.</p><form id="personalForm" class="stack" style="gap:10px"><label class="small"><strong>O que eu quis dizer em português</strong><input name="pt" class="field" style="width:100%;margin-top:6px" maxlength="180" required placeholder="Preciso revisar o verbo..." /></label><label class="small"><strong>Como digo em espanhol</strong><input name="es" class="field" style="width:100%;margin-top:6px" maxlength="180" required placeholder="Necesito repasar el verbo..." /></label><button type="submit" class="btn">${ico('check', 16)} Adicionar aos meus treinos</button></form>
<div style="margin-top:17px">${
    (data.custom || []).length
      ? data.custom
          .slice()
          .reverse()
          .map(
            (c) =>
              `<div class="my-phrase"><div><b>${escapeHTML(c.es)}</b><div class="muted tiny">${escapeHTML(c.pt)}</div></div><button class="icon-btn" data-act="delete-custom" data-id="${escapeHTML(c.id)}" title="Excluir frase">${ico('trash', 15)}</button></div>`
          )
          .join('')
      : `<p class="muted small">Você ainda não adicionou frases pessoais.</p>`
  }</div></div>
<div class="card"><h2>Preferências e segurança dos dados</h2><div class="settings-rows"><div class="setting-row"><div><strong>Meta de frases por dia</strong><p>Uma sugestão leve, não uma obrigação.</p></div><select id="dailyGoal" class="select">${[5, 8, 10, 15, 20].map((n) => `<option value="${n}" ${data.dailyGoal === n ? 'selected' : ''}>${n} frases</option>`).join('')}</select></div><div class="setting-row"><div><strong>Ouvir uma frase em espanhol</strong><p>Teste o áudio e ajuste a velocidade se precisar.</p></div><button class="btn secondary sm" data-act="speak" data-text="¡Buenas tardes! ¿Cómo estás hoy?">▶ Testar áudio</button></div><div class="setting-row"><div><strong>Velocidade da voz</strong><p>Use 0,75× no começo; aumente aos poucos.</p></div><select class="select" id="voiceSpeed">${[
    ['0.7', 'Lenta'],
    ['0.88', 'Moderada'],
    ['1', 'Normal'],
  ]
    .map(
      ([k, v]) =>
        `<option value="${k}" ${Math.abs(data.voiceSpeed - Number(k)) < 0.01 ? 'selected' : ''}>${v}</option>`
    )
    .join(
      ''
    )}</select></div><div class="setting-row"><div><strong>Adicionar à tela inicial</strong><p>Adicione o Habla à tela inicial e acesse seus estudos com um toque.</p></div><button class="btn secondary sm" data-act="install-help">Como instalar</button></div><div class="setting-row"><div><strong>Exportar progresso</strong><p>Salve um backup para mudar de navegador ou computador.</p></div><button class="btn secondary sm" data-act="export">${ico('download', 15)} Exportar</button></div><div class="setting-row"><div><strong>Importar backup</strong><p>Substitui o histórico atual por um arquivo salvo. Se estiver com conta, sincroniza a alteração.</p></div><button class="btn secondary sm" data-act="import">${ico('upload', 15)} Importar</button></div><div class="setting-row"><div><strong>Limpar meus dados</strong><p>Apaga o histórico atual. Se estiver com conta, sincroniza a exclusão com seus aparelhos.</p></div><button class="btn secondary sm" data-act="reset">${ico('trash', 15)} Limpar</button></div></div><div class="method" style="margin-top:12px"><strong>Seus estudos:</strong> respostas, dúvidas e anotações ficam salvas neste aparelho. Entre para sincronizar entre aparelhos e mantenha seus backups.</div></div></div>`;
}
let toastTimer = null;
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3300);
}
async function copyText(value) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
    } else {
      const ta = document.createElement('textarea');
      ta.value = value;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      if (!ok) throw new Error('Cópia não permitida');
    }
    toast('Frase copiada.');
  } catch (e) {
    toast('Não foi possível copiar automaticamente neste navegador.');
  }
}
function speak(es) {
  if (window.HablaAudio) return window.HablaAudio.play(es, Number(data.voiceSpeed) || 0.88);
  toast('O áudio ainda está carregando. Aguarde um instante e toque em Ouvir novamente.');
  return false;
}
let recognizer = null;
function stopListening() {
  if (recognizer) {
    try {
      recognizer.stop();
    } catch (e) {}
    recognizer = null;
  }
  ui.listening = false;
}
function startListening(target) {
  window.HablaAudio?.stop();
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    toast('Reconhecimento de voz indisponível. Use Chrome/Edge compatível ou digite.');
    return;
  }
  if (recognizer) stopListening();
  try {
    const rec = new SR();
    rec.lang = 'es-MX';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.continuous = false;
    recognizer = rec;
    ui.listening = true;
    toast('Microfone ativo: fale uma frase em espanhol.');
    rec.onresult = (ev) => {
      const value = ev.results[0][0].transcript;
      const el = document.getElementById(target);
      if (el) {
        el.value = value;
        el.focus();
      }
      if (target === 'userAnswer') ui.currentAnswer = value;
      if (target === 'scenarioAnswer') ui.scenarioAnswer = value;
      if (target === 'verbResponse') ui.verbTyped = value;
      toast('Fala transcrita. Confira antes de continuar.');
    };
    rec.onerror = (e) => {
      const note =
        e.error === 'not-allowed'
          ? 'Permissão do microfone negada.'
          : e.error === 'network'
            ? 'O reconhecimento de voz precisa de um serviço de rede neste navegador.'
            : 'Não foi possível captar a fala. Tente digitar.';
      toast(note);
    };
    rec.onend = () => {
      ui.listening = false;
      recognizer = null;
    };
    rec.start();
  } catch (e) {
    toast('Não foi possível ativar o microfone neste navegador.');
  }
}
function downloadBackup(snapshot = window.HablaStore.snapshot()) {
  const blob = new Blob(
    [
      JSON.stringify(
        {
          app: 'Habla',
          version: 2,
          createdAt: new Date().toISOString(),
          data: snapshot[STORAGE_KEY] || { progress: {} },
          workbookState: snapshot[VERB_BOOK_KEY],
          guideState: guidePrefs,
          labState: snapshot['habla.lab.v1'],
          coachState: snapshot['habla.coach.v1'],
          resumeState: snapshot['habla.resume.v1'],
        },
        null,
        2
      ),
    ],
    { type: 'application/json' }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'habla-backup-' + today() + '.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Backup gerado. Guarde o arquivo com segurança.');
}
function sanitizeImport(raw) {
  const ob = raw?.data;
  if (!ob || typeof ob !== 'object' || Array.isArray(ob)) throw Error('Formato inválido');
  if (!ob.progress || typeof ob.progress !== 'object') throw Error('Backup sem progresso');
  const doubts = Array.isArray(ob.doubts)
    ? ob.doubts
        .filter((x) => x && typeof x.id === 'string' && typeof x.question === 'string')
        .slice(0, 2000)
        .map((x) => ({
          id: String(x.id).slice(0, 80),
          question: String(x.question).slice(0, 900),
          questionES: String(x.questionES || '').slice(0, 900),
          context: String(x.context || '').slice(0, 1200),
          teacherAnswer: String(x.teacherAnswer || '').slice(0, 8000),
          unit: Number(x.unit) >= 1 && Number(x.unit) <= 10 ? Number(x.unit) : 0,
          status: x.status === 'resolved' ? 'resolved' : 'pending',
          createdAt: String(x.createdAt || new Date().toISOString()).slice(0, 35),
          updatedAt: String(x.updatedAt || x.createdAt || new Date().toISOString()).slice(0, 35),
          resolvedAt: x.resolvedAt ? String(x.resolvedAt).slice(0, 35) : null,
        }))
    : [];
  const customs = Array.isArray(ob.custom)
    ? ob.custom
        .filter(
          (x) =>
            x && typeof x.es === 'string' && typeof x.pt === 'string' && typeof x.id === 'string'
        )
        .slice(0, 1000)
        .map((x) => ({
          id: String(x.id).slice(0, 80),
          es: x.es.slice(0, 180),
          pt: x.pt.slice(0, 180),
          label: 'Minha frase',
        }))
    : [];
  return {
    doubts: doubts,
    doubtDraft: null,
    doubtQuickDraft:
      ob.doubtQuickDraft && typeof ob.doubtQuickDraft === 'object'
        ? {
            question: String(ob.doubtQuickDraft.question || '').slice(0, 900),
            questionES: String(ob.doubtQuickDraft.questionES || '').slice(0, 900),
            context: String(ob.doubtQuickDraft.context || '').slice(0, 1200),
            unit: Math.max(0, Math.min(10, Number(ob.doubtQuickDraft.unit) || 0)),
          }
        : null,
    progress: ob.progress || {},
    favorites: ob.favorites && typeof ob.favorites === 'object' ? ob.favorites : {},
    activity: ob.activity && typeof ob.activity === 'object' ? ob.activity : {},
    scenarioActivity:
      ob.scenarioActivity && typeof ob.scenarioActivity === 'object' ? ob.scenarioActivity : {},
    custom: customs,
    dailyGoal: [5, 8, 10, 15, 20].includes(Number(ob.dailyGoal)) ? Number(ob.dailyGoal) : 8,
    theme: ob.theme === 'dark' ? 'dark' : 'light',
    voiceSpeed: [0.7, 0.88, 1].includes(Number(ob.voiceSpeed)) ? Number(ob.voiceSpeed) : 0.88,
    verbProgress:
      ob.verbProgress && typeof ob.verbProgress === 'object' && !Array.isArray(ob.verbProgress)
        ? ob.verbProgress
        : {},
    verbActivity:
      ob.verbActivity && typeof ob.verbActivity === 'object' && !Array.isArray(ob.verbActivity)
        ? ob.verbActivity
        : {},
    workbookActivity:
      ob.workbookActivity &&
      typeof ob.workbookActivity === 'object' &&
      !Array.isArray(ob.workbookActivity)
        ? ob.workbookActivity
        : {},
  };
}
function setBoardTab(n) {
  ui.boardTab = n;
  ui.boardSearch = '';
  render();
}
function resetSceneStep() {
  ui.scenarioReveal = false;
  ui.scenarioAnswer = '';
  ui.scenarioShowPT = false;
  ui.showHint = false;
}
function setScenario(id) {
  if (!SCENARIO_SETS.some((x) => x.id === id)) return;
  ui.scenarioScene = id;
  ui.scenarioTurn = 0;
  ui.scenarioGrades = [];
  resetSceneStep();
  render();
}
function stepScene(delta) {
  const set = SCENARIO_SETS.find((x) => x.id === ui.scenarioScene) || SCENARIO_SETS[0];
  ui.scenarioTurn = Math.max(0, Math.min(set.turns.length, ui.scenarioTurn + delta));
  resetSceneStep();
  render();
}
function randomScene() {
  const other = SCENARIO_SETS.filter((x) => x.id !== ui.scenarioScene);
  const choices =
    ui.scenarioFilter === 'Todas' ? other : other.filter((x) => x.group === ui.scenarioFilter);
  const pool = choices.length ? choices : other;
  setScenario(pool[Math.floor(Math.random() * pool.length)].id);
}

function checkVerbAnswer() {
  const q = ui.verbQuestion;
  if (!q || ui.verbReveal) return;
  let written =
    ui.verbMode === 'choice'
      ? ui.verbPicked
      : (document.getElementById('verbResponse')?.value || ui.verbTyped).trim();
  if (!written) {
    toast('Tente uma resposta primeiro. Use “Falar e revelar” para praticar sem digitar.');
    return;
  }
  ui.verbTyped = written;
  ui.verbResult = { correct: norm(written) === norm(q.form) };
  ui.verbReveal = true;
  render();
}
function onAction(el) {
  if (window.HablaCoach?.handleAction(el)) return;
  if (window.HablaDoubts?.handleAction(el)) return;
  if (window.HablaLab?.handleAction(el)) return;
  const act = el.dataset.act,
    id = el.dataset.id,
    val = el.dataset.value;
  switch (act) {
    case 'nav':
      ui.session = null;
      go(el.dataset.page);
      return;
    case 'more-open':
      openMore();
      return;
    case 'more-close':
      closeMore();
      return;
    case 'more-nav':
      closeMore();
      go(el.dataset.page);
      return;
    case 'install-help':
      installHelp();
      return;
    case 'guide-welcome-next':
    case 'guide-welcome-prev':
    case 'guide-welcome-done':
    case 'guide-page-next':
    case 'guide-page-done':
    case 'guide-replay':
    case 'guide-screen-replay':
      closeMore();
      guideAction(act);
      return;
    case 'calendar-prev':
      ui.calOffset--;
      render();
      return;
    case 'calendar-next':
      ui.calOffset = Math.min(0, ui.calOffset + 1);
      render();
      return;
    case 'wb-overview':
      ui.wbUnit = null;
      ui.wbExercise = null;
      render();
      guideShowPage(false);
      return;
    case 'wb-unit':
      wbOpenUnit(Number(el.dataset.unit));
      guideShowPage(false);
      return;
    case 'wb-open':
      wbOpenExercise(id);
      guideShowPage(false);
      return;
    case 'wb-help':
      ui.wbHelp = !ui.wbHelp;
      render();
      return;
    case 'wb-transcript': {
      const k = ui.wbExercise + '|' + el.dataset.index;
      ui.wbTranscripts[k] = !ui.wbTranscripts[k];
      render();
      return;
    }
    case 'wb-speak': {
      const ex = wbCurrent();
      if (ex) {
        const q = ex.items[Number(el.dataset.index)];
        if (q?.audio) speak(q.audio);
      }
      return;
    }
    case 'wb-word':
      wbSetWord(el);
      return;
    case 'wb-check':
      wbGrade();
      return;
    case 'wb-review': {
      const id = ui.wbExercise;
      if (wb.review[id]) delete wb.review[id];
      else wb.review[id] = true;
      wbSave();
      render();
      return;
    }
    case 'wb-clear': {
      const id = ui.wbExercise;
      if (confirm('Limpar as respostas deste exercício?')) {
        delete wb.answers[id];
        delete wb.results[id];
        wbSave();
        render();
      }
      return;
    }
    case 'wb-prev':
    case 'wb-next': {
      const ex = wbCurrent(),
        items = BOOK_EX.filter((x) => x.unit === ex.unit),
        i = items.indexOf(ex) + (act === 'wb-next' ? 1 : -1);
      if (items[i]) wbOpenExercise(items[i].id);
      return;
    }

    case 'verb-tab':
      ui.verbTab = val;
      ui.verbQuestion = null;
      ui.verbReviewOnly = false;
      ui.verbTranslatedExamples = [];
      render();
      return;
    case 'verb-choose':
      ui.verbChoice = id;
      ui.verbTab = 'learn';
      ui.verbQuestion = null;
      ui.verbShowAllPT = false;
      ui.verbTranslatedExamples = [];
      render();
      return;
    case 'verb-start-focused':
      ui.verbChoice = id;
      ui.verbTab = 'quiz';
      ui.verbReviewOnly = false;
      ui.verbHistory = [];
      newVerbQuestion();
      return;
    case 'verb-start':
      ui.verbReviewOnly = false;
      ui.verbHistory = [];
      newVerbQuestion();
      return;
    case 'verb-start-review':
      ui.verbReviewOnly = true;
      ui.verbTab = 'quiz';
      ui.verbHistory = [];
      newVerbQuestion();
      return;
    case 'verb-translate-example': {
      const x = Number(val);
      ui.verbTranslatedExamples = ui.verbTranslatedExamples.includes(x)
        ? ui.verbTranslatedExamples.filter((n) => n !== x)
        : ui.verbTranslatedExamples.concat(x);
      render();
      return;
    }
    case 'verb-toggle-allpt':
      ui.verbShowAllPT = !ui.verbShowAllPT;
      render();
      return;
    case 'verb-toggle-table':
      ui.verbShowTable = !ui.verbShowTable;
      render();
      return;
    case 'verb-special-toggle':
      ui.verbSpecial = !ui.verbSpecial;
      render();
      return;
    case 'verb-random-example': {
      const pool = eligibleVerbs();
      const old = ui.verbChoice;
      const other = pool.filter((v) => v.lemma !== old);
      ui.verbChoice = (other.length ? other : pool)[
        Math.floor(Math.random() * (other.length || pool.length))
      ].lemma;
      ui.verbTranslatedExamples = [];
      ui.verbShowAllPT = false;
      render();
      return;
    }
    case 'verb-toggle-translation':
      ui.verbPT = !ui.verbPT;
      render();
      return;
    case 'verb-toggle-hint':
      ui.verbHint = !ui.verbHint;
      render();
      return;
    case 'verb-pick':
      ui.verbPicked = val;
      render();
      return;
    case 'verb-check':
      checkVerbAnswer();
      return;
    case 'verb-reveal':
      if (ui.verbQuestion) {
        ui.verbReveal = true;
        ui.verbResult = { correct: null };
        render();
      }
      return;
    case 'verb-grade':
      rateVerb(el.dataset.grade);
      return;
    case 'verb-skip':
      newVerbQuestion();
      return;
    case 'verb-study-this':
      ui.verbChoice = id;
      ui.verbTab = 'learn';
      ui.verbQuestion = null;
      ui.verbTranslatedExamples = [];
      render();
      return;
    case 'theme':
      data.theme = data.theme === 'dark' ? 'light' : 'dark';
      save();
      render();
      return;
    case 'quick-practice':
      beginPractice('all', 'mixed', 8);
      return;
    case 'start-random':
      beginPractice('all', 'mixed', 10);
      return;
    case 'start-review':
      if (dueCards().length) beginPractice('due', 'mixed', dueCards().length);
      else toast('Sem revisões pendentes. Explore a biblioteca!');
      return;
    case 'study':
      ui.studyId = id;
      ui.showPT = true;
      go('study');
      return;
    case 'favorite':
      data.favorites[id] = !data.favorites[id];
      save();
      render();
      return;
    case 'toggle-pt':
      ui.showPT = !ui.showPT;
      render();
      return;
    case 'start-pattern':
      beginPractice('pattern', 'mixed', 20, { patternId: id });
      return;
    case 'clear-filters':
      ui.libraryQuery = '';
      ui.libraryCategory = 'Todas';
      ui.libraryLevel = 'Todos';
      ui.libraryOnly = 'Todas';
      render();
      return;
    case 'only-filter':
      ui.libraryOnly = val;
      render();
      return;
    case 'practice-mode':
      ui.practiceMode = val;
      render();
      return;
    case 'practice-source':
      ui.practiceSource = val;
      if (val === 'category' && ui.practiceCategory === 'Todas') ui.practiceCategory = GROUPS[0];
      render();
      return;
    case 'practice-count':
      ui.practiceCount = Number(val);
      render();
      return;
    case 'start-config':
      beginPractice(ui.practiceSource, ui.practiceMode, ui.practiceCount);
      return;
    case 'end-session':
      ui.session = null;
      go('home');
      return;
    case 'repeat-session': {
      const old = ui.session;
      ui.session = null;
      beginPractice(
        old?.source === 'due' ? 'all' : old?.source || 'all',
        old?.mode || 'mixed',
        old?.startCount || 10,
        { patternId: ui.studyId }
      );
      return;
    }
    case 'toggle-hint':
      ui.showHint = !ui.showHint;
      render();
      return;
    case 'check-answer': {
      if (!ui.session || ui.checked) return;
      const answer = document.getElementById('userAnswer');
      if (answer) ui.currentAnswer = answer.value.trim();
      ui.checked = true;
      render();
      return;
    }
    case 'rate':
      gradeCurrent(el.dataset.grade);
      return;
    case 'speak':
      speak(el.dataset.text || '');
      return;
    case 'mic':
      startListening(el.dataset.target || 'userAnswer');
      return;
    case 'copy':
      copyText(el.dataset.text || '');
      return;
    case 'copy-lesson':
      copyText(
        'Víctor, quiero intentar hablar más español durante nuestras clases. Pero a veces es difícil para mí encontrar las palabras. ¿Puedes hablar más despacio y darme un poco de tiempo para responder?'
      );
      return;
    case 'board-tab':
      setBoardTab(Number(el.dataset.index));
      return;
    case 'scenario-set':
      setScenario(id);
      return;
    case 'scenario-translate':
      ui.scenarioShowPT = !ui.scenarioShowPT;
      ui.scenarioAnswer = document.getElementById('scenarioAnswer')?.value || ui.scenarioAnswer;
      render();
      return;
    case 'scenario-hint':
      ui.showHint = !ui.showHint;
      ui.scenarioAnswer = document.getElementById('scenarioAnswer')?.value || ui.scenarioAnswer;
      render();
      return;
    case 'scenario-reveal':
      ui.scenarioReveal = !ui.scenarioReveal;
      ui.scenarioAnswer = document.getElementById('scenarioAnswer')?.value || ui.scenarioAnswer;
      render();
      return;
    case 'scenario-prev':
      stepScene(-1);
      return;
    case 'scenario-next':
      stepScene(1);
      return;
    case 'scenario-grade': {
      const g = el.dataset.grade;
      if (g !== 'hard' && g !== 'good') return;
      ui.scenarioGrades[ui.scenarioTurn] = g;
      data.scenarioActivity = data.scenarioActivity || {};
      const day = data.scenarioActivity[today()] || { good: 0, hard: 0 };
      day[g] = (day[g] || 0) + 1;
      data.scenarioActivity[today()] = day;
      save();
      stepScene(1);
      return;
    }
    case 'scenario-random':
      randomScene();
      return;
    case 'delete-custom': {
      if (!confirm('Excluir esta frase pessoal e seu histórico de prática?')) return;
      const target = (data.custom || []).find((x) => x.id === id);
      if (target) {
        delete data.progress[target.id + 'e0'];
        delete data.favorites[target.id];
      }
      data.custom = (data.custom || []).filter((x) => x.id !== id);
      save();
      render();
      toast('Frase pessoal excluída.');
      return;
    }
    case 'export':
      downloadBackup();
      return;
    case 'import':
      document.getElementById('importFile').click();
      return;
    case 'reset':
      if (
        confirm(
          'Apagar TODO o histórico atual, inclusive conjugação, caderno e frases pessoais? Se estiver com conta, a exclusão será sincronizada com seus aparelhos. Faça um backup antes.'
        )
      ) {
        try {
          window.HablaStore.archive('antes-de-limpar');
        } catch (_) {
          toast('Faça um backup antes de limpar: não há espaço para guardar uma cópia.');
          return;
        }
        const theme = data.theme;
        data = {
          progress: {},
          favorites: {},
          activity: {},
          scenarioActivity: {},
          custom: [],
          doubts: [],
          verbProgress: {},
          verbActivity: {},
          workbookActivity: {},
          doubtDraft: null,
          doubtQuickDraft: null,
          theme,
          dailyGoal: 8,
          voiceSpeed: 0.88,
        };
        try {
          window.HablaStore.replace({ [STORAGE_KEY]: data, [VERB_BOOK_KEY]: WB_BASE() });
          window.HablaApp.reload(true);
          toast('Histórico reiniciado.');
        } catch (_) {
          window.HablaApp.reload(true);
          toast('Não foi possível limpar. Seu histórico foi preservado.');
        }
      }
      return;
  }
}
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (el?.classList.contains('more-overlay') && e.target !== el) return;
  if (el && !el.disabled) {
    e.preventDefault();
    onAction(el);
  }
});
document.addEventListener('keydown', (e) => {
  if (e.target.id === 'verbResponse' && e.key === 'Enter') {
    e.preventDefault();
    checkVerbAnswer();
    return;
  }
  if (e.target.matches('.pattern-card[role="button"]') && (e.key === 'Enter' || e.key === ' ')) {
    e.preventDefault();
    onAction(e.target);
    return;
  }
  if (
    ui.page === 'practice' &&
    ui.session &&
    !ui.checked &&
    e.key === 'Enter' &&
    e.target.id === 'userAnswer'
  ) {
    e.preventDefault();
    ui.currentAnswer = e.target.value;
    ui.checked = true;
    render();
    return;
  }
  if (
    ui.page === 'practice' &&
    ui.session &&
    ui.checked &&
    !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) &&
    ['1', '2', '3', '4'].includes(e.key)
  ) {
    e.preventDefault();
    gradeCurrent(['again', 'hard', 'good', 'easy'][Number(e.key) - 1]);
  }
});
document.addEventListener('input', (e) => {
  if (e.target.id === 'wbSearch') {
    ui.wbQuery = e.target.value;
    const all = BOOK_EX.filter((x) => x.unit === ui.wbUnit);
    const filtered = all.filter(
      (x) =>
        (ui.wbFilter === 'all' ||
          (ui.wbFilter === 'pending' && !wbDone(x)) ||
          (ui.wbFilter === 'completed' && wbDone(x)) ||
          (ui.wbFilter === 'review' && wb.review[x.id])) &&
        norm(x.title + ' ' + x.exercise + ' ' + x.page).includes(norm(ui.wbQuery || ''))
    );
    const groups = new Map();
    filtered.forEach((x) => {
      if (!groups.has(x.page)) groups.set(x.page, []);
      groups.get(x.page).push(x);
    });
    document.getElementById('wbUnitList').innerHTML = wbUnitGroupsHTML(groups);
    return;
  }
  if (e.target.id === 'wbNotes') {
    wb.notes[ui.wbExercise] = e.target.value;
    wbSave();
    return;
  }
  if (
    e.target.dataset.wbId &&
    !['checkbox', 'radio'].includes(e.target.type) &&
    e.target.tagName !== 'SELECT'
  ) {
    wbAnswerSave(e.target);
    return;
  }
  if (e.target.id === 'verbResponse') ui.verbTyped = e.target.value;
  if (e.target.id === 'librarySearch') {
    ui.libraryQuery = e.target.value;
    renderLibraryList();
  }
  if (e.target.id === 'boardSearch') {
    const input = e.target;
    ui.boardSearch = input.value;
    const pos = input.selectionStart;
    render();
    const next = document.getElementById('boardSearch');
    next?.focus();
    try {
      next?.setSelectionRange(pos, pos);
    } catch (err) {}
  }
  if (e.target.id === 'userAnswer') ui.currentAnswer = e.target.value;
  if (e.target.id === 'scenarioAnswer') ui.scenarioAnswer = e.target.value;
});
document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.wbId) {
    wbAnswerSave(t);
    return;
  }
  if (t.id === 'wbFilter') {
    ui.wbFilter = t.value;
    render();
    return;
  }
  if (t.id === 'verbUnit') {
    ui.verbUnit = t.value;
    if (ui.verbChoice !== 'all' && !eligibleVerbs().some((v) => v.lemma === ui.verbChoice))
      ui.verbChoice = 'all';
    ui.verbQuestion = null;
    ui.verbTranslatedExamples = [];
    render();
    return;
  }
  if (t.id === 'verbPick') {
    ui.verbChoice = t.value;
    ui.verbQuestion = null;
    ui.verbHistory = [];
    ui.verbTranslatedExamples = [];
    ui.verbShowAllPT = false;
    render();
    return;
  }
  if (t.id === 'verbPerson') {
    ui.verbPronoun = t.value;
    ui.verbQuestion = null;
    ui.verbHistory = [];
    render();
    return;
  }
  if (t.id === 'verbMode') {
    ui.verbMode = t.value;
    ui.verbQuestion = null;
    render();
    return;
  }
  if (t.id === 'filterCat') {
    ui.libraryCategory = t.value;
    render();
  }
  if (t.id === 'filterLevel') {
    ui.libraryLevel = t.value;
    render();
  }
  if (t.id === 'practiceCategory') {
    ui.practiceCategory = t.value;
    render();
  }
  if (t.id === 'sceneGroup') {
    ui.scenarioFilter = t.value;
    render();
  }
  if (t.id === 'scenarioMode') {
    ui.scenarioMode = t.value;
    ui.scenarioAnswer = document.getElementById('scenarioAnswer')?.value || ui.scenarioAnswer;
    render();
  }
  if (t.id === 'dailyGoal') {
    data.dailyGoal = Number(t.value);
    save();
    render();
  }
  if (t.id === 'voiceSpeed') {
    data.voiceSpeed = Number(t.value);
    save();
    render();
  }
});
document.addEventListener('submit', (e) => {
  if (e.target.id !== 'personalForm') return;
  e.preventDefault();
  const f = new FormData(e.target),
    pt = String(f.get('pt') || '').trim(),
    es = String(f.get('es') || '').trim();
  if (!pt || !es) return;
  if (pt.length > 180 || es.length > 180) {
    toast('Limite de 180 caracteres por frase.');
    return;
  }
  const id = 'mine_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
  data.custom.push({ id, pt, es, label: 'Minha frase' });
  save();
  render();
  toast('Frase adicionada à biblioteca e aos treinos.');
});
document.getElementById('importFile').addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    const imported = sanitizeImport(parsed);
    if (
      confirm(
        'Importar este arquivo? O histórico atual será substituído pelo backup' +
          (window.HablaStore.active() ? ' e a alteração será sincronizada com sua conta.' : '.')
      )
    ) {
      window.HablaStore.archive('antes-de-importar-backup');
      const snapshot = window.HablaStore.snapshot();
      snapshot[STORAGE_KEY] = imported;
      for (const [field, key] of [
        ['workbookState', VERB_BOOK_KEY],
        ['coachState', 'habla.coach.v1'],
        ['labState', 'habla.lab.v1'],
        ['resumeState', 'habla.resume.v1'],
      ]) {
        if (parsed[field] && typeof parsed[field] === 'object') snapshot[key] = parsed[field];
      }
      // Valida todos os blocos antes de substituir o histórico.
      window.HablaSyncData.seed('validation', snapshot, window.HablaStore.device());
      window.HablaStore.replace(snapshot);
      if (parsed.guideState) {
        guidePrefs = parsed.guideState;
        guideSave();
      }
      window.HablaApp.reload(true);
      ui.session = null;
      ui.libraryCategory = 'Todas';
      ui.libraryLevel = 'Todos';
      go('progress');
      toast('Backup importado com sucesso.');
    }
  } catch (err) {
    toast('Não foi possível importar: arquivo inválido.');
  }
});
// Recurso pedagógico: hábitos de estudo baseados em sessões efetivamente concluídas.
function dayActivity(date) {
  const a = data.activity?.[date] || {},
    b = data.verbActivity?.[date] || {},
    c = data.workbookActivity?.[date] || {},
    d = data.scenarioActivity?.[date] || {};
  return {
    attempts:
      (a.attempts || 0) + (b.attempts || 0) + (c.attempts || 0) + (d.good || 0) + (d.hard || 0),
    good: (a.good || 0) + (b.good || 0) + (c.good || 0) + (d.good || 0),
  };
}
function studiedDates() {
  const days = new Set([
    ...Object.keys(data.activity || {}),
    ...Object.keys(data.verbActivity || {}),
    ...Object.keys(data.workbookActivity || {}),
    ...Object.keys(data.scenarioActivity || {}),
  ]);
  return [...days]
    .filter((d) => /^\d{4}-\d\d-\d\d$/.test(d) && d <= today() && dayActivity(d).attempts > 0)
    .sort();
}
function longestStreak() {
  const d = studiedDates();
  let longest = 0,
    current = 0,
    previous = '';
  for (const x of d) {
    current = previous && addDays(previous, 1) === x ? current + 1 : 1;
    longest = Math.max(longest, current);
    previous = x;
  }
  return longest;
}
function studiedDays() {
  return studiedDates().length;
}
function renderMiniStreak() {
  const d = activityLast(7),
    labels = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  return `<div class="streak-mini"><div><b>🔥 ${streak()} ${streak() === 1 ? 'dia seguido' : 'dias seguidos'}</b><small>Frequência real · ${studiedDays()} ${studiedDays() === 1 ? 'dia ativo' : 'dias ativos'} no histórico</small></div><div class="week-dots">${d
    .map((a, i) => {
      const day = new Date(a.date + 'T12:00:00').getDay(),
        label = labels[day];
      return `<div class="week-day ${a.attempts ? 'active' : ''} ${a.date === today() ? 'today' : ''}"><span>${label}</span><i>${a.attempts ? '✓' : '·'}</i></div>`;
    })
    .join('')}</div></div>`;
}
function renderCalendar() {
  const base = new Date();
  base.setDate(1);
  base.setMonth(base.getMonth() + ui.calOffset);
  const first = new Date(base.getFullYear(), base.getMonth(), 1);
  const last = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push('<span class="calendar-date muted"></span>');
  for (let n = 1; n <= last; n++) {
    const date = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(n).padStart(2, '0')}`,
      count = dayActivity(date).attempts;
    cells.push(
      `<span class="calendar-date ${count ? 'studied' : ''} ${date === today() ? 'is-today' : ''}" title="${date}: ${count} atividade(s) realizadas" aria-label="${date}, ${count} atividades">${n}</span>`
    );
  }
  return `<section class="card streak-calendar-card"><div class="calendar-toolbar"><div><h2>Minha frequência</h2><p class="muted small">${studiedDays()} dias de estudo · melhor sequência: ${longestStreak()} dias</p></div><div class="row"><button class="icon-btn" data-act="calendar-prev" aria-label="Mês anterior">←</button><button class="icon-btn" data-act="calendar-next" aria-label="Próximo mês" ${ui.calOffset >= 0 ? 'disabled' : ''}>→</button></div></div><div style="font-size:12px;font-weight:800;text-transform:capitalize;margin-bottom:8px">${first.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</div><div class="calendar-grid">${['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((x) => `<span class="calendar-weekname">${x}</span>`).join('')}${cells.join('')}</div><div class="calendar-legend"><span><i></i> Estudei</span><span>◯ Dia atual</span><span>Conteúdo concluído, não apenas acesso ao app</span></div></section>`;
}

// Tutorial de boas-vindas + orientações por página, reutilizáveis.
const GUIDE_KEY = 'habla_ui_guides_v4';
let guidePrefs = (() => {
  try {
    return JSON.parse(localStorage.getItem(GUIDE_KEY)) || {};
  } catch {
    return {};
  }
})();
let guideFlow = null;
const GUIDE_WELCOME = [
  {
    title: 'Seu espanhol começa aqui',
    body: 'Escolha o que quer estudar: frases, verbos, conversação ou exercícios por unidade. Avance no seu ritmo.',
    art: ['¡Hola! 👋', 'Quiero practicar español.', 'Eu quero praticar espanhol.'],
  },
  {
    title: 'Tente lembrar antes de revelar',
    body: 'Você vê uma pergunta ou frase, tenta responder, e só depois confere. Esse pequeno esforço para recuperar a resposta fortalece a memória.',
    art: ['¿Cómo te llamas?', 'Me llamo Ana.', '→ Revele depois de tentar'],
  },
  {
    title: 'Aprenda com as suas dificuldades',
    body: 'Marque “Esqueci” ou “Difícil” depois de cada treino. As frases que merecem atenção retornam para revisão espaçada.',
    art: ['Hoje: tengo', 'Depois: tienes', 'Amanhã: precisamos revisar?'],
  },
  {
    title: 'Pratique em situações reais',
    body: 'Simule diálogos de trabalho, restaurante, viagens e conversas com o professor. Sempre que precisar, revele uma pista ou uma tradução.',
    art: ['¿Qué deseas tomar?', 'Quiero un café, por favor.', 'Quero um café, por favor.'],
  },
  {
    title: 'Estude um pouquinho por dia',
    body: 'Seu calendário registra dias com treino ou exercício concluído; abrir o aplicativo não conta. Acompanhe sua frequência e faça backup do progresso.',
    art: ['Seg ✓ · Ter ✓', 'Qua · · Qui ✓', 'Constância acima de perfeição'],
  },
];
const GUIDE_PAGES = {
  home: [
    [
      'Comece com um treino curto',
      'O treino curto mistura as frases que você precisa praticar. Use a opção “Começar treino curto”.',
      '.hero',
    ],
    [
      'Escolha uma atividade',
      'Encontre estruturas, conjugação, simulações e o caderno. Tudo usa a mesma navegação.',
      '.quick-tile',
    ],
    [
      'Acompanhe sua frequência',
      'Os dias são marcados quando você conclui um exercício, não simplesmente quando abre a página.',
      '.streak-mini',
    ],
  ],
  library: [
    [
      'Encontre uma estrutura',
      'Busque por palavras e filtre por nível ou categoria.',
      '.page-head',
    ],
    [
      'Abra um cartão de estudo',
      'Aprenda o modelo, veja exemplos e experimente trocar algumas palavras.',
      '.pattern-card',
    ],
  ],
  study: [
    [
      'Estude o modelo',
      'Veja a fórmula e as frases. Leia em voz alta e tente fazer frases suas.',
      '.formula-box',
    ],
    [
      'Use a tradução quando precisar',
      'Oculte e revele o português gradualmente para não depender dele.',
      '.card',
    ],
  ],
  practice: [
    [
      'Recupere de memória',
      'Tente responder antes de ver a solução. Pode digitar ou falar, conforme o modo escolhido.',
      '.question-card',
    ],
    [
      'Avalie sua lembrança',
      '“Esqueci” revisa mais cedo e “Fácil” revisa depois. Esse retorno torna o treino adaptativo.',
      '.answer-rating',
    ],
  ],
  reviews: [
    [
      'Revise no momento certo',
      'As frases retornam conforme sua lembrança na prática anterior.',
      '.page-head',
    ],
    ['Sem revisões hoje?', 'Faça um treino novo; voltar amanhã pode ser suficiente.', '.card'],
  ],
  board: [
    [
      'Seu apoio ao vivo',
      'Deixe esta tela aberta ao lado da aula. Escolha o que você precisa comunicar agora.',
      '.page-head',
    ],
    [
      'Copie ou leia a frase',
      'Use expressões de emergência para continuar conversando sem passar imediatamente ao português.',
      '.card',
    ],
  ],
  scenarios: [
    [
      'Escolha uma situação',
      'Há conversas de viagens, compras, restaurante, futebol, trabalho e professor.',
      '.scenario-chooser',
    ],
    [
      'Responda antes de abrir o modelo',
      'As pistas são opcionais. Repita o mesmo diálogo depois sem tradução.',
      '.card',
    ],
  ],
  verbs: [
    [
      'Estude por unidade e verbo',
      'Filtre pelo conteúdo do Frecuencias A1, selecione um verbo ou treine vários aleatoriamente.',
      '.verb-filter-box',
    ],
    [
      'Conjugue dentro de frases',
      'Escolha a pessoa, escreva a forma verbal e confira a explicação.',
      '.verb-quiz-panel',
    ],
    [
      'Tradução e áudio',
      'Você pode ouvir a frase e mostrar sua tradução em português quando precisar.',
      '.verb-learn-card',
    ],
  ],
  workbook: [
    [
      'Seu caderno de exercícios',
      'Escolha uma unidade e encontre atividades para praticar o conteúdo.',
      '.wb-units',
    ],
    [
      'Encontre sua unidade',
      'Escolha uma unidade e encontre os exercícios organizados por página.',
      '.wb-unit-tile',
    ],
    [
      'Salve suas respostas',
      'As respostas e notas são salvas no dispositivo e entram no backup conjunto.',
      '.wb-summary',
    ],
  ],
  'workbook:unit': [
    [
      'Exercícios por página',
      'Use a busca ou filtros para encontrar a atividade. Toque em qualquer linha para responder.',
      '.wb-group',
    ],
    [
      'Retome quando quiser',
      'Seu progresso fica salvo, inclusive respostas começadas e marcações para revisão.',
      '.wb-ex-row',
    ],
  ],
  'workbook:exercise': [
    [
      'Resolva diretamente aqui',
      'Resolva as atividades aqui mesmo e confira suas respostas.',
      '.wb-sheet',
    ],
    [
      'Ajuda quando precisar',
      'Você pode ver orientações em português e ouvir os trechos quando disponíveis.',
      '.wb-guide',
    ],
    [
      'Avance sem perder o progresso',
      'Passe para a próxima atividade ou volte à unidade.',
      '.wb-next',
    ],
  ],
  'verbs:quiz': [
    [
      'Conjugue no contexto',
      'Leia o pronome e o verbo pedido. Tente responder antes de mostrar dicas.',
      '.verb-quiz-panel',
    ],
    [
      'Dê uma nota para sua memória',
      'Quando conferir, marque como foi lembrar para agendar novas revisões.',
      '.answer-rating',
    ],
  ],
  progress: [
    [
      'Acompanhe sua consistência',
      'Veja quais dias você efetivamente estudou, sua melhor sequência e os treinos concluídos.',
      '.streak-calendar-card',
    ],
    [
      'Registre o que travou',
      'Anote frases que não conseguiu dizer na aula para treiná-las depois.',
      '#personalForm',
    ],
    [
      'Faça backup',
      'Se trocar de aparelho, exporte suas respostas em JSON e importe no outro dispositivo.',
      '.settings-rows',
    ],
  ],
};
function guideScope() {
  return ui.page === 'workbook'
    ? ui.wbExercise
      ? 'workbook:exercise'
      : ui.wbUnit
        ? 'workbook:unit'
        : 'workbook'
    : ui.page === 'verbs' && ui.verbTab === 'quiz'
      ? 'verbs:quiz'
      : ui.page;
}
function guideSave() {
  try {
    localStorage.setItem(GUIDE_KEY, JSON.stringify(guidePrefs));
  } catch (e) {}
}
function guideRoot() {
  return document.getElementById('guideRoot');
}
function guideRemoveHighlight() {
  document
    .querySelectorAll('.guide-highlight')
    .forEach((x) => x.classList.remove('guide-highlight'));
}
function guideIllustration(art) {
  return `<div class="guide-art"><div class="art-stack">${art.map((x, i) => `<div class="bubble">${i === 0 ? '💬 ' : i === 1 ? '✦ ' : '↳ '}${escapeHTML(x)}</div>`).join('')}</div></div>`;
}
function guideWelcome(step = 0) {
  guideRemoveHighlight();
  guideFlow = { type: 'welcome', step };
  let info = GUIDE_WELCOME[step];
  guideRoot().innerHTML = `<div class="guide-backdrop"></div><div class="guide-dialog" role="dialog" aria-modal="true" aria-label="Tutorial inicial"><div class="guide-top"><div class="guide-eyebrow">CONHEÇA O HABLA · ${step + 1}/${GUIDE_WELCOME.length}</div><button class="guide-close" data-act="guide-welcome-done" aria-label="Pular apresentação">×</button></div>${guideIllustration(info.art)}<h2>${info.title}</h2><p>${info.body}</p><div class="guide-progress">${GUIDE_WELCOME.map((_, i) => `<span class="${i <= step ? 'active' : ''}"></span>`).join('')}</div><div class="guide-controls">${step ? `<button class="btn secondary" data-act="guide-welcome-prev">← Voltar</button>` : `<button class="btn secondary" data-act="guide-welcome-done">Pular</button>`}<button class="btn" data-act="${step === GUIDE_WELCOME.length - 1 ? 'guide-welcome-done' : 'guide-welcome-next'}">${step === GUIDE_WELCOME.length - 1 ? 'Começar a estudar ✓' : 'Próximo →'}</button></div></div>`;
  guideRoot()
    .querySelector('button[data-act="guide-welcome-next"],button[data-act="guide-welcome-done"]')
    ?.focus({ preventScroll: true });
}
function guideFinishWelcome() {
  guidePrefs.welcome = true;
  guideSave();
  guideFlow = null;
  guideRoot().innerHTML = '';
  guideShowPage(false);
}
function guideShowPage(force = false) {
  if (guideFlow?.type === 'welcome') return;
  const scope = guideScope();
  if (!force && guidePrefs.pages?.[scope]) return;
  const steps = GUIDE_PAGES[scope] || GUIDE_PAGES.home;
  guidePage(scope, 0, steps);
}
function guidePage(scope, index, steps) {
  guideRemoveHighlight();
  guideFlow = { type: 'page', scope, step: index };
  const info = steps[index],
    root = guideRoot();
  root.innerHTML = `<div class="guide-screen" role="dialog" aria-modal="false" aria-label="Ajuda desta tela"><div class="guide-top"><span class="guide-eyebrow">COMO USAR ESTA TELA · ${index + 1}/${steps.length}</span><button class="guide-close" data-act="guide-page-done" aria-label="Fechar dica">×</button></div><h2>${info[0]}</h2><p>${info[1]}</p><div class="guide-progress">${steps.map((_, i) => `<span class="${i <= index ? 'active' : ''}"></span>`).join('')}</div><div class="guide-controls"><button class="btn secondary" data-act="guide-page-done">Fechar</button><button class="btn" data-act="guide-page-next">${index === steps.length - 1 ? 'Entendi ✓' : 'Próxima dica →'}</button></div></div>`;
  const target = document.querySelector(info[2]);
  if (target) target.classList.add('guide-highlight');
}
function guideEndPage() {
  const scope = guideFlow?.scope || guideScope();
  guidePrefs.pages = guidePrefs.pages || {};
  guidePrefs.pages[scope] = true;
  guideSave();
  guideFlow = null;
  guideRoot().innerHTML = '';
  guideRemoveHighlight();
}
function guideOpenAgain() {
  if (guideFlow) guideRemoveHighlight();
  guideWelcome(0);
}
function guideAction(act) {
  if (act === 'guide-welcome-next') {
    guideWelcome(Math.min(GUIDE_WELCOME.length - 1, guideFlow.step + 1));
    return true;
  }
  if (act === 'guide-welcome-prev') {
    guideWelcome(Math.max(0, guideFlow.step - 1));
    return true;
  }
  if (act === 'guide-welcome-done') {
    guideFinishWelcome();
    return true;
  }
  if (act === 'guide-page-next') {
    const scope = guideFlow.scope,
      steps = GUIDE_PAGES[scope] || GUIDE_PAGES.home;
    if (guideFlow.step + 1 < steps.length) guidePage(scope, guideFlow.step + 1, steps);
    else guideEndPage();
    return true;
  }
  if (act === 'guide-page-done') {
    guideEndPage();
    return true;
  }
  if (act === 'guide-replay') {
    guideOpenAgain();
    return true;
  }
  if (act === 'guide-screen-replay') {
    guideShowPage(true);
    return true;
  }
  return false;
}
function guideInit() {
  if (!guidePrefs.welcome) {
    guideWelcome(0);
  } else guideShowPage(false);
}

let installEvent = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installEvent = e;
});
const secureSite =
  location.protocol === 'https:' ||
  location.hostname === 'localhost' ||
  location.hostname === '127.0.0.1';
if (secureSite && 'serviceWorker' in navigator)
  navigator.serviceWorker.register('./sw.js').catch(() => {});

render();
guideInit();
