import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const dir=fileURLToPath(new URL('../',import.meta.url)),toolDir=fileURLToPath(new URL('./',import.meta.url));
const read=name=>JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));
const errors=[],AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
let scripts=0,jsons=0;
for(const name of fs.readdirSync(toolDir)){
 const full=path.join(toolDir,name),s=fs.readFileSync(full,'utf8');
 if(name.endsWith('.js')){try{new AsyncFunction('figma','CTX','LIB','SCREEN','ART','ICONS','SPECS',s);scripts++;}catch(e){errors.push(name+': '+e.message);}}
 if(name.endsWith('.mjs')){const r=spawnSync(process.execPath,['--check',full],{encoding:'utf8',windowsHide:true});if(r.status!==0)errors.push(name+': '+r.stderr);else scripts++;}
 if(name.endsWith('.json')){JSON.parse(s);jsons++;}
}
for(const name of fs.readdirSync(dir).filter(n=>n.endsWith('.json'))){read(name);jsons++;}
const v=read('validation.json'),state=read('figma-state.json'),screens=read('screen-state-final.json'),library=read('library-validation.json');
if(v.screenCount!==89||screens.totalScreens!==89||Object.keys(screens.screens).length!==89)errors.push('Screen inventory mismatch');
if(v.issues.length||v.smallTargets.length||Object.values(v.pathChecks).some(p=>!p.pass))errors.push('Figma validation has unresolved issues');
if(state.step!=='complete'||state.pendingValidations.length)errors.push('Run checkpoint is incomplete');
if(library.componentSetCount!==4||library.componentCount!==61||library.variantCount!==23)errors.push('Component inventory mismatch');
for(const a of read('preview-manifest.json')){const bytes=fs.readFileSync(path.join(dir,a.name));if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||crypto.createHash('sha256').update(bytes).digest('hex')!==a.sha256)errors.push('PNG mismatch: '+a.name);}
for(const a of read('assets.json').assets){const bytes=fs.readFileSync(path.join(dir,a.file));if(crypto.createHash('sha256').update(bytes).digest('hex')!==a.sha256||bytes.length!==a.bytes||bytes.readUInt32BE(16)!==a.width||bytes.readUInt32BE(20)!==a.height||bytes[25]!==6)errors.push('Artwork mismatch: '+a.name);}
const md=fs.readFileSync(path.join(dir,'README.md'),'utf8');for(const match of md.matchAll(/\]\(([^)]+)\)/g)){const link=match[1];if(/^https?:/.test(link))continue;const target=path.resolve(dir,link.split('#')[0]);if(!fs.existsSync(target))errors.push('Missing document target: '+link);}
const result={pass:errors.length===0,scope:'design artifacts only',scriptsChecked:scripts,jsonFilesChecked:jsons,screenCount:89,prototypeEntries:v.flowStartingPoints.length,prototypeEdges:v.prototypeEdgeCount,pathChecks:Object.keys(v.pathChecks).length,previewFiles:6,componentSets:4,mainComponents:61,errors};
fs.writeFileSync(path.join(dir,'delivery-check.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));if(errors.length)process.exit(1);
