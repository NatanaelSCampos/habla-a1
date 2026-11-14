/* Lê somente os campos públicos autorizados; nunca copia o .env para o site. */
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=fs.existsSync(path.join(root,'.env'))?process.loadEnvFile(path.join(root,'.env')):null;
const fields={apiKey:'FIREBASE_API_KEY',authDomain:'FIREBASE_AUTH_DOMAIN',projectId:'FIREBASE_PROJECT_ID',appId:'FIREBASE_APP_ID',messagingSenderId:'FIREBASE_MESSAGING_SENDER_ID'};
const config={};
for(const [field,name]of Object.entries(fields))if(process.env[name])config[field]=process.env[name].trim();
for(const field of ['apiKey','authDomain','projectId','appId'])if(!config[field])throw Error('Falta '+fields[field]+'. Nenhum arquivo foi alterado.');
if(!/^[a-z0-9-]+$/.test(config.projectId)||!/^[-a-z0-9.]+$/.test(config.authDomain))throw Error('Confira o projeto e o domínio Firebase. Nenhum arquivo foi alterado.');
fs.writeFileSync(path.join(root,'firebase-config.js'),'/* Configuração pública do Firebase. A proteção está em firestore.rules. */\nwindow.HABLA_FIREBASE_CONFIG = '+JSON.stringify(config,null,2)+';\n');
console.log('Configuração pública gerada. Nenhuma chave Azure ou credencial privada foi incluída.');
