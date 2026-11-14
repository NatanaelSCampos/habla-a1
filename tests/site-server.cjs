const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.woff2':'font/woff2','.png':'image/png','.mp3':'audio/mpeg'};
module.exports=function(config){return http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');if(!url.pathname.startsWith('/habla-a1/'))return res.writeHead(404).end();
 const relative=decodeURIComponent(url.pathname.slice(10))||'index.html',file=path.resolve(root,relative);
 if(!file.startsWith(root+path.sep)||!types[path.extname(file)]||!fs.existsSync(file))return res.writeHead(404).end();
 const body=relative==='firebase-config.js'?Buffer.from('window.HABLA_FIREBASE_CONFIG='+JSON.stringify(config)+';'):fs.readFileSync(file);
 const headers={'Content-Type':types[path.extname(file)],'Cache-Control':'no-cache','Accept-Ranges':'bytes'};
 const range=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||'');
 if(range){const start=Number(range[1]),end=Math.min(range[2]?Number(range[2]):body.length-1,body.length-1);res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${body.length}`,'Content-Length':end-start+1}).end(body.subarray(start,end+1));}
 else res.writeHead(200,{...headers,'Content-Length':body.length}).end(body);
});};
