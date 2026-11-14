/* Habla A1 · MP3 primeiro, voz do aparelho para frases sem gravação. */
(function(){
"use strict";
let index={clips:{}},loaded=false,loading=null,serial=0,current=null;
const clean=s=>String(s??"").normalize("NFC").replace(/\s+/g," ").trim();
const notify=msg=>{if(typeof toast==="function")toast(msg);};
const voiceOrder=["es-MX","es-419","es-US","es-CO","es-PE","es-CL","es","es-ES","es-AR"];
const validPath=p=>typeof p==="string"&&/^clips\/[a-z0-9_-]+\.mp3$/i.test(p);
function voices(){try{return window.speechSynthesis?.getVoices()||[];}catch(_){return [];}}
function localVoice(){
 const spanish=voices().filter(v=>/^es(?:[-_]|$)/i.test(v.lang||""));
 for(const code of voiceOrder){const v=spanish.find(v=>v.lang.replace(/_/g,"-").toLowerCase()===code.toLowerCase());if(v)return v;}
 return spanish[0]||null;
}
function status(state){
 const node=document.getElementById("audioStatus");
 if(node){node.textContent=state==="loading"?"Carregando áudio…":state==="playing"?"Reproduzindo espanhol…":"";node.hidden=!node.textContent;}
}
function releaseMedia(request){
 const audio=request.audio;
 if(!audio)return;
 audio.onplaying=audio.onended=audio.onerror=audio.onwaiting=null;
 try{audio.pause();audio.removeAttribute("src");audio.load();}catch(_){}
 request.audio=null;
}
function stop(){
 serial++;
 if(current){
  clearTimeout(current.timer);
  releaseMedia(current);
  if(current.utterance)current.utterance.onstart=current.utterance.onend=current.utterance.onerror=null;
  current=null;
 }
 try{window.speechSynthesis?.cancel();}catch(_){}
 status("idle");
}
const active=r=>current===r&&r.id===serial;
function finish(r,message){
 if(!active(r))return;
 stop();
 if(message)notify(message);
}
function watch(r,callback){clearTimeout(r.timer);r.timer=setTimeout(()=>{if(active(r))callback();},10000);}
function browserVoice(r){
 if(!active(r))return false;
 if(!window.speechSynthesis||!window.SpeechSynthesisUtterance){
  finish(r,"Não foi possível ouvir esta frase neste aparelho. Você pode continuar a atividade e tentar novamente.");return false;
 }
 try{
  const engine=window.speechSynthesis,voice=localVoice();
  if(!voice&&voices().length){
   finish(r,"Para ouvir frases sem gravação, instale uma voz em espanhol nas configurações do aparelho.");return false;
  }
  const sentence=new SpeechSynthesisUtterance(r.text);
  r.utterance=sentence; // Mantém a referência enquanto o aparelho fala.
  sentence.lang=voice?.lang||"es-MX";
  if(voice)sentence.voice=voice;
  sentence.rate=r.speed;
  sentence.onstart=()=>{if(active(r)){clearTimeout(r.timer);status("playing");}};
  sentence.onend=()=>finish(r);
  sentence.onerror=event=>{
   if(!active(r))return;
   finish(r,event?.error==="not-allowed"?"Toque em Ouvir novamente para permitir o áudio.":"Não foi possível ouvir esta frase. Confira a voz em espanhol do aparelho e tente novamente.");
  };
  watch(r,()=>finish(r,"A voz do aparelho não respondeu. Confira se há uma voz em espanhol instalada e toque em Ouvir novamente."));
  // Sem await ou timeout antes de speak: preserva o toque que autorizou a fala.
  if(engine.paused)engine.resume();
  engine.speak(sentence);
  return true;
 }catch(_){finish(r,"O áudio não pôde ser iniciado. Toque em Ouvir novamente.");return false;}
}
function recordedVoice(r,path){
 try{
  const audio=new Audio("./audio/"+path);
  r.audio=audio;audio.preload="auto";audio.playbackRate=r.speed;audio.preservesPitch=true;
  let failed=false;
  const fail=error=>{
   if(!active(r)||failed)return;
   failed=true;clearTimeout(r.timer);releaseMedia(r);
   if(error?.name==="NotAllowedError"){finish(r,"Toque em Ouvir novamente para permitir o áudio.");return;}
   // Uma gravação indisponível pode usar a voz local, uma única vez.
   browserVoice(r);
  };
  audio.onplaying=()=>{if(active(r)){clearTimeout(r.timer);status("playing");}};
  audio.onwaiting=()=>{if(active(r)){status("loading");watch(r,()=>fail());}};
  audio.onended=()=>finish(r);
  audio.onerror=()=>fail();
  watch(r,()=>fail());
  const promise=audio.play();
  if(promise?.catch)promise.catch(fail);
  return true;
 }catch(_){releaseMedia(r);return browserVoice(r);}
}
function start(r){
 if(!active(r))return false;
 const path=index.clips[r.text];
 return validPath(path)?recordedVoice(r,path):browserVoice(r);
}
function play(text,rate){
 text=clean(text);if(!text)return false;
 stop();
 const r={id:serial,text,speed:Math.max(.65,Math.min(1.25,Number(rate)||.88)),timer:null};
 current=r;status("loading");
 if(loaded)return start(r);
 watch(r,()=>finish(r,"O áudio está demorando para carregar. Confira sua conexão e toque em Ouvir novamente."));
 init().then(()=>start(r));
 return true;
}
function stats(){return {ready:loaded,generated:Object.keys(index.clips).length,spanishVoice:!!localVoice()};}
function init(){
 if(loading)return loading;
 loading=(async()=>{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
  try{
   const res=await fetch("./audio/index.json",{cache:"no-cache",signal:controller.signal});
   if(!res.ok)throw Error("manifest "+res.status);
   const parsed=await res.json();
   if(!parsed?.clips||typeof parsed.clips!=="object"||Array.isArray(parsed.clips))throw Error("manifest inválido");
   index={clips:Object.fromEntries(Object.entries(parsed.clips).filter(([text,path])=>clean(text)&&validPath(path)))};
   loaded=true;
  }catch(_){}finally{clearTimeout(timer);loading=null;}
 })();
 return loading;
}
window.addEventListener("pagehide",stop);
window.addEventListener("online",()=>{if(!loaded)init();});
window.HablaAudio={play,stop,stats,refresh:init};
voices();
init();
})();
