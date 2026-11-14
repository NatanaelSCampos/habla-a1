const fs=require('node:fs');
const path=require('node:path');
const esbuild=require('esbuild');
const output=path.join(__dirname,'../assets/vendor/firebase-sdk.js');
const result=esbuild.buildSync({entryPoints:[path.join(__dirname,'firebase-sdk-entry.js')],bundle:true,platform:'browser',format:'iife',globalName:'HablaFirebase',target:['es2020'],minify:true,legalComments:'eof',write:false});
const body=result.outputFiles[0].contents;
if(process.argv.includes('--check')){
  if(!fs.existsSync(output)||!Buffer.from(body).equals(fs.readFileSync(output)))throw Error('Execute npm run build:firebase para atualizar o SDK.');
  console.log('Bundle Firebase reproduzível.');
}else{fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,body);console.log('SDK Firebase local: '+body.length+' bytes.');}
