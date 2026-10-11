import fs from 'node:fs';
const dir=new URL('./',import.meta.url);
for(const file of ['screen-helpers.js','home.js','ai.js']){
 const p=new URL(file,dir);let s=fs.readFileSync(p,'utf8');
 s=s.replace(/(\w+)\.primaryAxisSizingMode='FIXED';/g,"$1.primaryAxisSizingMode='FIXED';$1.counterAxisSizingMode='FIXED';");
 fs.writeFileSync(p,s);
}
