const p=figma.currentPage,frames=p.children.filter(n=>n.type==='FRAME'&&/^(H|A|T|B|AI)\d+ · /.test(n.name));
const ids=new Set(frames.map(n=>n.id)),screens={},issues=[],typeCounts={},artwork=[],links=[],textFamilies={},smallTargets=[];
for(const f of frames){
 const id=f.name.split(' · ')[0],desc=f.findAll(()=>true),counts={};
 if(f.placeholder||!f.children.length)issues.push({id,problem:'empty or placeholder'});
 if(f.width!==390||f.height!==844)issues.push({id,problem:'wrong viewport size'});
 for(const n of [f,...desc]){
  counts[n.type]=(counts[n.type]||0)+1;typeCounts[n.type]=(typeCounts[n.type]||0)+1;
  if(n.type==='TEXT'){const family=typeof n.fontName==='object'?n.fontName.family:'MIXED';textFamilies[family]=(textFamilies[family]||0)+1;if(family!=='Inter')issues.push({id,nodeId:n.id,problem:'unexpected font'});}
  if('fills'in n&&Array.isArray(n.fills))for(const fill of n.fills)if(fill.type==='IMAGE'){artwork.push({screen:id,nodeId:n.id,name:n.name,w:n.width,h:n.height,imageHash:fill.imageHash});if(!n.name.startsWith('Artwork/'))issues.push({id,nodeId:n.id,problem:'unlabelled raster'});if(n.width>=390&&n.height>=700)issues.push({id,nodeId:n.id,problem:'full UI screenshot raster'});}
  if('reactions'in n)for(const reaction of n.reactions){for(const a of reaction.actions||[reaction.action].filter(Boolean)){if(a.type==='NODE'){links.push({screen:id,nodeId:n.id,to:a.destinationId,trigger:reaction.trigger.type,navigation:a.navigation});if(!ids.has(a.destinationId))issues.push({id,nodeId:n.id,problem:'invalid destination',to:a.destinationId});if(a.destinationId===f.id)issues.push({id,nodeId:n.id,problem:'self navigation'});}if(reaction.trigger.type==='ON_CLICK'&&(n.width<44||n.height<44))smallTargets.push({screen:id,nodeId:n.id,name:n.name,w:n.width,h:n.height});}}
 }
 const viewport=f.children.find(n=>n.name==='Scrollable content'),body=viewport?.children.find(n=>n.name==='Body'),footer=f.children.find(n=>n.name==='Footer');
 const nav=f.findAll(n=>n.type==='INSTANCE'&&n.name.startsWith('Selected='))[0];if(nav&&nav.children.map(n=>n.name).join('|')!=='Tab/Home|Tab/Train|Tab/Body Planet|Tab/AI Coach')issues.push({id,problem:'navigation differs from four-tab IA'});
 screens[id]={frameId:f.id,name:f.name,x:f.x,y:f.y,width:f.width,height:f.height,counts,bodyHeight:body?.height,viewportHeight:viewport?.height,scrolls:!!body&&body.height>viewport.height,footerOrder:footer?.children.map(n=>n.name)};
}
const expected=['maya-sport','maya-body-analysis','alex-account','riverlands-planet'];const rasterNames=[...new Set(artwork.map(x=>x.name.replace('Artwork/','')))];if(rasterNames.some(x=>!expected.includes(x)))issues.push({problem:'unapproved artwork name'});
const inventory=Object.entries(screens).map(([id,s])=>({id,node:s.frameId,body:s.bodyHeight,viewport:s.viewportHeight,scroll:s.scrolls}));
const graph={};for(const l of links){graph[l.screen]??=[];if(!graph[l.screen].includes(l.to))graph[l.screen].push(l.to);}
const mainScreenEvidence=Object.fromEntries(['H01','B01','AI01','A01','T03','AI06'].map(id=>[id,screens[id]]));
for(const id of ['H01','B01'])if(screens[id].bodyHeight>screens[id].viewportHeight)issues.push({id,problem:'main screen content exceeds first viewport'});
const paths={homeEdit:['H01','H02','H03','H08','H04','H10','T17'],freeWorkout:['T01','T04','T05','T06','T07','T19','T29','T31'],plannedWorkout:['T02','T03','T08','T09','T28','T12'],freeAddExercise:['T07','T22','T23','T33','T35','T37','T38'],freeAddPause:['T33','T34','T33'],freePartial:['T33','T36','T39'],bodySave:['B01','B07','B10'],waterFocus:['B01','B03','B15'],boneFocus:['B01','B04','B16'],climateFocus:['B01','B05','B17'],coachPlan:['AI01','AI03','AI04','AI05','AI06','AI07','T17','T18','T25','T30','T27'],coachBody:['B01','AI13','AI15','AI16','AI17','B01']};
const pathChecks=Object.fromEntries(Object.entries(paths).map(([name,path])=>{const missing=[];for(let i=0;i<path.length-1;i++)if(!graph[path[i]]?.includes(screens[path[i+1]].frameId))missing.push(path[i]+' → '+path[i+1]);if(missing.length)issues.push({problem:'broken review path',name,missing});return [name,{pass:missing.length===0,path}];}));
return {screenCount:frames.length,expectedScreenCount:89,inventory,mainScreenEvidence,typeCounts,textFamilies,artworkCount:artwork.length,rasterNames,prototypeEdgeCount:links.length,graph,pathChecks,smallTargets,issues,flowStartingPoints:p.flowStartingPoints};
