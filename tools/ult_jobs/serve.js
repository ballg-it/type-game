const http=require('http'),fs=require('fs'),path=require('path');
const out=process.argv[2], art=process.argv[3];
const h={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Private-Network':'true','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS'};
http.createServer((q,r)=>{
 if(q.method==='OPTIONS'){r.writeHead(204,h);return r.end();}
 const u=new URL(q.url,'http://x');
 if(q.method==='GET'){const bn=path.basename(u.pathname); const f=bn==='jobs.json'?path.join(out,bn):path.join(art,bn);
   if(!fs.existsSync(f)){r.writeHead(404,h);return r.end();}
   r.writeHead(200,{...h,'Content-Type':'image/jpeg'});return r.end(fs.readFileSync(f));}
 const b=[];q.on('data',c=>b.push(c));q.on('end',()=>{const n=(u.searchParams.get('n')||'img')+'.jpg';fs.writeFileSync(path.join(out,n),Buffer.concat(b));console.log('saved',n);r.writeHead(200,h);r.end('ok');});
}).listen(8765,'127.0.0.1',()=>console.log('listening'));
