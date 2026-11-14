/* Habla A1 · Laboratório de Revisão v1. Expansível para todas as 10 unidades. */
(function(){
"use strict";
var KEY="habla.lab.v1";
var DEFAULT={units:[1,2,3],mode:"mixed",count:15,translations:false,results:{},sessions:[],notifications:{enabled:false,hours:[5,13,20],sent:{}}};
var state;
try{state=Object.assign({},DEFAULT,JSON.parse(window.HablaStore.getItem(KEY)||"{}"));state.notifications=Object.assign({},DEFAULT.notifications,state.notifications||{});}catch(_){state=JSON.parse(JSON.stringify(DEFAULT));}
var session=null;
var unitNames=["Nos presentamos","Mi casa, mi barrio","Vamos de viaje","En familia","Igual que todos los días","No me gusta, ¡me encanta!","Buenas intenciones","Cuídate mucho","Experiencias vividas","Fin de trayecto"];
var modes=[
 ["mixed","Treino misto","Alterna gramática, fala, escuta e frases."],
 ["diagnostic","Diagnóstico","Descubra quais estruturas ainda não fixou."],
 ["cloze","Complete os verbos","Conjugação em frases reais e contextualizadas."],
 ["transform","Transforme a frase","Mude a pessoa gramatical sem traduzir palavra por palavra."],
 ["dictation","Ditado e escuta","Ouça uma frase em espanhol e tente escrevê-la."],
 ["dialogue","Conversação","Responda em voz alta a perguntas de situações reais."],
 ["workbook","Caderno em revisão","Exercícios das unidades do caderno."],
 ["weak","Meus pontos difíceis","Reapresente erros e respostas que exigiram ajuda."]
];
var dialogueData=[
 [
 ["¿Cómo te llamas?","Como você se chama?","Me llamo Ana."],
 ["¿De dónde eres?","De onde você é?","Soy de Brasil."],
 ["¿Dónde vives?","Onde você mora?","Vivo en São Paulo."],
 ["¿Cuántos años tienes?","Quantos anos você tem?","Tengo treinta años."],
 ["¿A qué te dedicas?","Qual é sua profissão?","Soy desarrollador web."],
 ["¿Dónde trabajas?","Onde você trabalha?","Trabajo en una empresa de tecnología."],
 ["¿Puedes deletrear tu apellido?","Você pode soletrar seu sobrenome?","Sí, puedo deletrearlo."]
 ],
 [
 ["¿Cómo es tu casa?","Como é sua casa?","Mi casa es pequeña y cómoda."],
 ["¿Cuántas habitaciones hay?","Quantos cômodos há?","Hay dos habitaciones."],
 ["¿Dónde está la cocina?","Onde fica a cozinha?","Está al lado del salón."],
 ["¿Hay una farmacia en tu barrio?","Há uma farmácia no seu bairro?","Sí, hay una farmacia cerca."],
 ["¿Dónde está el supermercado?","Onde fica o supermercado?","Está enfrente del parque."],
 ["¿Cómo es tu barrio?","Como é seu bairro?","Mi barrio es tranquilo."]
 ],
 [
 ["¿Adónde quieres viajar?","Para onde você quer viajar?","Quiero viajar a México."],
 ["¿Prefieres viajar en avión o en tren?","Você prefere viajar de avião ou trem?","Prefiero viajar en tren."],
 ["¿Cómo puedo llegar al museo?","Como posso chegar ao museu?","Puedes ir en metro."],
 ["¿Dónde está la estación?","Onde fica a estação?","Está cerca del hotel."],
 ["¿Cuánto cuesta la entrada?","Quanto custa a entrada?","Cuesta diez euros."],
 ["¿Hay restaurantes cerca?","Há restaurantes perto?","Sí, hay dos restaurantes."]
 ],
 [
 ["¿Cuántas personas hay en tu familia?","Quantas pessoas há na sua família?","Hay cuatro personas."],
 ["¿Cómo es tu hermana?","Como é sua irmã?","Es simpática y trabajadora."],
 ["¿Qué ropa llevas hoy?","Que roupa você está usando hoje?","Llevo una camiseta azul."],
 ["¿Qué estás haciendo ahora?","O que você está fazendo agora?","Estoy estudiando español."],
 ["¿De quién es esta mochila?","De quem é esta mochila?","Es de mi hermano."]
 ],
 [
 ["¿A qué hora te levantas?","A que horas você se levanta?","Me levanto a las siete."],
 ["¿Qué haces después de desayunar?","O que faz depois do café da manhã?","Trabajo en casa."],
 ["¿Con qué frecuencia estudias español?","Com que frequência estuda espanhol?","Estudio tres veces a la semana."],
 ["¿Qué haces por la noche?","O que você faz à noite?","Leo un libro y descanso."],
 ["¿A qué hora te acuestas?","A que horas você se deita?","Me acuesto a las once."]
 ],
 [
 ["¿Te gusta el fútbol?","Você gosta de futebol?","Sí, me gusta mucho."],
 ["¿Qué comida prefieres?","Que comida você prefere?","Prefiero la comida casera."],
 ["¿Qué te gusta hacer los fines de semana?","O que gosta de fazer nos fins de semana?","Me gusta ver películas."],
 ["¿Te interesan los museos?","Você se interessa por museus?","Sí, me interesan."],
 ["¿Qué quieres pedir de comer?","O que quer pedir para comer?","Quiero una ensalada, por favor."]
 ],
 [
 ["¿Qué vas a hacer mañana?","O que você vai fazer amanhã?","Voy a estudiar español."],
 ["¿Quieres ir al cine este fin de semana?","Quer ir ao cinema neste fim de semana?","Sí, quiero ir."],
 ["¿Qué tienes que hacer hoy?","O que você precisa fazer hoje?","Tengo que trabajar."],
 ["¿Para qué estudias español?","Para que você estuda espanhol?","Para hablar con otras personas."],
 ["¿Necesitas ayuda?","Você precisa de ajuda?","Sí, necesito ayuda."]
 ],
 [
 ["¿Cómo te sientes hoy?","Como você se sente hoje?","Me siento bien, gracias."],
 ["¿Te duele la cabeza?","Sua cabeça está doendo?","No, no me duele."],
 ["¿Puedes descansar un poco?","Você pode descansar um pouco?","Sí, puedo descansar."],
 ["¿Tienes que ir al médico?","Você precisa ir ao médico?","No, ahora no."],
 ["¿Puedes repetir las instrucciones?","Pode repetir as instruções?","Sí, claro."]
 ],
 [
 ["¿Has visitado otro país?","Você já visitou outro país?","Sí, he visitado Argentina."],
 ["¿Has probado la comida mexicana?","Você já provou comida mexicana?","Sí, la he probado."],
 ["¿Has estudiado español esta semana?","Você estudou espanhol nesta semana?","Sí, he estudiado esta semana."],
 ["¿Has estado alguna vez en Madrid?","Você já esteve em Madri?","No, nunca he estado allí."],
 ["¿Has comprado algo hoy?","Você comprou alguma coisa hoje?","Sí, he comprado fruta."]
 ],
 [
 ["¿Qué contenidos quieres repasar?","Que conteúdos você quer revisar?","Quiero repasar los verbos."],
 ["¿Puedes describir tu rutina?","Você consegue descrever sua rotina?","Trabajo por la mañana y estudio por la noche."],
 ["¿Cómo vas al trabajo?","Como você vai ao trabalho?","Voy en metro."],
 ["¿Qué has aprendido hoy?","O que você aprendeu hoje?","He aprendido palabras nuevas."],
 ["¿Qué vas a hacer después de clase?","O que você vai fazer depois da aula?","Voy a descansar."]
 ]
];
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function day(){var d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
function datePlus(days){var d=new Date();d.setDate(d.getDate()+days);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
function persist(){try{window.HablaStore.setItem(KEY,JSON.stringify(state));}catch(_){if(typeof toast==="function")toast("Não foi possível salvar as revisões.");}}
function normalize(v){return String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es").replace(/[¿?¡!.,;:]/g,"").replace(/\s+/g," ").trim();}
function shuffled(list){var copy=list.slice();for(var i=copy.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var a=copy[i];copy[i]=copy[j];copy[j]=a;}return copy;}
function selectedUnits(){return state.units.length?state.units.slice().sort(function(a,b){return a-b;}):[1];}
function sources(){
 var all=[],units=selectedUnits();
 if(typeof VERB_BANK!=="undefined")VERB_BANK.verbs.forEach(function(v){
  if(!units.includes(v.unit))return;
  var contexts=v.contexts||[];
  for(var i=0;i<6;i++)for(var j=0;j<contexts.length;j++){
   var q=verbalSentence(v,i,j),key="v:"+q.id;
   all.push({id:key,unit:v.unit,type:"cloze",lemma:v.lemma,prompt:q.mask,es:q.es,pt:q.pt,answer:q.form,full:q.es,person:i});
   if(j<2&&i<5){var target=verbalSentence(v,(i+1)%6,j);all.push({id:"t:"+q.id,unit:v.unit,type:"transform",lemma:v.lemma,prompt:q.es,es:target.es,pt:target.pt,answer:target.es,full:target.es,person:(i+1)%6});}
   if(i<2&&j<2)all.push({id:"d:"+q.id,unit:v.unit,type:"dictation",lemma:v.lemma,prompt:"Ouça e escreva a frase.",es:q.es,pt:q.pt,answer:q.es,full:q.es});
  }
 });
 dialogueData.forEach(function(rows,index){var unit=index+1;if(!units.includes(unit))return;
  rows.forEach(function(r,j){all.push({id:"c:"+unit+":"+j,unit:unit,type:"dialogue",prompt:r[0],pt:r[1],answer:r[2],es:r[0],full:r[2]});});
 });
 if(typeof BOOK_EX!=="undefined")BOOK_EX.forEach(function(ex){
  if(!units.includes(ex.unit)||!["fill","choice","tf","order"].includes(ex.kind))return;
  ex.items.forEach(function(item,i){if(!item.answer)return;all.push({id:"w:"+ex.id+":"+i,unit:ex.unit,type:"workbook",prompt:item.prompt,answer:item.answer,es:item.prompt,pt:"Exercício do caderno · "+ex.title,full:item.answer,choices:item.options||null,exid:ex.id});});
 });
 return all;
}
function stats(q){return state.results[q.id]||null;}
function due(q){var p=stats(q);return p&&p.due&&p.due<=day();}
function weights(pool){return pool.map(function(q){var p=stats(q);return {q:q,w:!p?4:due(q)?12:p.last==="again"?9:p.last==="hard"?6:1};});}
function sequence(pool,n){var weighted=weights(pool);var bag=[],used=new Set();while(bag.length<n&&used.size<pool.length){var total=weighted.reduce(function(s,x){return s+(used.has(x.q.id)?0:x.w);},0);if(!total)break;var choice=Math.random()*total;for(var x of weighted){if(used.has(x.q.id))continue;choice-=x.w;if(choice<=0){bag.push(x.q);used.add(x.q.id);break;}}}return bag;}
function poolFor(mode){var pool=sources();if(mode==="weak")return pool.filter(function(q){var p=stats(q);return p&&(due(q)||p.last==="again"||p.last==="hard");});if(mode==="diagnostic")return pool.filter(function(q){return q.type==="cloze"||q.type==="dialogue"||q.type==="workbook";});if(mode==="mixed")return pool;return pool.filter(function(q){return q.type===mode;});}
function countDue(){return sources().filter(due).length;}
function summary(){var units=selectedUnits(),result=state.results||{},train=Object.values(result);return {trained:train.length,due:countDue(),sessions:state.sessions.length,units:units.length};}
function btn(text,act,extra){return '<button class="btn '+(extra||"secondary")+'" data-act="'+act+'">'+esc(text)+'</button>';}
function helpText(){return '<div class="lab-note"><strong>Como funciona</strong><p>Escolha quantas unidades quiser. O diagnóstico mostra dificuldades; os demais modos treinam a lembrança. Leia a tradução somente depois de tentar responder. Nenhum modo é limitado às três primeiras unidades.</p></div>';}
function pickPanel(){
 var u=selectedUnits(),mode=state.mode;
 return '<section class="card lab-setup"><div class="row between wrap"><div><div class="eyebrow">PLANO PERSONALIZÁVEL</div><h2>Selecione as unidades</h2><p class="muted small">As mesmas modalidades continuam funcionando conforme você avança até a Unidade 10.</p></div><div class="lab-actions">'+btn("Todas","lab-all","secondary sm")+btn("Limpar","lab-none","secondary sm")+'</div></div>'+
 '<div class="lab-units">'+unitNames.map(function(name,i){return '<label class="lab-unit '+(u.includes(i+1)?"is-on":"")+'"><input type="checkbox" data-lab-unit="'+(i+1)+'" '+(u.includes(i+1)?"checked":"")+'><span class="lab-num">'+(i+1)+'</span><span>'+esc(name)+'</span></label>';}).join("")+'</div>'+
 '<div class="lab-controls"><label>Modo de estudo<select id="labMode" class="select">'+modes.map(function(m){return '<option value="'+m[0]+'" '+(mode===m[0]?"selected":"")+'>'+esc(m[1])+'</option>';}).join("")+'</select></label><label>Quantidade<select id="labCount" class="select">'+[5,10,15,20,30].map(function(n){return '<option value="'+n+'" '+(state.count===n?"selected":"")+'>'+n+' questões</option>';}).join("")+'</select></label></div>'+
 '<p class="muted small">'+esc((modes.find(function(m){return m[0]===mode;})||modes[0])[2])+'</p>'+
 '<button class="btn primary lab-start" data-act="lab-start">▶ Iniciar meu estudo</button></section>';
}
function remindersPanel(){
 var n=state.notifications,perm=("Notification" in window)?Notification.permission:"unsupported";
 return '<section class="card lab-reminders"><div class="row between wrap"><div><h2>⏰ Lembretes de frequência</h2><p class="muted small">Horários locais, individualmente por aparelho. Você pode desativar qualquer um.</p></div><span class="chip">'+(perm==="granted"?"Permissão ativa":perm==="denied"?"Bloqueado no navegador":"Opcional")+'</span></div>'+
 '<div class="lab-hours">'+[5,13,20].map(function(hour){return '<label><input data-lab-hour="'+hour+'" type="checkbox" '+(n.hours.includes(hour)?"checked":"")+'><span>'+String(hour).padStart(2,"0")+':00</span></label>';}).join("")+'</div>'+
 '<div class="row wrap">'+btn(n.enabled?"Desativar lembretes":"Ativar lembretes","lab-notify",n.enabled?"secondary":"primary")+btn("Testar notificação","lab-test","secondary")+'</div>'+
 '<p class="lab-caution">Os avisos aparecem quando o Habla está aberto. Para não esquecer de estudar com o aplicativo fechado, também vale configurar um alarme no celular.</p></section>';
}
function overview(){
 var s=summary();
 return '<div class="lab-shell">'+heading("ROTINA DE ESTUDOS","Revisão inteligente","Estude qualquer combinação das 10 unidades, no dia que preferir, aproveitando os bancos de frases, verbos e questões já disponíveis.")+
 '<div class="grid four lab-kpis"><div class="card stat"><div class="stat-label">Unidades escolhidas</div><div class="value">'+s.units+'</div></div><div class="card stat"><div class="stat-label">Itens praticados</div><div class="value">'+s.trained+'</div></div><div class="card stat"><div class="stat-label">Revisões vencidas</div><div class="value">'+s.due+'</div></div><div class="card stat"><div class="stat-label">Sessões concluídas</div><div class="value">'+s.sessions+'</div></div></div>'+
 '<div class="lab-grid">'+pickPanel()+'<div class="lab-side">'+helpText()+'<div class="card lab-tiny"><h2>O que torna este treino adaptativo?</h2><p>Uma resposta esquecida volta antes; uma resposta recuperada facilmente tem uma pausa maior. Sua avaliação é considerada mesmo se a resposta estava correta.</p><p class="muted small">Seus estudos ficam salvos neste aparelho. Use o backup para guardar seu progresso.</p></div></div></div>'+
 '<div style="margin-top:16px">'+remindersPanel()+'</div>'+
 '<div class="card lab-summary"><h2>Últimas sessões</h2>'+(state.sessions.length?state.sessions.slice(-5).reverse().map(function(x){return '<div class="lab-history"><strong>'+esc(x.label)+'</strong><span>'+x.date+' · '+x.done+'/'+x.total+' respostas avaliadas</span></div>';}).join(""):'<p class="muted">Comece o primeiro treino para construir seu histórico.</p>')+'</div></div>';
}
function ask(q){
 var kind=q.type,isManual=kind==="dialogue",isAudio=kind==="dictation",isWorkbook=kind==="workbook";
 var uiText=(kind==="transform"?"Transforme para a próxima pessoa (indicada abaixo).":kind==="cloze"?"Complete com a conjugação correta.":kind==="dictation"?"Ouça a frase e digite o que entendeu.":kind==="dialogue"?"Responda em espanhol — de preferência em voz alta.":"Resolva a atividade do caderno.");
 var options=(q.choices||[]).slice();
 var answer=session.answer||"";
 var textPrompt=isAudio?'<p class="lab-audio-prompt">🎧 Escute e escreva o que entendeu.</p>':'<div class="lab-prompt">'+esc(q.prompt)+'</div>';
 if(kind==="transform")textPrompt+='<p class="lab-person">Novo sujeito: <strong>'+esc(VERB_PEOPLE[q.person])+'</strong></p>';
 return '<section class="card lab-question"><div class="row between wrap"><span class="chip">Unidade '+q.unit+' · '+esc(unitNames[q.unit-1])+'</span><span class="muted small">'+uiText+'</span></div>'+
 textPrompt+'<div class="lab-response">'+((isAudio||isManual)?'<button class="btn secondary sm" data-act="lab-listen">'+(isAudio?"🔊 Ouvir frase":"🔊 Ouvir pergunta")+'</button>':'')+
 '<label class="lab-answer-label" for="labAnswer">'+(isManual?"Sua resposta (ou fale e avalie de memória)":"Sua resposta")+'</label>'+
 (options.length&&kind==="workbook"?'<select id="labAnswer" class="field"><option value="">Escolha uma resposta</option>'+options.map(function(opt){return '<option value="'+esc(opt)+'" '+(opt===answer?"selected":"")+'>'+esc(opt)+'</option>';}).join("")+'</select>':'<textarea id="labAnswer" class="field" rows="'+(kind==="transform"||kind==="dialogue"?"3":"2")+'" placeholder="Tente lembrar antes de revelar..." '+(session.revealed?"readonly":"")+'>'+esc(answer)+'</textarea>')+'</div>'+
 '<div class="lab-help-row"><button class="btn secondary sm" data-act="lab-translation">'+(session.translation?"Ocultar tradução":"Ver tradução")+'</button><button class="btn secondary sm" data-act="lab-hint">Ver dica</button><button class="btn secondary sm" data-act="lab-mic">🎤 Falar resposta</button></div>'+
 (session.translation?'<div class="lab-reveal">'+esc(q.pt||"Use o contexto da atividade para compreender a pergunta.")+'</div>':'')+
 (session.hint?'<div class="lab-reveal">Dica: '+esc(kind==="cloze"?"Infinitivo: "+q.lemma+" · sujeito: "+VERB_PEOPLE[q.person]:kind==="transform"?"Troque o sujeito e a conjugação.":kind==="dictation"?"Ouça em partes.":kind==="dialogue"?"Use uma resposta curta e clara.":"Leia o contexto e escolha com atenção.")+'</div>':'')+
 '<div class="row wrap lab-submit">'+(!session.revealed?'<button class="btn primary" data-act="lab-check">'+(isManual?"Mostrar resposta-modelo":"Corrigir / revelar")+'</button><button class="btn secondary" data-act="lab-giveup">Não lembro · revelar</button>':"")+'</div>'+
 (session.revealed?feedback(q):'')+'</section>';
}
function feedback(q){
 var auto=q.type!=="dialogue",typed=session.answer,match=auto&&normalize(typed)===normalize(q.answer);
 return '<div class="lab-feedback"><div class="lab-feedback-title">'+(auto?(match?"✓ Resposta correspondente":"Compare com a resposta:"):"Compare com uma resposta possível:")+'</div><div class="lab-correct">'+esc(q.answer)+'</div><div class="muted small">Tradução: '+esc(q.pt||"Tradução integral ainda não cadastrada para este item.")+'</div>'+
 '<p class="muted small">Uma resposta diferente também pode estar correta em conversações. Avalie se você conseguiu responder sem ajuda.</p>'+
 '<div class="lab-ratings">'+[["again","Precisei de ajuda"],["hard","Demorei para lembrar"],["good","Lembrei sozinho"]].map(function(r){return '<button class="lab-rating" data-act="lab-rate" data-value="'+r[0]+'">'+esc(r[1])+'</button>';}).join("")+'</div></div>';
}
function reviewScreen(){
 if(!session)return overview();
 if(session.index>=session.deck.length)return finished();
 var q=session.deck[session.index];
 return '<div class="lab-shell">'+heading("SESSÃO DE ESTUDOS",session.mode==="diagnostic"?"Diagnóstico A1":"Treino de recuperação","Responda antes de revelar. Avalie sua lembrança para organizar os próximos treinos.")+
 '<div class="lab-progress"><div class="row between"><span>Questão '+(session.index+1)+' de '+session.deck.length+'</span><button class="btn secondary sm" data-act="lab-exit">Encerrar treino</button></div><div class="progress-track"><div class="progress-fill" style="width:'+Math.round(100*session.index/session.deck.length)+'%"></div></div></div>'+ask(q)+'</div>';
}
function finished(){
 var grades=session.grades||[],good=grades.filter(function(x){return x==="good";}).length,hard=grades.filter(function(x){return x==="hard";}).length,again=grades.filter(function(x){return x==="again";}).length;
 return '<div class="lab-shell">'+heading("SESSÃO CONCLUÍDA","Treino finalizado","Seu estudo foi registrado no calendário de frequência do Habla.")+
 '<section class="card lab-done"><h2>Você avaliou '+grades.length+' respostas</h2><div class="grid three"><div class="card"><strong>'+good+'</strong><span>Lembrei sozinho</span></div><div class="card"><strong>'+hard+'</strong><span>Demorei</span></div><div class="card"><strong>'+again+'</strong><span>Precisei de ajuda</span></div></div><p>Priorize as respostas difíceis nos próximos dias. Você pode repetir com outras unidades ou outras modalidades.</p>'+btn("Montar novo treino","lab-reset","primary")+'</section></div>';
}
function render(){return session?reviewScreen():overview();}
function noticeNow(){
 if(!("Notification" in window)||Notification.permission!=="granted")return Promise.reject(Error("Ative as notificações nas configurações do aparelho."));
 if("serviceWorker" in navigator)return navigator.serviceWorker.ready.then(function(reg){return reg.showNotification("Habla · hora de estudar", {body:"Uma prática curta hoje ajuda a manter sua sequência. Abra o Habla e revise algumas frases.",icon:"./icon-192.png",badge:"./icon-192.png",tag:"habla-study-"+day(),data:{url:"./"}});});
 return Promise.reject(Error("Não foi possível enviar este aviso agora."));
}
async function enableNotifications(){
 if(!("Notification" in window)){toast("Seu navegador não oferece notificações.");return;}
 if(state.notifications.enabled){state.notifications.enabled=false;persist();render();return;}
 var status=Notification.permission;
 if(status==="default")status=await Notification.requestPermission();
 if(status!=="granted"){toast("Ative a permissão de notificações nas configurações do aparelho.");return;}
 state.notifications.enabled=true;persist();render();toast("Lembretes ativados para quando o Habla estiver aberto.");
}
function reminderTick(){
 var n=state.notifications;if(!n.enabled||!("Notification" in window)||Notification.permission!=="granted")return;
 if(typeof dayActivity==="function"&&dayActivity(today()).attempts>0)return;
 var now=new Date(),todayStr=day(),hour=now.getHours();
 var slots=n.hours.filter(function(h){return hour===h&&now.getMinutes()<15;}).sort(function(a,b){return b-a;});
 if(!slots.length)return;
 var slot=slots[0],marker=todayStr+"-"+slot;
 if(n.sent[marker])return;
 n.sent[marker]=true;
 var keys=Object.keys(n.sent).sort();if(keys.length>40)keys.slice(0,-40).forEach(function(k){delete n.sent[k];});
 persist();
 noticeNow().catch(function(){});
}
function graded(rating){
 var q=session.deck[session.index],old=state.results[q.id]||{reps:0,lapses:0},reps=rating==="again"?0:old.reps+1;
 var delay=rating==="again"?1:rating==="hard"?2:Math.min(35,reps===1?3:Math.round(3*Math.pow(2,reps-1)));
 state.results[q.id]={reps:reps,lapses:old.lapses+(rating==="again"?1:0),last:rating,due:datePlus(delay),when:day()};
 session.grades.push(rating);
 data.activity=data.activity||{};var d=day(),act=data.activity[d]||{attempts:0,good:0};act.attempts++;if(rating==="good")act.good++;data.activity[d]=act;
 save();persist();
 session.index++;session.revealed=false;session.answer="";session.translation=false;session.hint=false;
 if(session.index>=session.deck.length){state.sessions.push({date:day(),label:(modes.find(function(x){return x[0]===session.mode;})||[])[1]||"Revisão",done:session.grades.length,total:session.deck.length,units:selectedUnits()});if(state.sessions.length>120)state.sessions=state.sessions.slice(-120);persist();}
 renderBase();
}
function renderBase(){if(typeof window.render==="function")window.render();}
function handleAction(el){
 var act=el.dataset.act;if(!act||act.indexOf("lab-")!==0)return false;
 switch(act){
 case "lab-all":state.units=[1,2,3,4,5,6,7,8,9,10];persist();renderBase();break;
 case "lab-none":state.units=[];persist();renderBase();break;
 case "lab-start":{
  if(!state.units.length){toast("Escolha pelo menos uma unidade.");break;}
  var pool=poolFor(state.mode);if(!pool.length){toast("Ainda não há exercícios nesta seleção. Experimente outro modo.");break;}
  session={mode:state.mode,deck:sequence(pool,Math.min(state.mode==="diagnostic"?15:state.count,pool.length)),index:0,grades:[],revealed:false,translation:false,hint:false,answer:""};renderBase();break;
 }
 case "lab-check":{
  if(!session)break;var input=document.getElementById("labAnswer");session.answer=input?input.value:"";if(!session.answer.trim()&&session.deck[session.index].type!=="dialogue"){toast("Tente responder primeiro ou use Não lembro para revelar.");break;}session.revealed=true;renderBase();break;
 }
 case "lab-giveup":if(session){session.answer="";session.revealed=true;renderBase();}break;
 case "lab-mic":if(session&&typeof startListening==="function")startListening("labAnswer");break;
 case "lab-translation":session.translation=!session.translation;session.answer=(document.getElementById("labAnswer")||{}).value||session.answer;renderBase();break;
 case "lab-hint":session.hint=!session.hint;session.answer=(document.getElementById("labAnswer")||{}).value||session.answer;renderBase();break;
 case "lab-listen":if(session){var q=session.deck[session.index];speak(q.type==="dialogue"?q.prompt:q.es);}break;
 case "lab-rate":graded(el.dataset.value);break;
 
 case "lab-exit":session=null;renderBase();break;
 case "lab-reset":session=null;renderBase();break;
 case "lab-notify":enableNotifications();break;
 case "lab-test":noticeNow().then(function(){toast("Notificação de teste enviada.");}).catch(function(){toast("Ative as notificações e permita no navegador antes de testar.");});break;
 default:return false;
 }
 return true;
}
document.addEventListener("change",function(ev){
 var t=ev.target;
 if(t.matches("[data-lab-unit]")){var num=Number(t.dataset.labUnit),set=new Set(state.units);t.checked?set.add(num):set.delete(num);state.units=Array.from(set);persist();renderBase();}
 if(t.id==="labMode"){state.mode=t.value;persist();renderBase();}
 if(t.id==="labCount"){state.count=Number(t.value);persist();renderBase();}
 if(t.matches("[data-lab-hour]")){var h=Number(t.dataset.labHour),hours=new Set(state.notifications.hours);t.checked?hours.add(h):hours.delete(h);state.notifications.hours=Array.from(hours).sort(function(a,b){return a-b;});persist();renderBase();}
});
document.addEventListener("visibilitychange",function(){if(!document.hidden)reminderTick();});
window.addEventListener("focus",reminderTick);
setInterval(reminderTick,60000);
setTimeout(reminderTick,1200);
window.HablaLab={render:render,handleAction:handleAction,settings:state,checkpoint:()=>session,restore:value=>{session=value||null;},reload:function(preserveSession){try{var re=JSON.parse(window.HablaStore.getItem(KEY)||"{}");state=Object.assign({},DEFAULT,re);state.notifications=Object.assign({},DEFAULT.notifications,state.notifications||{});window.HablaLab.settings=state;if(!preserveSession)session=null;}catch(_){}}};
if(typeof GUIDE_PAGES!=="undefined")GUIDE_PAGES.lab=[
 ["Selecione as unidades","Escolha uma, várias ou todas as unidades; suas preferências ficam salvas.",".lab-units"],
 ["Alterne os tipos de treino","Diagnóstico, conjugação, transformação, ditado, conversação e exercícios do caderno.",".lab-controls"],
 ["Revisão de memória","Avalie o quanto lembrou para criar sua fila de revisão personalizada.",".lab-start"],
 ["Lembretes do aplicativo","Ative horários se desejar. Para avisos com o aplicativo fechado será necessário um servidor de push.",".lab-reminders"]
];
})();
