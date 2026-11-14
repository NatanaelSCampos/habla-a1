/* Habla A1 — Caderno de Dúvidas.
   Anotações vinculadas ao progresso de cada estudante. */
(function() {
"use strict";
var activeId=null, formOpen=false, focusOnNext=false, teacherMode=false;
var filter={status:"pending",unit:"all",query:""};
var unitNames=["Nos presentamos","Mi casa, mi barrio","Vamos de viaje","En familia",
 "Igual que todos los días","No me gusta, ¡me encanta!","Buenas intenciones",
 "Cuídate mucho","Experiencias vividas","Fin de trayecto"];
function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function collection(){
 if(!Array.isArray(data.doubts))data.doubts=[];
 return data.doubts;
}
function id(){
 return "d-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,9);
}
function now(){return new Date().toISOString();}
function formatDate(s){if(!s)return "";var d=new Date(s);return isNaN(d)?"":d.toLocaleDateString("pt-BR",{day:"2-digit",month:"short",year:"numeric"});}
function statusLabel(s){return s==="resolved"?"Tirada na aula":"Pendente";}
function sortDoubts(list){
 return list.slice().sort(function(a,b){if(a.status!==b.status)return a.status==="pending"?-1:1;return (b.updatedAt||b.createdAt||"").localeCompare(a.updatedAt||a.createdAt||"");});
}
function matches(d){
 var f=filter,matchStatus=f.status==="all"||d.status===f.status,matchUnit=f.unit==="all"||String(d.unit)===f.unit;
 var haystack=(d.question+" "+(d.questionES||"")+" "+(d.context||"")+" "+(d.teacherAnswer||"")).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
 var needle=f.query.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
 return matchStatus&&matchUnit&&(!needle||haystack.includes(needle));
}
function refresh(){if(typeof render==="function")render();}
function doc(id){return collection().find(function(d){return d.id===id;});}
function edit(did){
 activeId=did===null?null:did;formOpen=true;focusOnNext=true;refresh();
 var e=document.getElementById("doubtQuestion");
 if(e&&focusOnNext){e.focus({preventScroll:true});e.scrollIntoView({behavior:"smooth",block:"center"});focusOnNext=false;}
}
function stats(){
 var all=collection(),pending=all.filter(function(x){return x.status==="pending";}).length;
 return {pending:pending,resolved:all.length-pending,all:all.length};
}
function card(d){
 var pt=d.question,notes=d.teacherAnswer||"",unit=d.unit>0&&d.unit<=10?"Unidade "+d.unit+" · "+unitNames[d.unit-1]:"Geral / aula",
 ctx=d.context?"<p class=\"doubt-context\">"+esc(d.context)+"</p>":"",
 translated=d.questionES?"<div class=\"doubt-es\"><span>Como perguntar em espanhol</span><strong lang=\"es\">"+esc(d.questionES)+"</strong><button class=\"btn secondary sm\" data-act=\"doubt-copy\" data-id=\""+esc(d.id)+"\">Copiar</button></div>":"";
 return '<article class="card doubt-card '+(d.status==="resolved"?"resolved":"")+'">'+
 '<div class="doubt-card-head"><span class="doubt-pill '+(d.status==="resolved"?"done":"")+'">'+(d.status==="resolved"?"✓ Respondida":"● Pendente")+'</span><span class="doubt-meta">'+esc(unit)+' · '+esc(formatDate(d.createdAt))+'</span></div>'+
 '<h3>'+esc(pt)+'</h3>'+ctx+translated+
 (notes?'<div class="doubt-answer"><span>Explicação do professor</span><div>'+esc(notes).replace(/\n/g,"<br>")+'</div></div>':'')+
 '<div class="doubt-actions"><button class="btn primary sm" data-act="doubt-edit" data-id="'+esc(d.id)+'">'+(d.status==="pending"?"Anotar resposta":"Editar anotação")+'</button>'+
 (d.status==="pending"?'<button class="btn secondary sm" data-act="doubt-resolve" data-id="'+esc(d.id)+'">✓ Marcar como tirada</button>':'<button class="btn secondary sm" data-act="doubt-reopen" data-id="'+esc(d.id)+'">Reabrir dúvida</button>')+
 '<button class="btn secondary sm" data-act="doubt-delete" data-id="'+esc(d.id)+'" title="Excluir dúvida">Excluir</button></div></article>';
}
function renderList(){
 var list=sortDoubts(collection().filter(matches));
 return list.length?list.map(card).join(""):'<div class="doubt-empty"><span class="doubt-empty-icon">🗒️</span><strong>'+ (filter.status==="pending"?"Nenhuma dúvida pendente nesta seleção.":"Nenhuma dúvida encontrada.")+'</strong><p>Registre uma dúvida assim que ela aparecer e aproveite a próxima aula para esclarecê-la.</p><button class="btn primary" data-act="doubt-new">+ Criar dúvida</button></div>';
}
function form(){
 var d=activeId?doc(activeId):null,values=d||data.doubtDraft||{};
 return '<section class="card doubt-form" id="doubtForm">'+
 '<div class="row between wrap"><div><div class="eyebrow">'+(d?"ATUALIZAR ANOTAÇÃO":"NOVA PERGUNTA")+'</div><h2>'+(d?"Editar dúvida":"Anotar uma dúvida")+'</h2></div><button class="btn secondary sm" data-act="doubt-cancel">Fechar</button></div>'+
 '<form id="doubtEntry" class="doubt-entry"><label for="doubtQuestion">O que você quer perguntar ao professor? <b>*</b></label>'+
 '<textarea id="doubtQuestion" name="question" maxlength="900" rows="3" required placeholder="Ex.: Quando devo usar ser e quando devo usar estar?">'+esc(values.question||"")+'</textarea>'+
 '<div class="doubt-two"><label>Unidade relacionada<select name="unit">'+
 '<option value="0" '+(!values.unit?"selected":"")+'>Geral / não sei a unidade</option>'+
 unitNames.map(function(label,i){return '<option value="'+(i+1)+'" '+(Number(values.unit)===i+1?"selected":"")+'>'+(i+1)+' · '+esc(label)+'</option>';}).join("")+
 '</select></label><label>Estado<select name="status"><option value="pending" '+(values.status!=="resolved"?"selected":"")+'>Pendente</option><option value="resolved" '+(values.status==="resolved"?"selected":"")+'>Já tirei a dúvida</option></select></label></div>'+
 '<label for="doubtQuestionES">Como perguntar em espanhol (opcional)</label>'+
 '<textarea id="doubtQuestionES" name="questionES" rows="2" maxlength="900" placeholder="Ex.: ¿Cuándo uso «ser» y cuándo «estar»?">'+esc(values.questionES||"")+'</textarea>'+
 '<label for="doubtContext">Contexto / exemplo que gerou a dúvida (opcional)</label>'+
 '<textarea id="doubtContext" name="context" rows="2" maxlength="1200" placeholder="Ex.: Escrevi «soy en casa» e não sabia como corrigir.">'+esc(values.context||"")+'</textarea>'+
 '<label for="doubtAnswer">O que o professor explicou? (pode preencher depois)</label>'+
 '<textarea id="doubtAnswer" name="teacherAnswer" rows="5" maxlength="8000" placeholder="Registre a explicação com suas palavras, exemplos e correções do professor.">'+esc(values.teacherAnswer||"")+'</textarea>'+
 '<div class="doubt-form-actions"><button class="btn primary" type="submit">'+(d?"Salvar alterações":"Salvar dúvida")+'</button><button class="btn secondary" type="button" data-act="doubt-cancel">Cancelar</button></div>'+
 '<p class="muted tiny">Suas anotações ficam salvas neste aparelho e podem ser guardadas com o backup. Criar ou editar uma dúvida não conta como prática para a sequência diária.</p>'+
 '</form></section>';
}
function screen(){
 var s=stats(),selected=filter.status;
 return '<div class="doubt-shell">'+heading("APOIO PARA A AULA","Meu caderno de dúvidas","Guarde o que não entendeu, leve as perguntas para o Víctor e registre o que ele explicou. Seu histórico fica organizado por unidade.")+
 '<div class="grid three doubt-stats">'+
 '<div class="card stat"><div class="stat-label">Para perguntar</div><div class="value">'+s.pending+'</div></div>'+
 '<div class="card stat"><div class="stat-label">Já esclarecidas</div><div class="value">'+s.resolved+'</div></div>'+
 '<div class="card stat"><div class="stat-label">Total anotadas</div><div class="value">'+s.all+'</div></div></div>'+
 '<div class="doubt-toolbar card"><div class="doubt-toolbar-intro"><div><h2>Suas perguntas</h2><p>Abra as pendentes durante a aula. Depois, anote a resposta e marque como tirada.</p></div><button class="btn primary" data-act="doubt-new">+ Nova dúvida</button></div>'+
 '<div class="doubt-filters"><div class="doubt-tabs" role="group" aria-label="Filtrar por estado">'+
 [['pending',"Pendentes"],["resolved","Respondidas"],["all","Todas"]].map(function(x){return '<button class="'+(selected===x[0]?"active":"")+'" data-act="doubt-filter" data-value="'+x[0]+'">'+x[1]+'</button>';}).join("")+
 '</div><label class="sr-only" for="doubtUnitFilter">Filtrar unidade</label><select id="doubtUnitFilter"><option value="all">Todas as unidades</option>'+unitNames.map(function(n,i){return '<option value="'+(i+1)+'" '+(filter.unit===String(i+1)?"selected":"")+'>'+(i+1)+' · '+esc(n)+'</option>';}).join("")+'</select>'+
 '<input id="doubtSearch" type="search" maxlength="100" placeholder="Buscar dúvida ou explicação..." value="'+esc(filter.query)+'" aria-label="Buscar dúvida"></div>'+
 '<div class="doubt-mode"><label><input type="checkbox" id="doubtTeacherMode" '+(teacherMode?"checked":"")+'><span>Modo aula: mostrar dúvidas com mais destaque</span></label></div>'+
 '</div>'+
 (formOpen?form():"")+
 '<div class="doubt-list'+(teacherMode?" teacher-mode":"")+'" id="doubtList">'+renderList()+'</div>'+
 '<div class="doubt-guide card"><strong>Como aproveitar o caderno</strong><p>1. Registre a dúvida quando estiver estudando. 2. Na aula, abra “Pendentes” e pergunte ao professor. 3. Anote a explicação e marque como respondida. 4. Se continuar com dificuldade, reabra sem perder as anotações.</p></div></div>';
}
function saveDraftFromForm(){
 if(!formOpen||activeId!==null)return;
 var f=document.getElementById("doubtEntry");if(!f)return;
 var fd=new FormData(f);data.doubtDraft={question:String(fd.get("question")||""),unit:Number(fd.get("unit")||0),status:String(fd.get("status")||"pending"),questionES:String(fd.get("questionES")||""),context:String(fd.get("context")||""),teacherAnswer:String(fd.get("teacherAnswer")||"")};
 save();
}
function submit(formEl){
 var fd=new FormData(formEl),
 question=String(fd.get("question")||"").trim(),
 status=fd.get("status")==="resolved"?"resolved":"pending",
 unit=Number(fd.get("unit")),context=String(fd.get("context")||"").trim(),teacherAnswer=String(fd.get("teacherAnswer")||"").trim(),
 questionES=String(fd.get("questionES")||"").trim();
 if(!question){toast("Escreva sua dúvida antes de salvar.");return;}
 if(question.length>900||questionES.length>900||context.length>1200||teacherAnswer.length>8000){toast("Sua anotação ultrapassou o limite permitido.");return;}
 var old=activeId?doc(activeId):null;
 var time=now(),record={id:old?old.id:id(),question:question,questionES:questionES,context:context,
 teacherAnswer:teacherAnswer,unit:unit>=1&&unit<=10?unit:0,status:status,
 createdAt:old?old.createdAt:time,updatedAt:time,resolvedAt:status==="resolved"?(old&&old.resolvedAt?old.resolvedAt:time):null};
 if(old){var p=collection().findIndex(function(x){return x.id===old.id;});if(p>=0)data.doubts[p]=record;}else collection().push(record);
 data.doubtDraft=null;save();activeId=null;formOpen=false;filter.status=status==="resolved"?"resolved":"pending";refresh();
 toast(old?"Dúvida atualizada.":"Dúvida salva para sua próxima aula.");
}
function action(el){
 var action=el.dataset.act;
 if(!action||!action.startsWith("doubt-"))return false;
 var did=el.dataset.id,rec=did?doc(did):null;
 switch(action){
 case "doubt-new":edit(null);break;
 case "doubt-edit":if(rec)edit(rec.id);break;
 case "doubt-cancel":activeId=null;formOpen=false;data.doubtDraft=null;save();refresh();break;
 case "doubt-resolve":if(rec){if(!rec.teacherAnswer){edit(rec.id);toast("Registre a explicação do professor e selecione 'Já tirei a dúvida'.");}else{rec.status="resolved";rec.resolvedAt=now();rec.updatedAt=now();save();refresh();}}break;
 case "doubt-reopen":if(rec){rec.status="pending";rec.resolvedAt=null;rec.updatedAt=now();save();filter.status="pending";refresh();toast("Dúvida reaberta.");}break;
 case "doubt-delete":if(rec&&confirm("Excluir esta dúvida e a anotação do professor?")){data.doubts=collection().filter(function(x){return x.id!==rec.id;});if(activeId===rec.id){activeId=null;formOpen=false;}save();refresh();toast("Dúvida excluída.");}break;
 case "doubt-filter":filter.status=el.dataset.value;formOpen=false;activeId=null;refresh();break;
 case "doubt-copy":if(rec&&rec.questionES)copyText(rec.questionES);break;
 default:return false;
 }
 return true;
}
document.addEventListener("submit",function(e){if(e.target.id!=="doubtEntry")return;e.preventDefault();submit(e.target);});
document.addEventListener("input",function(e){
 if(e.target.id==="doubtSearch"){
  filter.query=e.target.value;var list=document.getElementById("doubtList");if(list)list.innerHTML=renderList();return;
 }
 if(e.target.closest("#doubtEntry"))saveDraftFromForm();
});
document.addEventListener("change",function(e){
 if(e.target.id==="doubtUnitFilter"){filter.unit=e.target.value;refresh();}
 if(e.target.id==="doubtTeacherMode"){teacherMode=e.target.checked;refresh();}
 if(e.target.closest("#doubtEntry"))saveDraftFromForm();
});
window.HablaDoubts={
 render:screen,handleAction:action,stats:stats,
 reload:function(){activeId=null;formOpen=false;filter={status:"pending",unit:"all",query:""};}
};
if(typeof GUIDE_PAGES!=="undefined")GUIDE_PAGES.doubts=[
 ["Registre suas dúvidas","Use “Nova dúvida” para escrever a pergunta e relacioná-la com uma unidade. Pode ser em português.",".doubt-toolbar"],
 ["Leve as pendentes para a aula","Filtre por unidade, busque palavras e use o modo aula para ver as perguntas com destaque.",".doubt-filters"],
 ["Anote o que o professor explicou","Abra a dúvida, registre a explicação e marque como respondida. Você pode reabrir depois.",".doubt-list"]
];
})();