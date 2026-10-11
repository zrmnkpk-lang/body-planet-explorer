const page=await figma.getNodeByIdAsync(CTX.pages.flows);await figma.setCurrentPageAsync(page);
const createdNodeIds=[],screens={},groups={};
for(const spec of SPECS){
 let group=groups[spec.group];if(!group){group={index:Object.keys(groups).length,count:0};groups[spec.group]=group;}
 const i=group.count++,n=figma.createFrame();page.appendChild(n);createdNodeIds.push(n.id);n.name=spec.id+' · '+spec.name;n.resize(390,844);n.x=80+(i%7)*480;n.y=700+group.index*3300+Math.floor(i/7)*1040;n.layoutMode='VERTICAL';n.primaryAxisSizingMode='FIXED';n.counterAxisSizingMode='FIXED';n.fills=[{type:'SOLID',color:{r:16/255,g:20/255,b:25/255}}];n.clipsContent=true;n.placeholder=true;screens[spec.id]={frameId:n.id,name:n.name,x:n.x,y:n.y,width:390,height:844};
}
return {createdNodeIds,screens,totalScreens:SPECS.length,groups};
