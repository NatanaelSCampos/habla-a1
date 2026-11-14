const {test}=require('node:test');
const assert=require('node:assert/strict');
const codec=require('../sync-data.js');
const {create}=require('../profile-store.js');
function memory(){const rows=new Map();return {getItem:key=>rows.get(key)??null,setItem:(key,value)=>rows.set(key,value),removeItem:key=>rows.delete(key),rows};}
function snapshot(){return {[codec.MAIN]:{progress:{a:{reps:1}},favorites:{a:true},activity:{'2026-11-14':{attempts:3,good:2}},custom:[{id:'mine',es:'Hola'}],doubts:[{id:'d1',question:'¿Por qué?'}],doubtQuickDraft:{question:'Rascunho'},voiceSpeed:.88},[codec.BOOK]:{answers:{'u1-1':['uno']},notes:{'u1-1':'Nota'},results:{'u1-1':{score:1,total:1}},review:{'u1-1':true},last:'u1-1'},[codec.LAB]:{units:[2,5,7],results:{x:{reps:2}},sessions:[{date:'2026-11-14',done:3}],notifications:{enabled:true}},[codec.COACH]:{results:[{id:'r1',date:'2026-11-14'}],conversationHistory:[{id:'c1',date:'2026-11-14'}]}};}
test('codec preserva todos os bancos acadêmicos e mantém rascunhos e avisos no aparelho',()=>{
 const original=snapshot(),profile=codec.seed('alice',original,'phone');
 const restored=codec.inflate(profile.records,original);
 for(const key of codec.KEYS.filter(key=>original[key]))for(const [field,value]of Object.entries(original[key]))assert.deepEqual(restored[key][field],value);
 const other=codec.inflate(profile.records);
 assert.equal(other[codec.MAIN].doubtQuickDraft,undefined);assert.equal(other[codec.LAB].notifications,undefined);
});
test('dois aparelhos offline somam apenas suas novas atividades, sem duplicar importação',()=>{
 const original=codec.seed('alice',snapshot(),'phone');original.dirty={};
 let phone=codec.clone(original),pc=codec.clone(original);
 phone.values[codec.MAIN].activity['2026-11-14'].attempts+=2;
 // evolve recebe o estado anterior e um novo snapshot, sem mutar o anterior.
 phone=codec.evolve(original,phone.values,'phone');
 pc.values[codec.MAIN].activity['2026-11-14'].attempts+=4;pc=codec.evolve(original,pc.values,'pc');
 const merged=codec.merge(phone,pc.records);
 assert.equal(merged.values[codec.MAIN].activity['2026-11-14'].attempts,9);
 merged.dirty={};assert.equal(codec.merge(merged,merged.records).values[codec.MAIN].activity['2026-11-14'].attempts,9);
});
test('alterações em exercícios diferentes se combinam; edição pendente do mesmo registro fica local até confirmação',()=>{
 const old=codec.seed('alice',snapshot(),'a');old.dirty={};
 const left=codec.clone(old.values);left[codec.BOOK].notes['u1-1']='Escrito offline';
 const local=codec.evolve(old,left,'a');const right=codec.clone(old.values);right[codec.BOOK].notes['u2-1']='Outro exercício';
 const remote=codec.evolve(old,right,'b');const merged=codec.merge(local,remote.records);
 assert.deepEqual(merged.values[codec.BOOK].notes,{'u1-1':'Escrito offline','u2-1':'Outro exercício'});
});
test('exclusões ficam marcadas e chegam aos aparelhos que estavam offline',()=>{
 const old=codec.seed('alice',snapshot(),'a');old.dirty={};const values=codec.clone(old.values);values[codec.MAIN].doubts=[];
 const next=codec.evolve(old,values,'a');assert.equal(next.records[codec.id('doubts','d1')].deleted,true);
 assert.deepEqual(codec.merge(old,next.records).values[codec.MAIN].doubts,[]);
});
test('reset e importação substituem contadores sem somar o histórico anterior',()=>{
 const old=codec.seed('alice',snapshot(),'a');old.dirty={};const values=codec.clone(old.values);values[codec.MAIN].activity={};
 const next=codec.evolve(old,values,'a');assert.deepEqual(codec.inflate(next.records)[codec.MAIN].activity,{});
});
test('perfis de usuários são separados das chaves antigas e uns dos outros',()=>{
 const native=memory(),store=create(native,()=>{},()=> 'device');native.setItem(codec.MAIN,JSON.stringify(snapshot()[codec.MAIN]));
 const legacy=native.getItem(codec.MAIN);store.initialize('alice',store.guest());store.activate('alice');store.setItem(codec.MAIN,JSON.stringify({progress:{x:{reps:8}}}));
 store.initialize('bob',{});store.activate('bob');assert.equal(store.getItem(codec.MAIN),null);
 store.activate('alice');assert.equal(JSON.parse(store.getItem(codec.MAIN)).progress.x.reps,8);
 store.activate(null);assert.equal(store.getItem(codec.MAIN),legacy);assert.equal(native.getItem(codec.MAIN),legacy);
});
test('confirmar escrita antiga não apaga uma alteração mais recente que ainda não foi enviada',()=>{
 const native=memory(),store=create(native,()=>{},()=> 'device');store.initialize('alice',snapshot());store.activate('alice');
 const before=store.load(),entry={id:codec.id('book.notes','u1-1'),revision:before.dirty[codec.id('book.notes','u1-1')]};
 const book=JSON.parse(store.getItem(codec.BOOK));book.notes['u1-1']='Nova nota';store.setItem(codec.BOOK,JSON.stringify(book));store.acknowledge('alice',[entry]);
 assert.ok(store.load().dirty[entry.id]>entry.revision);
});
test('falha de espaço não substitui o perfil e não confirma dados como sincronizados',()=>{
 const native=memory(),store=create(native,()=>{},()=> 'device');store.initialize('alice',snapshot());store.activate('alice');const before=native.getItem(store.profileKey('alice'));
 native.setItem=()=>{throw Error('quota');};assert.throws(()=>store.setItem(codec.MAIN,'{"progress":{}}'),/quota/);assert.equal(native.getItem(store.profileKey('alice')),before);
});
test('registros malformados, preferências desconhecidas e poluição de protótipo são rejeitados antes de gravar',()=>{
 for(const [kind,key,payload]of [['preferences','doubts','[]'],['book.notes','__proto__','"bad"'],['doubts','x','{"__proto__":{"polluted":true}}'],['activity','2026-11-14@a','{"attempts":-1}']]){
  assert.equal(codec.valid({kind,key,payload,deleted:false},codec.id(kind,key)),false);
 }
 const native=memory(),store=create(native,()=>{},()=> 'device');store.initialize('alice',snapshot());const before=store.load();
 assert.throws(()=>store.apply('alice',{'bad':{}}),/inválido/);assert.deepEqual(store.load(),before);assert.equal({}.polluted,undefined);
});
test('backup antigo e snapshot de recuperação continuam independentes da nuvem',()=>{
 const native=memory(),store=create(native,()=>{},()=> 'device');native.setItem(codec.MAIN,JSON.stringify(snapshot()[codec.MAIN]));store.archive('backup');store.replace({[codec.MAIN]:{progress:{}}});
 assert.equal(JSON.parse(native.getItem('habla.recovery.v1'))[0].values[codec.MAIN].progress.a.reps,1);
});
