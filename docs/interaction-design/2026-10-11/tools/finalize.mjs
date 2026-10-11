import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
const dir=fileURLToPath(new URL('../',import.meta.url));
const read=name=>JSON.parse(fs.readFileSync(dir+name,'utf8'));
const write=(name,data)=>fs.writeFileSync(dir+name,JSON.stringify(data,null,2)+'\n');
const validation=read('validation.json'),foundation=read('foundations-state.json'),library=read('library-validation.json'),screens=read('screen-state-final.json');
if(validation.screenCount!==89||validation.issues.length||validation.smallTargets.length)throw Error('Figma validation has unresolved issues');
write('figma-state.json',{
 runId:'portal-interaction-v1-2026-10-11',scope:'formal-interaction-design',fileKey:'ccBI9Wxbj1gTnZI9D6yplY',fileUrl:'https://www.figma.com/design/ccBI9Wxbj1gTnZI9D6yplY',step:'complete',
 entities:{pages:foundation.pages,screenCount:screens.totalScreens,componentSets:library.componentSetCount,components:library.componentCount,variables:library.variables,textStyles:library.textStyleCount},
 completedSteps:['create-file','discover-fonts','build-foundations','build-native-library','generate-discrete-artwork','upload-artwork','build-screens','connect-prototype','create-handoff','native-structure-validation','visual-screenshot-review'],
 pendingValidations:[],prototypeEntries:14,prototypeEdges:validation.prototypeEdgeCount,productionAppUpdated:false,
 artifacts:{screens:'screen-state-final.json',validation:'validation.json',components:'library-validation.json',overview:'overview.png',details:'interaction-details.png'}
});
const state=read('library-state.json');state.componentSets=library.componentSetCount;write('library-state.json',state);
const previews=['overview.png','interaction-details.png','home-preview.png','train-preview.png','body-preview.png','ai-preview.png'];
const crypto=await import('node:crypto');write('preview-manifest.json',previews.map(name=>{const b=fs.readFileSync(dir+name);return {name,source:'Figma get_screenshot',bytes:b.length,width:b.readUInt32BE(16),height:b.readUInt32BE(20),sha256:crypto.createHash('sha256').update(b).digest('hex')};}));
console.log('Final state and six screenshot records saved');
