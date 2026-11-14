/* Habla A1 · Player de voz consistente.
   Usa MP3s neuralmente pré-gerados quando disponíveis e voz do aparelho como fallback. */
(function(){
"use strict";
let index={clips:{}},loaded=false,player=null,utterance=null,serial=0;
const clean=s=>String(s??"").normalize("NFC").replace(/\s+/g," ").trim();
const toastOnce=(msg)=>{if(typeof toast==="function")toast(msg);};
const voiceOrder=["es-MX","es-US","es-CO","es-PE","es-CL","es-AR","es-419","es-ES","es"];
function localVoice(synth){
 let list=[];try{list=synth.getVoices()||[];}catch(_){}
 const spanish=list.filter(v=>String(v.lang||"").toLowerCase().startsWith("es"));
 for(const code of voiceOrder){
  const match=spanish.find(v=>v.lang?.toLowerCase()===code.toLowerCase());if(match)return match;
 }
 return spanish[0]||null;
}
function browserVoice(text,rate){
 if(!("speechSynthesis" in window)||!("SpeechSynthesisUtterance" in window)){
  toastOnce("Não foi possível reproduzir esta frase. Experimente novamente em outro navegador.");
  return false;
 }
 try{
  const engine=window.speechSynthesis;
  engine.cancel();
  const sentence=new SpeechSynthesisUtterance(text),voice=localVoice(engine);
  sentence.lang=voice?.lang||"es-MX";
  if(voice)sentence.voice=voice;
  sentence.rate=rate;
  sentence.onstart=()=>{};
  sentence.onerror=(event)=>{
   if(event?.error==="interrupted"||event?.error==="canceled")return;
   toastOnce("Não foi possível ouvir esta frase neste aparelho. Tente reproduzir novamente.");
  };
  utterance=sentence;
  if(engine.paused)engine.resume();
  engine.speak(sentence);
  return true;
 }catch(e){
  toastOnce("O áudio não pôde ser iniciado. Tente novamente.");
  return false;
 }
}
function stop(){
 serial++;
 if(player){player.pause();player.removeAttribute("src");try{player.load();}catch(_){}player=null;}
 try{window.speechSynthesis?.cancel();}catch(_){}
}
function play(text,rate){
 text=clean(text);
 if(!text)return false;
 const speed=Math.max(.65,Math.min(1.25,Number(rate)||.88));
 stop();const myTurn=serial;
 const relative=index.clips?.[text];
 if(loaded&&relative&&/^[a-z0-9_./-]+\.mp3$/i.test(relative)&&!relative.includes("..")){
  let audio=new Audio("./audio/"+relative);
  player=audio;audio.preload="auto";audio.playbackRate=speed;
  audio.onerror=()=>{if(myTurn!==serial)return;player=null;browserVoice(text,speed);};
  try{
   const p=audio.play();
   if(p&&typeof p.catch==="function")p.catch(()=>{if(myTurn!==serial)return;player=null;browserVoice(text,speed);});
   return true;
  }catch(e){player=null;}
 }
 return browserVoice(text,speed);
}
function stats(){return {ready:loaded,generated:Object.keys(index.clips||{}).length,spanishVoice:(typeof window.speechSynthesis==="undefined"?false:!!localVoice(window.speechSynthesis))};}
async function init(){
 try{
  const res=await fetch("./audio/index.json",{cache:"no-cache"});
  if(!res.ok)throw new Error("manifest "+res.status);
  const parsed=await res.json();
  if(parsed&&parsed.clips&&typeof parsed.clips==="object")index={clips:parsed.clips,voice:parsed.voice};
 }catch(_){}
 loaded=true;
}
if("speechSynthesis" in window){
 try{window.speechSynthesis.getVoices();}catch(_){}
 try{window.speechSynthesis.addEventListener?.("voiceschanged",()=>{});}catch(_){}
}
window.HablaAudio={play,stop,stats,refresh:init};
init();
})();