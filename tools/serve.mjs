// Local static preview only. GitHub Pages serves the published website.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png','.mp4':'video/mp4','.mp3':'audio/mpeg','.wav':'audio/wav','.woff2':'font/woff2','.md':'text/plain; charset=utf-8'};
const allowedRoots = new Set(['assets', 'docs']);
const allowedFiles = new Set(['index.html','tokens.css','styles.css','script.js','site-content.js','.nojekyll']);
const server = http.createServer((req, res) => {
  try {
    const requestPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const rel = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
    const target = path.resolve(root, rel);
    const within = path.relative(root, target);
    if (within.startsWith('..') || path.isAbsolute(within) || (!allowedFiles.has(rel) && !allowedRoots.has(rel.split('/')[0]))) { res.writeHead(403); res.end('Forbidden'); return; }
    if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
    const stat = fs.statSync(target);
    if (!stat.isFile()) throw new Error('not a file');
    const headers = {'Content-Type':types[path.extname(target)] || 'application/octet-stream', 'Accept-Ranges':'bytes', 'Cache-Control':'no-cache'};
    let start=0,end=stat.size-1,status=200;
    const range=req.headers.range;
    if (range) {
      const match=/^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match || (!match[1] && !match[2])) { res.writeHead(416, {'Content-Range':`bytes */${stat.size}`});res.end();return; }
      if (!match[1]) start=Math.max(0, stat.size-Number(match[2]));
      else { start=Number(match[1]); if(match[2]) end=Math.min(end,Number(match[2])); }
      if(start>end || start>=stat.size) {res.writeHead(416,{'Content-Range':`bytes */${stat.size}`});res.end();return;}
      status=206;headers['Content-Range']=`bytes ${start}-${end}/${stat.size}`;
    }
    headers['Content-Length']=Math.max(0,end-start+1);
    res.writeHead(status,headers);
    if(req.method==='HEAD' || stat.size===0) res.end(); else fs.createReadStream(target,{start,end}).on('error',()=>res.destroy()).pipe(res);
  } catch { res.writeHead(404);res.end('Not found'); }
});
server.listen(4173,'127.0.0.1',()=>console.log('RoboSteer preview: http://127.0.0.1:4173/'));
