/* Formulário de dúvidas com retorno à atividade anterior. */
(function(){
"use strict";
let open=false, returnFocus=null, origin=null;
const UNITS=["Nos presentamos","Mi casa, mi barrio","Vamos de viaje","En familia","Igual que todos los días","No me gusta, ¡me encanta!","Buenas intenciones","Cuídate mucho","Experiencias vividas","Fin de trayecto"];
const NAMES={home:"Início",lab:"Revisão Inteligente",diagnostic:"Diagnóstico por habilidades",dialogues:"Conversação progressiva",verbs:"Conjugação",workbook:"Caderno A1",practice:"Praticar",scenarios:"Simulação",board:"Durante a aula",library:"Biblioteca",study:"Estrutura",reviews:"Revisões",progress:"Meu progresso",doubts:"Caderno de dúvidas"};
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function pageContext(){
 let p=ui.page,unit=0,desc=NAMES[p]||p,extra="";
 if(p==="workbook"&&ui.wbUnit){unit=Number(ui.wbUnit)||0;extra=ui.wbExercise?"Exercício "+ui.wbExercise:"";}
 else if(p==="verbs"&&ui.verbUnit){unit=Number(ui.verbUnit)||0;extra=(ui.verbChoice!=="all"?"Verbo: "+ui.verbChoice:"");}
 else if(p==="diagnostic"||p==="dialogues"){let a=window.HablaCoach?.getState().units||[];if(a.length===1)unit=a[0];}
 else if(p==="lab"){let a=window.HablaLab?.settings.units||[];if(a.length===1)unit=a[0];}
 else if(p==="scenarios")extra="Cenário: "+ui.scenarioScene;
 return {unit,context:[desc,extra].filter(Boolean).join(" · ")};
}
function markup(){
 let draft=data.doubtQuickDraft||{},ref=origin||pageContext(),unit=Number(draft.unit??ref.unit)||0;
 return '<div class="dq-backdrop" data-act="dq-close" aria-hidden="true"></div>'+
 '<section class="dq-modal" role="dialog" aria-modal="true" aria-labelledby="dq-title" aria-describedby="dq-subtitle">'+
 '<header class="dq-head"><div><div class="eyebrow">SALVE SEM SAIR DA AULA</div><h2 id="dq-title">Anotar uma dúvida</h2></div><button class="dq-close" data-act="dq-close" aria-label="Fechar janela">×</button></header>'+
 '<p id="dq-subtitle" class="muted small">Anote agora e pergunte quando estiver com o professor. Sua atividade ficará como estava.</p>'+
 '<form id="dq-form" class="dq-form"><label for="dq-question">O que você não entendeu? <strong>*</strong></label>'+
 '<textarea name="question" id="dq-question" required maxlength="900" rows="3" placeholder="Ex.: Por que usamos estoy em vez de soy?">'+esc(draft.question||"")+'</textarea>'+
 '<div class="dq-fields"><label>Unidade<select name="unit">'+
 '<option value="0" '+(!unit?"selected":"")+'>Geral / não sei</option>'+
 UNITS.map((n,i)=>'<option value="'+(i+1)+'" '+(unit===i+1?"selected":"")+'>'+(i+1)+' · '+esc(n)+'</option>').join("")+'</select></label>'+
 '<label>Contexto da dúvida<input name="context" maxlength="1200" value="'+esc(draft.context??ref.context)+'" placeholder="Ex.: conjugação de ser"></label></div>'+
 '<label for="dq-es">Como perguntar em espanhol (opcional)</label>'+
 '<textarea name="questionES" id="dq-es" rows="2" maxlength="900" placeholder="Ex.: ¿Por qué usamos estar aquí?">'+esc(draft.questionES||"")+'</textarea>'+
 '<div class="dq-actions"><button type="button" class="btn secondary" data-act="dq-close">Fechar</button>'+
 '<button type="submit" class="btn primary">Salvar para a aula</button></div>'+
 '<p class="muted tiny">Seu rascunho fica salvo se fechar. Depois, complete a explicação em Caderno de Dúvidas.</p>'+
 '</form><button class="dq-go" type="button" data-act="dq-view">Ver todas as minhas dúvidas</button></section>';
}
function root(){return document.getElementById("doubtQuickRoot");}
function show(){
 let node=root();if(!node)return;node.innerHTML=open?markup():"";
 document.body.classList.toggle("dq-open",open);
 const fab=document.getElementById("doubtFab");if(fab)fab.setAttribute("aria-expanded",String(open));
}
function begin(){
 if(open)return;
 origin=pageContext();returnFocus=document.activeElement;open=true;show();
 requestAnimationFrame(()=>document.getElementById("dq-question")?.focus({preventScroll:true}));
}
function finish(){if(!open)return;open=false;show();origin=null;if(returnFocus&&document.contains(returnFocus))returnFocus.focus({preventScroll:true});returnFocus=null;}
window.HablaDoubts.closeQuick=finish;
function autosave(){
 if(!open)return;let form=document.getElementById("dq-form");if(!form)return;
 let f=new FormData(form);
 data.doubtQuickDraft={question:String(f.get("question")||"").slice(0,900),questionES:String(f.get("questionES")||"").slice(0,900),context:String(f.get("context")||"").slice(0,1200),unit:Number(f.get("unit")||0)};
 save();
}
function submit(form){
 let f=new FormData(form),question=String(f.get("question")||"").trim();
 if(!question){toast("Escreva uma dúvida antes de salvar.");return;}
 let n=Number(f.get("unit")||0),t=new Date().toISOString();
 if(!Array.isArray(data.doubts))data.doubts=[];
 data.doubts.push({id:"d-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,10),question:question.slice(0,900),
 questionES:String(f.get("questionES")||"").trim().slice(0,900),context:String(f.get("context")||"").trim().slice(0,1200),
 teacherAnswer:"",unit:n>=1&&n<=10?n:0,status:"pending",createdAt:t,updatedAt:t,resolvedAt:null});
 data.doubtQuickDraft=null;save();finish();
 if(typeof renderChrome==="function")renderChrome();
 if(ui.page==="doubts")render();
 toast("Dúvida salva! Abra o Caderno de Dúvidas para acompanhar.");
}
function action(el){
 switch(el.dataset.act){
 case "dq-open":begin();return true;
 case "dq-close":finish();return true;
 case "dq-view":finish();go("doubts");return true;
 default:return false;
 }
}
const original=window.HablaDoubts?.handleAction;
if(window.HablaDoubts){
 window.HablaDoubts.handleAction=function(el){return action(el)||(original?original(el):false);};
 window.HablaDoubts.openQuick=begin;
}
document.addEventListener("submit",e=>{if(e.target.id!=="dq-form")return;e.preventDefault();submit(e.target);});
document.addEventListener("input",e=>{if(e.target.closest("#dq-form"))autosave();});
document.addEventListener("change",e=>{if(e.target.closest("#dq-form"))autosave();});
document.addEventListener("keydown",e=>{
 if(!open)return;
 if(e.key==="Escape"){e.preventDefault();finish();return;}
 if(e.key!=="Tab")return;
 let focusable=[...document.querySelectorAll("#doubtQuickRoot button,#doubtQuickRoot textarea,#doubtQuickRoot input,#doubtQuickRoot select")].filter(x=>!x.disabled);
 if(!focusable.length)return;let first=focusable[0],last=focusable.at(-1);
 if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
 else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
});
})();
