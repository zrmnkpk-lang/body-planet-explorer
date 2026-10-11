const p=figma.currentPage,SC={};for(const n of p.children)if(n.type==='FRAME'&&/^(H|A|T|B|AI)\d+ · /.test(n.name))SC[n.name.split(' · ')[0]]=n;
await Promise.all(['Regular','Medium','Semi Bold','Bold'].map(style=>figma.loadFontAsync({family:'Inter',style})));
const createdNodeIds=[],mutatedNodeIds=[],links=[];
const action=await figma.variables.getVariableByIdAsync('VariableID:2:18'),raised=await figma.variables.getVariableByIdAsync('VariableID:2:12');
const paint=v=>figma.variables.setBoundVariableForPaint({type:'SOLID',color:{r:0,g:0,b:0}},'color',v);
async function go(n,id){await n.setReactionsAsync([{trigger:{type:'ON_CLICK'},actions:[{type:'NODE',destinationId:SC[id].id,navigation:'NAVIGATE',transition:{type:'DISSOLVE',easing:{type:'EASE_OUT'},duration:0.18},resetScrollPosition:false}]}]);mutatedNodeIds.push(n.id);links.push({nodeId:n.id,to:id});}
for(const id of ['H01','H04','H05','H09']){
 const b=SC[id].findAll(n=>n.type==='FRAME'&&n.name==='Body')[0];b.itemSpacing=8;b.paddingTop=8;b.paddingBottom=12;mutatedNodeIds.push(b.id);
 const pc=b.children.find(n=>n.name==='Body Planet / summary'),pt=pc.findAll(n=>n.type==='FRAME'&&n.name==='Content')[0],rects=pt.children.filter(n=>n.type==='RECTANGLE');
 if(rects.length===2){const idx=pt.children.indexOf(rects[0]),rail=figma.createFrame();pt.insertChild(idx,rail);rail.name='XP progress';rail.resize(168,5);rail.fills=[paint(raised)];rail.cornerRadius=3;const bar=figma.createRectangle();rail.appendChild(bar);bar.resize(67,5);bar.cornerRadius=3;bar.fills=[paint(action)];for(const n of rects)n.remove();createdNodeIds.push(rail.id,bar.id);}
}
for(const id of Object.keys(SC).filter(id=>id.startsWith('AI'))){const footer=SC[id].children.find(n=>n.name==='Footer'),comp=footer.children.find(n=>n.name==='Message composer');if(comp){footer.insertChild(0,comp);mutatedNodeIds.push(footer.id);}}
for(const id of ['B01','B02','B03','B04','B05','B06','B10','B11','B13']){
 const f=SC[id],b=f.findAll(n=>n.type==='FRAME'&&n.name==='Body')[0],footer=f.children.find(n=>n.name==='Footer');b.itemSpacing=8;b.paddingTop=8;b.paddingBottom=8;
 const update=b.children.find(n=>n.name==='Button/Update body data'||n.name==='Button/Add body data');if(update)footer.insertChild(0,update);
 for(const globe of b.findAll(n=>n.name==='Artwork/riverlands-planet'))if(id!=='B06')globe.resize(240,240);
 for(const a of b.findAll(n=>n.name==='Artwork/maya-body-analysis'))a.resize(90,128);
 for(const m of b.findAll(n=>n.type==='INSTANCE'&&n.name.startsWith('State=')))if(m.height===72)m.resize(m.width,64);
 mutatedNodeIds.push(f.id);
}
for(const t of SC.H08.findAll(n=>n.type==='TEXT'))if(t.characters==='25 min')t.characters='15 min';
for(const t of SC.H04.findAll(n=>n.type==='TEXT'))if(t.characters==='Training updated to 25 min')t.characters='Training updated to 15 min';
for(const id of ['H03','H08'])for(const n of SC[id].findAll(n=>n.type==='FRAME'&&(/^(Increase|Decrease) /.test(n.name)))){if(n.name==='Decrease Training duration'&&id==='H03')await go(n,'H08');else if(n.name==='Increase Training duration'&&id==='H08')await go(n,'H03');else await n.setReactionsAsync([]);}
const h10=SC.H02.clone();p.appendChild(h10);h10.name='H10 · Today’s plan / 15 min saved';h10.x=3440;h10.y=1740;SC.H10=h10;createdNodeIds.push(h10.id,...h10.findAll(()=>true).map(n=>n.id));
for(const t of h10.findAll(n=>n.type==='TEXT')){if(t.characters==='20 min · Planned')t.characters='15 min · Planned';if(t.characters==='14 min')t.characters='9 min';}
for(const n of h10.findAll(n=>n.name==='Button/Edit today’s goals'))await go(n,'H08');
for(const n of h10.findAll(n=>n.name==='Button/View workout'))await go(n,'T17');
for(const n of h10.findAll(n=>n.name==='Close'))await go(n,'H04');
for(const id of ['H04','H09'])for(const n of SC[id].findAll(n=>n.name==='Button/View plan'))await go(n,'H10');
for(const id of ['H04','H09','AI07'])for(const n of SC[id].findAll(n=>n.name==='Tab/Train'))await go(n,'T17');
const back=SC.T17.findAll(n=>n.name==='Back')[0];await back.setReactionsAsync([{trigger:{type:'ON_CLICK'},actions:[{type:'BACK'}]}]);mutatedNodeIds.push(back.id);
p.flowStartingPoints=[['H01','01 · Home & account'],['T01','02 · Free workout'],['T02','03 · Planned workout'],['B01','04 · Body Planet'],['AI01','05 · AI Coach'],['T14','06 · Workout save error'],['B08','07 · Body validation'],['B09','08 · Body save error'],['B11','09 · No body data'],['B12','10 · Planet loading'],['B13','11 · Planet failure'],['AI08','12 · AI send error'],['AI09','13 · AI unavailable'],['AI12','14 · Plan version conflict']].map(([id,name])=>({nodeId:SC[id].id,name}));
await SC.AI04.setReactionsAsync([{trigger:{type:'AFTER_TIMEOUT',timeout:5},actions:[{type:'NODE',destinationId:SC.AI05.id,navigation:'NAVIGATE',transition:{type:'DISSOLVE',easing:{type:'EASE_OUT'},duration:0.18},resetScrollPosition:false}]}]);mutatedNodeIds.push(SC.AI04.id);
return {createdNodeIds,mutatedNodeIds,links,flowStartingPoints:p.flowStartingPoints,newScreen:{id:'H10',frameId:h10.id,name:h10.name,x:h10.x,y:h10.y,width:390,height:844}};
