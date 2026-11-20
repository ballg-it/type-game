const http=require('http'),fs=require('fs'),path=require('path');let n=0;const dir=process.argv[2];
http.createServer((q,r)=>{const h={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Private-Network':'true','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'POST,OPTIONS'};
if(q.method==='OPTIONS'){r.writeHead(204,h);return r.end();}
const b=[];q.on('data',c=>b.push(c));q.on('end',()=>{const name=(new URL(q.url,'http://x').searchParams.get('n')||('img'+(++n)))+'.jpg';fs.writeFileSync(path.join(dir,name),Buffer.concat(b));console.log('saved',name,Buffer.concat(b).length);r.writeHead(200,h);r.end('ok');});}).listen(8765,'127.0.0.1',()=>console.log('listening'));
