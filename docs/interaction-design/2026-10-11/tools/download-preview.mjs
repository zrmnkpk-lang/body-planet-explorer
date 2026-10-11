import fs from 'node:fs';
import path from 'node:path';
const [name,url]=process.argv.slice(2);
if(!/^[a-z-]+\.png$/.test(name)||!url?.startsWith('https://www.figma.com/api/mcp/asset/'))throw Error('Expected a Figma screenshot URL and local PNG name');
let bytes;
for(let attempt=0;attempt<3;attempt++){
 try{const r=await fetch(url);if(!r.ok)throw Error('HTTP '+r.status);bytes=Buffer.from(await r.arrayBuffer());if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Expected PNG');break;}
 catch(error){if(attempt===2)throw error;await new Promise(resolve=>setTimeout(resolve,500*(attempt+1)));}
}
const target=new URL('../'+name,import.meta.url);fs.writeFileSync(target,bytes);
console.log(path.basename(target.pathname)+' saved');
