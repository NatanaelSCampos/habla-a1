/* Habla A1 · Diagnóstico por habilidades + Conversação Progressiva v1
   Banco alimentado por VERB_BANK, BOOK_EX, SCENARIO_SETS e frases A1 já existentes.
   As respostas abertas são comparadas com exemplos e autoavaliadas. */
(function(){
"use strict";
const KEY="habla.coach.v1";
const UNITS=["Nos presentamos","Mi casa, mi barrio","Vamos de viaje","En familia","Igual que todos los días","No me gusta, ¡me encanta!","Buenas intenciones","Cuídate mucho","Experiencias vividas","Fin de trayecto"];
const SKILLS=[
 {id:"grammar",name:"Conjugação e gramática",icon:"🧩",description:"Escolher a forma verbal correta no contexto."},
 {id:"vocab",name:"Vocabulário",icon:"📚",description:"Reconhecer palavras e expressões das unidades."},
 {id:"listening",name:"Compreensão oral",icon:"🎧",description:"Ouvir uma pergunta e identificar seu sentido."},
 {id:"sentence",name:"Construção de frases",icon:"✍️",description:"Construir uma frase em espanhol a partir de uma ideia em português."},
 {id:"speaking",name:"Conversação",icon:"💬",description:"Responder de memória a uma pergunta em espanhol."}
];
const SCENE_UNIT={
 professor:[1,5,10],cafe:[6],restaurant:[6,10],shopping:[4,6],grocery:[9,6],
 directions:[3,2,10],transport:[3],hotel:[3],newfriend:[1],smalltalk:[1,5],
 workteam:[1,5],meeting:[1,7],techcall:[1,8],football:[6],hobbies:[6],
 study:[1,7],plans:[7,10],phone:[1],routine:[5,10],helpdesk:[1,8]
};
const DEFAULT={units:[1,2,3],diagnosticLength:20,results:[],conversationHistory:[],sceneFilter:"all",sceneId:"professor",convoLevel:"guided",convoPractice:"all",showTranslations:true};
let state;try{state={...DEFAULT,...JSON.parse(window.HablaStore.getItem(KEY)||"{}")};}catch(e){state={...DEFAULT};}
let test=null,conversation=null,chosenResult=null;
const saveState=()=>{try{window.HablaStore.setItem(KEY,JSON.stringify(state));}catch(e){toast("Armazenamento indisponível. Exporte seu backup.");}};
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[¿?¡!.,;:]/g,"").replace(/\s+/g," ").trim();
const rand=a=>{let b=[...a];for(let i=b.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;};
const format=d=>new Date(d).toLocaleDateString("pt-BR");
const todayLocal=()=>{let d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");};
const getUnits=()=>state.units;
const scenes=()=>SCENARIO_SETS.map(s=>({...s,units:SCENE_UNIT[s.id]||[1]}));
const selectedScenes=()=>scenes().filter(s=>s.units.some(u=>getUnits().includes(u)));
const sendRender=()=>{if(typeof render==="function")render();};
function setupUnits(key){return '<div class="coach-units" role="group" aria-label="Unidades selecionadas">'+UNITS.map((n,i)=>'<label class="coach-unit '+(getUnits().includes(i+1)?"chosen":"")+'"><input type="checkbox" data-coach-unit="'+(i+1)+'" '+(getUnits().includes(i+1)?"checked":"")+'><span class="coach-unit-num">'+(i+1)+'</span><span>'+esc(n)+'</span></label>').join("")+'</div>';}
function intro(label,title,desc){return heading(label,title,desc);}
function statsBars(skillEntries){
 return '<div class="coach-skill-bars">'+SKILLS.map(s=>{
  let v=skillEntries[s.id]||{earned:0,possible:0,count:0},score=v.possible?Math.round(100*v.earned/v.possible):null;
  return '<div class="coach-skill-row"><div class="row between"><span>'+s.icon+' '+esc(s.name)+'</span><strong>'+(score===null?"—":score+"%")+'</strong></div><div class="progress-track"><div class="progress-fill" style="width:'+(score||0)+'%"></div></div></div>';
 }).join("")+'</div>';
}
function aggregate(results,by){
 const sums={};for(const r of results)for(const q of r.answers||[]){
  const key=by==="unit"?q.unit:q.skill,v=sums[key]||(sums[key]={earned:0,possible:0,count:0});
  v.earned+=q.score;v.possible+=1;v.count++;
 }return sums;
}
function scoreText(s){return s>=80?"Bem assimilado":s>=60?"Em consolidação":"Precisa de reforço";}
function nextSteps(sums){
 let arr=SKILLS.map(s=>({...s,...(sums[s.id]||{possible:0,earned:0})})).filter(x=>x.possible>0)
 .sort((a,b)=>a.earned/a.possible-b.earned/b.possible).slice(0,3);
 const routes={grammar:"verbs",vocab:"workbook",listening:"scenarios",sentence:"lab",speaking:"dialogues"};
 const hints={grammar:"Pratique conjugações em contextos e tente explicar o motivo da escolha.",vocab:"Volte ao caderno da unidade e recupere palavras antes de mostrar a resposta.",listening:"Ouça as frases sem ler, depois confira a tradução.",sentence:"Reescreva frases mudando pessoa e intenção.",speaking:"Repita diálogos sem pistas até conseguir responder com mais rapidez."};
 return arr.map(x=>'<div class="coach-tip"><div><strong>'+esc(x.name)+'</strong><p>'+esc(hints[x.id])+'</p></div><button class="btn secondary sm" data-act="coach-route" data-route="'+routes[x.id]+'">Praticar</button></div>').join("");
}
function currentResults(){return state.results.filter(r=>r.units.some(u=>getUnits().includes(u)));}
function historyPanel(){
 let results=currentResults(),latest=results.at(-1);
 return '<section class="card coach-history"><div class="row between wrap"><h2>Últimos diagnósticos</h2><span class="muted small">'+results.length+' realizado(s) nesta seleção</span></div>'+
 (latest?'<div class="coach-last"><strong>'+Math.round(100*latest.score)+'% de recuperação estimada</strong><span class="muted small">'+format(latest.date)+' · '+latest.answers.length+' respostas · '+esc(latest.units.join(", "))+'</span></div>'+statsBars(aggregate([latest],"skill"))+nextSteps(aggregate([latest],"skill")):
 '<p class="muted">Você ainda não fez um diagnóstico com estas unidades. Comece para obter um mapa inicial das suas dificuldades.</p>')+
 (results.length?'<div class="coach-history-list">'+results.slice(-5).reverse().map(r=>'<button class="coach-history-item" data-act="coach-result" data-result-id="'+esc(r.id)+'"><span>'+format(r.date)+' · Unidades '+esc(r.units.join(", "))+'</span><strong>'+Math.round(r.score*100)+'%</strong></button>').join("")+'</div>':"")+'</section>';
}
function diagnosticHome(){
 return '<div class="coach-wrap">'+intro("AVALIAÇÃO FORMATIVA","Diagnóstico por habilidades","Escolha livremente as unidades do Frecuencias A1 e veja em quais habilidades precisa concentrar sua revisão.")+
 '<div class="coach-columns"><section class="card coach-config"><div class="row between wrap"><h2>Monte sua avaliação</h2><div class="row wrap"><button class="btn secondary sm" data-act="coach-all">Todas</button><button class="btn secondary sm" data-act="coach-clear">Limpar</button></div></div><p class="muted small">Pode combinar qualquer uma das dez unidades, sempre que quiser.</p>'+setupUnits()+
 '<div class="coach-level-control"><label for="coachCount">Quantidade de questões</label><select id="coachCount" class="select">'+[10,20,30,40].map(n=>'<option value="'+n+'" '+(state.diagnosticLength===n?"selected":"")+'>'+n+' questões</option>').join("")+'</select></div>'+
 '<div class="coach-skills-preview">'+SKILLS.map(s=>'<div><span>'+s.icon+' '+s.name+'</span><small>'+esc(s.description)+'</small></div>').join("")+'</div>'+
 '<button class="btn primary coach-main-btn" data-act="coach-start">Iniciar diagnóstico</button></section>'+
 historyPanel()+'</div><p class="coach-warning">Use os resultados para descobrir o que revisar. Nas respostas livres, compare o que disse com os exemplos e avalie como conseguiu responder.</p></div>';
}
function vocabQuestions(){
 let out=[];
 BOOK_EX.forEach(ex=>{
 if(!getUnits().includes(ex.unit))return;
 let v=norm(ex.title);
 if(!(/vocab|profiss|nacionalidade|cores|fam.lia|roupa|roupas|transport|hotel|turismo|dias|comida|lugares|hora|rotina|objeto|atividade|cultura|bebida|fam[ií]lia|apar.ncia|palavr|hor.rio|gostos|praia|aliment|sa.de|corpo|viage|express|lazer|moradia/.test(v)))return;
 if(!["choice","match","fill"].includes(ex.kind))return;
 for(let i=0;i<ex.items.length;i++){
  let x=ex.items[i];if(!x.answer||!x.prompt)continue;
  out.push({id:"w-"+ex.id+"-"+i,unit:ex.unit,skill:"vocab",mode:x.options&&x.options.length>1?"choice":"open",prompt:x.prompt,answer:x.answer,options:x.options||[],pt:"Vocabulário · "+ex.title,origin:"Exercícios da Unidade "+ex.unit});
 }
 });
 return out;
}
function grammarQuestions(){
 let out=[];
 for(const v of VERB_BANK.verbs)if(getUnits().includes(v.unit)){
  for(let person=0;person<Math.min(6,v.es_forms.length);person++)for(let index=0;index<Math.min(4,v.contexts.length);index++){
   const q=verbalSentence(v,person,index);
   out.push({id:"g-"+q.id,unit:v.unit,skill:"grammar",mode:"fill",prompt:q.mask,answer:q.form,pt:q.pt,complete:q.es,explanation:v.note||"",lemma:v.lemma,origin:"Prática de gramática · Unidade "+v.unit});
   if(index<2){
    out.push({id:"s-"+q.id,unit:v.unit,skill:"sentence",mode:"open",prompt:q.pt,answer:q.es,pt:q.pt,lemma:v.lemma,origin:"Tradução de modelo contextual"});
   }
  }
 }
 // Questões de gramática da Unidade 10 e demais unidades.
 for(const ex of BOOK_EX){
  if(!getUnits().includes(ex.unit)||!/(verbo|conjuga|presente|imperativo|ser, estar|ser, estar, hay|irregulares|gustar|pronome|gerúndio)/i.test(ex.title))continue;
  if(!["fill","choice"].includes(ex.kind))continue;
  ex.items.forEach((item,i)=>{if(!item.prompt||!item.answer)return;
   out.push({id:"gram-wb-"+ex.id+"-"+i,unit:ex.unit,skill:"grammar",mode:item.options?.length?"choice":"fill",prompt:item.prompt,answer:item.answer,options:item.options||[],pt:"Gramática · "+ex.title,complete:item.prompt,origin:"Exercícios do caderno"});
  });
 }
 // Unidade 10 revisa comunicação e produção. Inclua construção contextual de respostas próprias.
 if(getUnits().includes(10))for(const scene of selectedScenes().filter(x=>x.units.includes(10))){
  scene.turns.forEach((turn,i)=>{if(turn.examples?.length&&turn.pt)out.push({id:"unit10-build-"+scene.id+"-"+i,unit:10,skill:"sentence",mode:"open",prompt:"Responda em espanhol: "+turn.pt,answer:turn.examples[0],pt:turn.pt,origin:"Revisão global · frase-modelo"});});
 }
 return out;
}
function comprehensionQuestions(){
 let out=[];
 for(const s of selectedScenes()){
 const units=s.units.filter(u=>getUnits().includes(u));let unit=units[0]||s.units[0];
 for(let i=0;i<s.turns.length;i++){
  let t=s.turns[i];if(!t.q||!t.pt)continue;
  const distractors=s.turns.filter(x=>x!==t&&x.pt&&norm(x.pt)!==norm(t.pt)).map(x=>x.pt);
  const others=selectedScenes().flatMap(x=>x.turns.map(y=>y.pt)).filter(x=>x&&norm(x)!==norm(t.pt)&&!distractors.includes(x));
  const pool=[...distractors,...others].filter((x,i,a)=>a.findIndex(y=>norm(y)===norm(x))===i);
  let options=[t.pt,...rand(pool).slice(0,3)];
  out.push({id:"l-"+s.id+"-"+i,unit,skill:"listening",mode:"listen",prompt:t.q,answer:t.pt,pt:t.pt,options:rand(options),origin:s.title,explanation:"Ouça sem ler. Escute antes de ler a tradução."});
 }
 }
 return out;
}
function speakingQuestions(){
 let out=[];
 for(const s of selectedScenes()){
 const unit=s.units.find(u=>getUnits().includes(u))||s.units[0];
 for(let i=0;i<s.turns.length;i++){let t=s.turns[i];if(!t.q||!t.examples?.length)continue;
  out.push({id:"p-"+s.id+"-"+i,unit,skill:"speaking",mode:"speak",prompt:t.q,answer:t.examples[0],alternatives:t.examples,pt:t.pt||"",hint:t.hint||"",origin:s.title});
 }
 }return out;
}
function pools(){return {grammar:grammarQuestions().filter(x=>x.skill==="grammar"),vocab:vocabQuestions(),listening:comprehensionQuestions(),sentence:grammarQuestions().filter(x=>x.skill==="sentence"),speaking:speakingQuestions()};}
function balancedQuestions(n){
 let per=pools(),deck=[],seen=new Set(),skills=SKILLS.map(x=>x.id);
 let buffers={};for(const id of skills){
   let list=per[id]||[];
   // Interleave units while avoiding an entire assessment from a single unit
   let groups=getUnits().map(unit=>rand(list.filter(x=>x.unit===unit)));
   let interleaved=[];while(groups.some(x=>x.length))groups.forEach(g=>{if(g.length)interleaved.push(g.pop());});
   buffers[id]=interleaved;
 }
 let index=0,tries=0;
 while(deck.length<n&&tries<n*skills.length*2){
  let skill=skills[index%skills.length],list=buffers[skill];
  let q=list.shift();if(q&&!seen.has(q.id)){deck.push(q);seen.add(q.id);}
  index++;tries++;
  if(Object.values(buffers).every(x=>x.length===0))break;
 }
 return deck;
}
function listen(es){if(typeof speak==="function")speak(es);}
function startDiagnostic(){
 if(!state.units.length){toast("Selecione pelo menos uma unidade.");return;}
 let deck=balancedQuestions(state.diagnosticLength);
 if(!deck.length){toast("Nenhuma pergunta disponível para esta seleção.");return;}
 test={deck,index:0,answers:[],typed:"",spoke:false,gaveUp:false,checked:false,help:false,translate:false,createdAt:new Date().toISOString(),id:"diag-"+Date.now()};
 chosenResult=null;sendRender();
}
function diagnosticCard(q){
 const pos=test.index,open=q.mode==="open"||q.mode==="speak",isListening=q.mode==="listen";
 let user=test.typed||"",matched=!open&&norm(user)===norm(q.answer);
 let prompt=isListening?'<div class="coach-audio-question"><button class="btn primary" data-act="coach-audio">▶ Ouvir pergunta</button><p class="muted small">Ouça a pergunta em espanhol e escolha a tradução.</p></div>':'<div class="coach-question-text" lang="'+(q.skill==="sentence"?"pt":"es")+'">'+esc(q.prompt)+'</div>';
 return '<div class="coach-progress"><div class="row between"><span>Questão '+(pos+1)+'/'+test.deck.length+'</span><button class="btn secondary sm" data-act="coach-stop">Encerrar</button></div><div class="progress-track"><div class="progress-fill" style="width:'+(100*pos/test.deck.length)+'%"></div></div></div>'+
 '<section class="card coach-question"><div class="row between wrap"><span class="chip">Unidade '+q.unit+' · '+esc(UNITS[q.unit-1])+'</span><span class="chip">'+esc(SKILLS.find(s=>s.id===q.skill).name)+'</span></div>'+prompt+
 (q.mode==="choice"||q.mode==="listen"?'<div class="coach-choices">'+q.options.map(x=>'<label class="coach-choice"><input type="radio" name="coachOption" value="'+esc(x)+'" '+(user===x?"checked":"")+' '+(test.checked?"disabled":"")+'><span>'+esc(x)+'</span></label>').join("")+'</div>':
 '<div class="coach-input"><label for="coachAnswer">'+(q.skill==="speaking"||q.skill==="sentence"?"Sua resposta em espanhol":"Sua resposta")+'</label><textarea id="coachAnswer" class="textarea" rows="3" '+(test.checked?"readonly":"")+' placeholder="'+(open?"Tente dizer primeiro, depois digite ou use o microfone.":"Digite o que conseguiu lembrar.")+'">'+esc(user)+'</textarea>'+
 '<div class="row wrap"><button class="btn secondary sm" data-act="coach-mic">🎤 Usar microfone</button>'+(open?'<button class="btn secondary sm" data-act="coach-spoke">'+(test.spoke?"✓ Resposta oral registrada":"✓ Respondi em voz alta")+'</button>':"")+'</div></div>')+
 '<div class="coach-question-help"><button class="btn secondary sm" data-act="coach-help">'+(test.help?"Ocultar dica":"Ver dica")+'</button>'+
 (isListening?'': '<button class="btn secondary sm" data-act="coach-translation">'+(test.translate?"Ocultar apoio":"Ver tradução/apoio")+'</button>')+'</div>'+
 (test.help?'<div class="coach-hint">'+esc(q.hint||(q.lemma?"Verbo: "+q.lemma:q.origin))+'</div>':"")+
 (test.translate?'<div class="coach-hint">'+esc(q.pt||"Frase baseada no conteúdo desta unidade.")+'</div>':"")+
 (!test.checked?'<div class="row wrap coach-question-footer"><button class="btn primary" data-act="coach-check">Conferir</button><button class="btn secondary" data-act="coach-reveal">Não lembro · revelar</button></div>':
 '<div class="coach-feedback"><div class="eyebrow">'+(!open?(matched?"RESPOSTA CORRESPONDENTE":"COMPARE SUA RESPOSTA"):"RESPOSTA-MODELO")+'</div><div class="coach-model" lang="es">'+esc(q.answer)+'</div>'+
 (q.skill==="grammar"&&q.complete?'<p class="muted small">'+esc(q.complete)+'</p>':"")+
 (q.explanation?'<p class="muted small">'+esc(q.explanation)+'</p>':"")+
 '<p class="muted small">'+(open?"A resposta pode variar. Avalie sua lembrança e a construção da frase.":"Conferir uma alternativa não equivale necessariamente a saber usá-la na fala.")+'</p>'+
 '<div class="coach-grade-options">'+[["again","Não lembrei","again"],["hard","Lembrei com esforço","hard"],["good","Lembrei sozinho","good"]].map(([id,label])=>'<button class="coach-grade" data-act="coach-grade" data-grade="'+id+'">'+label+'</button>').join("")+'</div></div>')+
 '</section>';
}
function collectGrade(grade){
 let q=test.deck[test.index],typed=test.typed||"",correct=q.mode==="open"||q.mode==="speak"?null:norm(typed)===norm(q.answer);
 // Help/reveal is reflected in score; wrong automatic answers cannot receive full credit.
 let manualScore=grade==="good"?1:grade==="hard"?.5:0;
 let score=(correct===false)?0:manualScore;
 if(test.help||test.translate)score=Math.min(score,.5);
 if(!typed&&!test.spoke)score=0;
 if(test.gaveUp)score=0;
 test.answers.push({id:q.id,unit:q.unit,skill:q.skill,score,grade,correct,typed,answer:q.answer,usedHelp:test.help||test.translate||test.gaveUp,oralOnly:!!test.spoke&&!typed,mode:q.mode});
 test.index++;test.typed="";test.spoke=false;test.gaveUp=false;test.checked=false;test.help=false;test.translate=false;
 if(test.index===test.deck.length){
 let answers=test.answers,score=answers.reduce((sum,x)=>sum+x.score,0)/Math.max(1,answers.length);
 let record={id:test.id,date:new Date().toISOString(),units:getUnits().slice(),score,answers};
 state.results.push(record);state.results=state.results.slice(-50);saveState();
 // Diagnostic completion is an actual study activity, counted once per question.
 if(typeof data!=="undefined"){data.activity=data.activity||{};let day=todayLocal(),row=data.activity[day]||{attempts:0,good:0};row.attempts+=answers.length;row.good+=answers.filter(a=>a.score===1).length;data.activity[day]=row;save();}
 chosenResult=record;test=null;
 }
 sendRender();
}
function diagnosticResult(record){
 let aggregateSkill=aggregate([record],"skill"),aggregateUnit=aggregate([record],"unit");
 let hardest=Object.entries(aggregateUnit).sort((a,b)=>(a[1].earned/a[1].possible)-(b[1].earned/b[1].possible));
 return '<div class="coach-wrap">'+intro("DIAGNÓSTICO CONCLUÍDO","Seu mapa de estudos","Veja seus resultados por habilidade e por unidade. Use as sugestões para decidir o que estudar depois.")+
 '<div class="grid three coach-result-summary"><div class="card stat"><span class="stat-label">Recuperação estimada</span><div class="value">'+Math.round(record.score*100)+'%</div></div><div class="card stat"><span class="stat-label">Respostas avaliadas</span><div class="value">'+record.answers.length+'</div></div><div class="card stat"><span class="stat-label">Unidades</span><div class="value">'+record.units.length+'</div></div></div>'+
 '<div class="coach-columns"><section class="card coach-config"><h2>Resultado por habilidade</h2>'+statsBars(aggregateSkill)+'<h2 style="margin-top:22px">O que praticar agora</h2>'+nextSteps(aggregateSkill)+'</section>'+
 '<section class="card coach-config"><h2>Resultado por unidade</h2>'+hardest.map(([u,r])=>{
 let pct=Math.round(100*r.earned/r.possible);
 return '<div class="coach-unit-row"><div class="row between"><span>Unidade '+u+' · '+esc(UNITS[u-1])+'</span><b>'+pct+'%</b></div><div class="progress-track"><div class="progress-fill" style="width:'+pct+'%"></div></div><small>'+scoreText(pct)+'</small></div>';
 }).join("")+'<div class="coach-actions">'+
 '<button class="btn primary" data-act="coach-repeat">Refazer diagnóstico</button><button class="btn secondary" data-act="coach-back">Escolher unidades</button></div></section></div>'+
 '<section class="card coach-config"><h2>Questões que precisam de reforço</h2>'+record.answers.filter(a=>a.score<1).slice(0,18).map(a=>'<div class="coach-review-answer"><span>Unidade '+a.unit+' · '+esc(SKILLS.find(s=>s.id===a.skill)?.name||a.skill)+'</span><strong lang="es">'+esc(a.answer)+'</strong><small>Você escreveu: '+esc(a.typed||"(sem resposta)")+'</small></div>').join("")+
 (!record.answers.some(a=>a.score<1)?'<p>Ótimo: você avaliou todas as respostas como recuperadas sem dificuldade.</p>':"")+'</section></div>';
}
function diagnosticPage(){
 if(chosenResult)return diagnosticResult(chosenResult);
 if(!test)return diagnosticHome();
 if(test.index>=test.deck.length){chosenResult=state.results.at(-1);test=null;return diagnosticResult(chosenResult);}
 return '<div class="coach-wrap">'+intro("DIAGNÓSTICO EM ANDAMENTO","Pense antes de revelar","Nem todas as questões têm uma única resposta possível. O objetivo é medir a recuperação de memória.")+diagnosticCard(test.deck[test.index])+'</div>';
}
// Conversação progressiva: 20 cenários originais, 3 níveis e retomada dos turnos difíceis.
function conversationsByUnit(){return selectedScenes().filter(s=>state.sceneFilter==="all"||s.group===state.sceneFilter);}
function convoHistoryFor(id){return state.conversationHistory.filter(h=>h.sceneId===id);}
function lastDifficulty(id){return new Set(state.conversationHistory.filter(h=>h.sceneId===id).slice(-3).flatMap(h=>(h.turns||[]).filter(t=>t.grade!=="good").map(t=>t.index)));}
function conversationStart(){
 let scene=SCENARIO_SETS.find(s=>s.id===state.sceneId)||selectedScenes()[0];
 if(!scene||!SCENE_UNIT[scene.id]?.some(u=>getUnits().includes(u))){
 scene=selectedScenes()[0];
 }
 if(!scene){toast("Não há diálogo nas unidades selecionadas.");return;}
 let difficult=lastDifficulty(scene.id),order=scene.turns.map((_,i)=>i);
 if(state.convoPractice==="weak"&&difficult.size)order=order.filter(i=>difficult.has(i));
 if(state.convoPractice==="weak"&&!difficult.size){toast("Sem falas difíceis registradas: iniciando conversa completa.");}
 conversation={sceneId:scene.id,order,index:0,answers:[],stage:"answer",typed:"",spoke:false,gaveUp:false,hint:false,translated:false,createdAt:new Date().toISOString(),level:state.convoLevel};
 sendRender();
}
function conversationsHome(){
 let scenesList=conversationsByUnit(),total=state.conversationHistory.length;
 const groups=[...new Set(scenes().map(s=>s.group))];
 return '<div class="coach-wrap">'+intro("FALAR ESPANHOL","Conversação progressiva","Treine diálogos contínuos com o mínimo de ajuda necessário. Repita situações difíceis para ganhar autonomia.")+
 '<div class="coach-columns"><section class="card coach-config"><h2>Escolha seu conteúdo</h2>'+setupUnits()+
 '<div class="coach-controls"><label>Categoria<select id="coachSceneGroup" class="select"><option value="all">Todas</option>'+groups.map(g=>'<option '+(state.sceneFilter===g?"selected":"")+' value="'+esc(g)+'">'+esc(g)+'</option>').join("")+'</select></label>'+
 '<label>Ajuda<select id="coachLevel" class="select">'+[["guided","Guiado — tradução visível e pistas"],["assisted","Intermediário — tradução opcional"],["challenge","Desafio — sem ajuda inicial"]].map(([k,v])=>'<option value="'+k+'" '+(k===state.convoLevel?"selected":"")+'>'+esc(v)+'</option>').join("")+'</select></label>'+
 '<label>Tipo<select id="coachConvoPractice" class="select"><option value="all" '+(state.convoPractice==="all"?"selected":"")+'>Conversa completa</option><option value="weak" '+(state.convoPractice==="weak"?"selected":"")+'>Repetir falas difíceis</option></select></label></div>'+
 '<h2 style="margin-top:20px">Escolha a situação</h2><div class="coach-scenes">'+scenesList.map(s=>{
 let last=convoHistoryFor(s.id).at(-1),selected=state.sceneId===s.id;
 return '<button class="coach-scene '+(selected?"active":"")+'" data-act="coach-scene" data-id="'+esc(s.id)+'"><span>'+esc(s.emoji)+'</span><strong>'+esc(s.title)+'</strong><small>'+esc(s.group)+' · '+s.turns.length+' turnos'+(last?" · "+Math.round(100*last.score)+"%":"")+'</small></button>';
 }).join("")+'</div>'+
 (!scenesList.length?'<p class="muted">Nenhuma conversa encontrada nesta combinação de filtros.</p>':"")+
 '<button class="btn primary coach-main-btn" data-act="coach-convo-start">Começar conversa</button></section>'+
 '<section class="card coach-history"><h2>Como evoluir</h2>'+
 '<div class="coach-levels"><div><strong>1. Com apoio</strong><p>Leia a tradução, fale sua resposta e confira o exemplo.</p></div><div><strong>2. Com menos apoio</strong><p>Responda sem tradução direta. Se travar, abra a pista.</p></div><div><strong>3. Autonomia</strong><p>Ouça a pergunta e responda sem depender da tela.</p></div></div>'+
 '<p class="muted small">Primeiro tente responder naturalmente. Depois compare sua resposta com os exemplos e avalie se conseguiu se comunicar.</p>'+
 '<h2>Seu histórico</h2><p class="muted small">'+total+' conversa(s) registrada(s)</p>'+
 (state.conversationHistory.length?state.conversationHistory.slice(-8).reverse().map(h=>'<div class="coach-history-line"><span>'+format(h.date)+' · '+esc(h.sceneTitle)+'<small>'+h.turns.length+' turnos · '+esc(h.level)+'</small></span><strong>'+Math.round(h.score*100)+'%</strong></div>').join(""):'<p class="muted">Sua primeira conversa aparecerá aqui.</p>')+
 '</section></div></div>';
}
function convoStep(){
 const scene=SCENARIO_SETS.find(s=>s.id===conversation.sceneId),index=conversation.order[conversation.index],turn=scene.turns[index];
 const guided=conversation.level==="guided",assisted=conversation.level==="assisted";
 const showHelp=guided||conversation.hint,showTranslation=guided||conversation.translated;
 return '<div class="coach-wrap">'+intro("CONVERSAÇÃO · "+scene.group,scene.emoji+" "+scene.title,"Seu interlocutor: "+scene.role+". Dê sua resposta antes de ver o modelo.")+
 '<div class="coach-progress"><div class="row between"><span>Turno '+(conversation.index+1)+' de '+conversation.order.length+'</span><button class="btn secondary sm" data-act="coach-convo-stop">Encerrar</button></div><div class="progress-track"><div class="progress-fill" style="width:'+(100*conversation.index/conversation.order.length)+'%"></div></div></div>'+
 '<section class="card coach-dialogue">'+
 '<div class="coach-bubble-head"><span class="coach-avatar">'+esc(scene.emoji)+'</span><div><small>'+esc(scene.role)+'</small><div class="coach-dialogue-question" lang="es">'+esc(turn.q)+'</div>'+(showTranslation?'<p class="coach-translation">'+esc(turn.pt||"")+'</p>':"")+'</div></div>'+
 '<div class="row wrap coach-dialogue-options"><button class="btn secondary sm" data-act="coach-convo-hear">🔊 Ouvir</button>'+
 (!guided?'<button class="btn secondary sm" data-act="coach-convo-pt">'+(conversation.translated?"Ocultar tradução":"Ver tradução")+'</button>':"")+
 '<button class="btn secondary sm" data-act="coach-convo-hint">'+(conversation.hint?"Ocultar pista":"Ver pista")+'</button></div>'+
 (showHelp?'<div class="coach-dialogue-hint"><strong>Estrutura de apoio:</strong> '+esc(turn.hint||"Responda em frases curtas.")+'</div>':"")+
 '<label class="coach-reply-label" for="coachReply">Sua resposta em espanhol</label>'+
 '<textarea class="textarea" rows="4" id="coachReply" '+(conversation.stage==="compare"?"readonly":"")+' placeholder="Tente responder em voz alta, depois escreva ou use o microfone...">'+esc(conversation.typed)+'</textarea>'+
 '<div class="row wrap coach-dialogue-controls"><button class="btn secondary sm" data-act="coach-convo-mic">🎤 Microfone</button>'+(conversation.stage==="answer"?'<button class="btn secondary sm" data-act="coach-convo-spoke">'+(conversation.spoke?"✓ Resposta oral registrada":"✓ Respondi em voz alta")+'</button>':"")+
 (conversation.stage==="answer"?'<button class="btn primary" data-act="coach-convo-compare">Conferir modelo</button><button class="btn secondary" data-act="coach-convo-giveup">Não sei · ver exemplo</button>':
 '<div class="coach-conversation-feedback"><div class="eyebrow">RESPOSTAS POSSÍVEIS</div>'+turn.examples.map((s,i)=>'<div class="coach-conversation-example"><span>'+String(i+1)+'.</span><strong lang="es">'+esc(s)+'</strong><button class="btn secondary sm" data-act="coach-convo-example" data-index="'+i+'">🔊</button></div>').join("")+
 '<p class="muted small">Há várias formas de responder. Compare com os exemplos e marque como foi sua lembrança.</p>'+
 '<div class="coach-grade-options"><button class="coach-grade" data-act="coach-convo-grade" data-grade="again">Precisei da resposta</button><button class="coach-grade" data-act="coach-convo-grade" data-grade="hard">Consegui com esforço</button><button class="coach-grade" data-act="coach-convo-grade" data-grade="good">Respondi sozinho</button></div></div>')+
 '</div></section></div>';
}
function convoGrade(grade){
 const scene=SCENARIO_SETS.find(x=>x.id===conversation.sceneId),idx=conversation.order[conversation.index];
 const helpUsed=conversation.hint||conversation.translated||conversation.level==="guided";
 // Independent answers that relied on a visible model don't get the maximum score.
 const score=conversation.gaveUp||(!conversation.typed&&!conversation.spoke)?0:grade==="good"&&!helpUsed?1:grade==="again"?0:.5;
 conversation.answers.push({index:idx,grade,score,text:conversation.typed||"",helpUsed,spoke:conversation.spoke,gaveUp:conversation.gaveUp});
 conversation.index++;conversation.typed="";conversation.spoke=false;conversation.gaveUp=false;conversation.stage="answer";conversation.hint=false;conversation.translated=false;
 if(conversation.index>=conversation.order.length){
  let record={id:"conv-"+Date.now(),date:new Date().toISOString(),sceneId:scene.id,sceneTitle:scene.title,level:conversation.level,
    turns:conversation.answers,score:conversation.answers.reduce((n,t)=>n+t.score,0)/Math.max(1,conversation.answers.length)};
  state.conversationHistory.push(record);state.conversationHistory=state.conversationHistory.slice(-80);saveState();
  if(typeof data!=="undefined"){data.scenarioActivity=data.scenarioActivity||{};let day=todayLocal(),row=data.scenarioActivity[day]||{good:0,hard:0};row.good+=conversation.answers.filter(x=>x.grade==="good").length;row.hard+=conversation.answers.filter(x=>x.grade!=="good").length;data.scenarioActivity[day]=row;save();}
  conversation=null;
  chosenResult={convo:record};
 }
 sendRender();
}
function convoFinished(record){
 const difficult=record.turns.filter(t=>t.grade!=="good");
 return '<div class="coach-wrap">'+intro("CONVERSA FINALIZADA","Mais uma conversa concluída","Quanto menos apoio você usar, mais fácil será responder espontaneamente durante a aula.")+
 '<section class="card coach-config coach-finish"><div class="coach-big-score">'+Math.round(record.score*100)+'%</div><h2>'+esc(record.sceneTitle)+'</h2>'+
 '<p>Você avaliou '+record.turns.length+' falas. '+difficult.length+' precisam de reforço.</p>'+
 '<div class="row wrap"><button class="btn primary" data-act="coach-convo-again">Repetir a situação</button>'+
 '<button class="btn secondary" data-act="coach-convo-weak">Treinar só as difíceis</button><button class="btn secondary" data-act="coach-convo-home">Escolher outra conversa</button></div>'+
 '<p class="muted small">Seu resultado considera como você avaliou suas respostas e quantas pistas precisou consultar.</p></section></div>';
}
function conversationsPage(){
 if(chosenResult?.convo)return convoFinished(chosenResult.convo);
 if(conversation)return convoStep();
 return conversationsHome();
}
function route(where){
 chosenResult=null;test=null;conversation=null;
 if(typeof go==="function"){go(where);}
}
function handle(el){
 let act=el.dataset.act;
 if(!act||!act.startsWith("coach-"))return false;
 switch(act){
 case "coach-all":state.units=[1,2,3,4,5,6,7,8,9,10];saveState();sendRender();return true;
 case "coach-clear":state.units=[];saveState();sendRender();return true;
 case "coach-start":chosenResult=null;startDiagnostic();return true;
 case "coach-check": if(!test)return true;
    {const input=document.getElementById("coachAnswer");if(input)test.typed=input.value;
     if(!test.typed.trim()&&!test.spoke){toast("Tente responder ou marque que falou em voz alta. Se não souber, use 'Não lembro'.");return true;}
     test.checked=true;sendRender();return true;}
 case "coach-reveal":if(test){test.typed=document.getElementById("coachAnswer")?.value||test.typed;test.gaveUp=true;test.checked=true;sendRender();}return true;
 case "coach-spoke":if(test){test.typed=document.getElementById("coachAnswer")?.value||test.typed;test.spoke=!test.spoke;sendRender();}return true;
 case "coach-help":if(test){test.typed=document.getElementById("coachAnswer")?.value||test.typed;test.help=!test.help;sendRender();}return true;
 case "coach-translation":if(test){test.typed=document.getElementById("coachAnswer")?.value||test.typed;test.translate=!test.translate;sendRender();}return true;
 case "coach-grade":if(test&&test.checked)collectGrade(el.dataset.grade);return true;
 case "coach-stop":if(confirm("Encerrar este diagnóstico? A sessão não concluída não será registrada.")){test=null;sendRender();}return true;
 case "coach-repeat":chosenResult=null;startDiagnostic();return true;
 case "coach-back":chosenResult=null;sendRender();return true;
 case "coach-result":chosenResult=state.results.find(r=>r.id===el.dataset.resultId)||null;sendRender();return true;
 case "coach-route":route(el.dataset.route);return true;
 case "coach-audio":if(test)listen(test.deck[test.index].prompt);return true;
 case "coach-mic":if(typeof startListening==="function")startListening("coachAnswer");return true;
 case "coach-scene":state.sceneId=el.dataset.id;saveState();sendRender();return true;
 case "coach-convo-start":chosenResult=null;conversationStart();return true;
 case "coach-convo-stop":if(confirm("Encerrar esta conversa sem salvar os turnos?")){conversation=null;sendRender();}return true;
 case "coach-convo-hint":if(conversation){conversation.typed=document.getElementById("coachReply")?.value||conversation.typed;conversation.hint=!conversation.hint;sendRender();}return true;
 case "coach-convo-pt":if(conversation){conversation.typed=document.getElementById("coachReply")?.value||conversation.typed;conversation.translated=!conversation.translated;sendRender();}return true;
 case "coach-convo-hear":if(conversation){const scene=SCENARIO_SETS.find(x=>x.id===conversation.sceneId);listen(scene.turns[conversation.order[conversation.index]].q);}return true;
 case "coach-convo-example":if(conversation){const scene=SCENARIO_SETS.find(x=>x.id===conversation.sceneId);const t=scene.turns[conversation.order[conversation.index]];listen(t.examples[Number(el.dataset.index)]||t.examples[0]);}return true;
 case "coach-convo-mic":if(typeof startListening==="function")startListening("coachReply");return true;
 case "coach-convo-compare":if(conversation){conversation.typed=document.getElementById("coachReply")?.value||conversation.typed;if(!conversation.typed.trim()&&!conversation.spoke){toast("Digite sua resposta ou marque que falou em voz alta. Se não souber, revele o exemplo.");return true;}conversation.stage="compare";sendRender();}return true;
 case "coach-convo-spoke":if(conversation){conversation.typed=document.getElementById("coachReply")?.value||conversation.typed;conversation.spoke=!conversation.spoke;sendRender();}return true;
 case "coach-convo-giveup":if(conversation){conversation.typed=document.getElementById("coachReply")?.value||conversation.typed;conversation.gaveUp=true;conversation.stage="compare";sendRender();}return true;
 case "coach-convo-grade":if(conversation&&conversation.stage==="compare")convoGrade(el.dataset.grade);return true;
 case "coach-convo-again":chosenResult=null;state.convoPractice="all";conversationStart();return true;
 case "coach-convo-weak":chosenResult=null;state.convoPractice="weak";conversationStart();return true;
 case "coach-convo-home":chosenResult=null;conversation=null;sendRender();return true;
 default:return false;
 }
}
document.addEventListener("change",event=>{
 const el=event.target;
 if(el.matches("[data-coach-unit]")){
  let v=Number(el.dataset.coachUnit),s=new Set(state.units);
  el.checked?s.add(v):s.delete(v);state.units=[...s].sort((a,b)=>a-b);saveState();
  if(!test&&!conversation)sendRender();return;
 }
 if(el.id==="coachCount"){state.diagnosticLength=Number(el.value);saveState();}
 if(el.id==="coachSceneGroup"){state.sceneFilter=el.value;saveState();sendRender();}
 if(el.id==="coachLevel"){state.convoLevel=el.value;saveState();}
 if(el.id==="coachConvoPractice"){state.convoPractice=el.value;saveState();}
 if(el.name==="coachOption"&&test)test.typed=el.value;
});
document.addEventListener("input",event=>{
 if(event.target.id==="coachAnswer"&&test)test.typed=event.target.value;
 if(event.target.id==="coachReply"&&conversation)conversation.typed=event.target.value;
});
window.HablaCoach={
 diagnostic:diagnosticPage,dialogues:conversationsPage,handleAction:handle,
 getState:()=>state,
 checkpoint:()=>({test,conversation,chosenResult}),restore:value=>{test=value?.test||null;conversation=value?.conversation||null;chosenResult=value?.chosenResult||null;},
 reload:preserveSession=>{try{state={...DEFAULT,...JSON.parse(window.HablaStore.getItem(KEY)||"{}")};}catch(e){state={...DEFAULT};}if(!preserveSession){test=null;conversation=null;chosenResult=null;}},
 report:()=>({diagnostics:state.results.length,conversations:state.conversationHistory.length})
};
if(typeof GUIDE_PAGES!=="undefined"){
 GUIDE_PAGES.diagnostic=[
  ["Escolha unidades","Combine de uma a dez unidades. O resultado considera cada habilidade na seleção.",".coach-units"],
  ["Avaliação variada","O diagnóstico alterna conjugação, vocabulário, escuta, construção e conversação.",".coach-skills-preview"],
  ["Plano de reforço","Após responder, veja as habilidades e unidades que mais precisam de prática.",".coach-history"]
 ];
 GUIDE_PAGES.dialogues=[
  ["Várias situações reais","Selecione uma conversa de trabalho, rotina, compras ou viagem. Cada situação tem vários turnos.",".coach-scenes"],
  ["Apoio progressivo","Passe de guiado a intermediário e depois desafio, mantendo o mesmo cenário.",".coach-controls"],
  ["Repita o difícil","Revisite apenas as falas em que precisou de ajuda, sem perder o histórico.",".coach-history"]
 ];
}
})();
