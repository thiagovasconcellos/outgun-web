import { parseMapFile } from '../../../../packages/content/dist/map/parser.js';
import fs from 'node:fs';
const dir=new URL('../../../../apps/web/public/assets/maps/', import.meta.url).pathname;
const r2=(n)=>Math.round(n*100)/100;
const sh=(w)=>w.kind==='rect'?['r',w.texture,r2(w.a),r2(w.b),r2(w.c),r2(w.d)]:w.kind==='tri'?['t',w.texture,r2(w.p1.x),r2(w.p1.y),r2(w.p2.x),r2(w.p2.y),r2(w.p3.x),r2(w.p3.y)]:['c',w.texture,r2(w.center.x),r2(w.center.y),r2(w.ro),r2(w.ri),w.angles[0],w.angles[1]];
const out={};
for (const f of fs.readdirSync(dir)) {
  const key=f.replace(/\.[0-9a-f]{10}\.txt$/,'');
  if(!['lola','larhi','6_askelta','coliseu','sisso','mooca'].includes(key)) continue;
  const m=parseMapFile(f,fs.readFileSync(dir+f)).map;
  const pt=(p)=>[p.room.x,p.room.y,r2(p.x),r2(p.y)];
  out[key]={title:m.title,author:m.author,w:m.width,h:m.height,
    rooms:m.rooms.map(col=>col.map(room=>({w:room.walls.map(sh),g:room.ground.map(sh)}))),
    flags:[m.teams[0].flags.map(pt),m.teams[1].flags.map(pt),m.wildFlags.map(pt)],
    spawn:[m.teams[0].spawn.map(pt),m.teams[1].spawn.map(pt)]};
}
fs.writeFileSync(process.argv[2],JSON.stringify(out));
console.log(Object.keys(out), fs.statSync(process.argv[2]).size);
