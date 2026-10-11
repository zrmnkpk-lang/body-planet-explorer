const createdNodeIds=[];
const initial=figma.root.children.find(p=>p.id==='0:1');
initial.name='01 · Interactive flows';
const pageNames=['02 · Design system','03 · Handoff & rules'];
const pages={flows:initial.id};
for(let i=0;i<pageNames.length;i++){
  let p=figma.root.children.find(p=>p.name===pageNames[i]);
  if(!p){p=figma.createPage();p.name=pageNames[i];createdNodeIds.push(p.id);}
  pages[i===0?'library':'handoff']=p.id;
}
const colors={base:'#101419',card:'#1B2228',raised:'#26313A',primary:'#F4F6F3',secondary:'#B8C2C5',action:'#C2D995',onAction:'#101419',data:'#7AAEB4',warning:'#E3BA78',error:'#F08E88',border:'#39464F'};
function rgb(h){return {r:parseInt(h.slice(1,3),16)/255,g:parseInt(h.slice(3,5),16)/255,b:parseInt(h.slice(5,7),16)/255};}
// Adapted from figma-generate-library/scripts/createVariableCollection.js.
function collection(name){let c=figma.variables.createVariableCollection(name);c.renameMode(c.modes[0].modeId,'Dark');return c;}
const primitives=collection('Portal / Primitives'),semantic=collection('Portal / Semantic'),geometry=collection('Portal / Geometry');
const variables={};
for(const [name,hex] of Object.entries(colors)){
  const p=figma.variables.createVariable('raw/'+name,primitives,'COLOR');p.scopes=[];p.setValueForMode(primitives.modes[0].modeId,{...rgb(hex),a:1});
  p.setVariableCodeSyntax('WEB','var(--portal-raw-'+name+')');
  const v=figma.variables.createVariable('color/'+name,semantic,'COLOR');v.scopes=name==='border'?['STROKE_COLOR']:['FRAME_FILL','SHAPE_FILL','TEXT_FILL','STROKE_COLOR'];
  v.setValueForMode(semantic.modes[0].modeId,{type:'VARIABLE_ALIAS',id:p.id});v.setVariableCodeSyntax('WEB','var(--portal-'+name+')');variables[name]=v.id;
}
for(const [name,value,scope] of [['space/4',4,'GAP'],['space/8',8,'GAP'],['space/12',12,'GAP'],['space/16',16,'GAP'],['space/20',20,'GAP'],['space/24',24,'GAP'],['radius/card',16,'CORNER_RADIUS'],['radius/control',12,'CORNER_RADIUS']]){
  const v=figma.variables.createVariable(name,geometry,'FLOAT');v.scopes=[scope];v.setValueForMode(geometry.modes[0].modeId,value);v.setVariableCodeSyntax('WEB','var(--portal-'+name.replaceAll('/','-')+')');variables[name]=v.id;
}
await Promise.all(['Regular','Medium','Semi Bold','Bold'].map(style=>figma.loadFontAsync({family:'Inter',style})));
const textStyles={};
for(const [name,size,style,height] of [['Title',28,'Bold',34],['Section',18,'Bold',24],['Body',15,'Regular',22],['Label',14,'Semi Bold',20],['Small',12,'Regular',18],['Nav',11,'Medium',16],['Metric',24,'Bold',30]]){
  const s=figma.createTextStyle();s.name='Portal/'+name;s.fontName={family:'Inter',style};s.fontSize=size;s.lineHeight={unit:'PIXELS',value:height};textStyles[name]=s.id;
}
return {createdNodeIds,mutatedNodeIds:[initial.id],pages,variables,textStyles,collections:[primitives.id,semantic.id,geometry.id],colorCount:Object.keys(colors).length,geometryCount:8,font:'Inter',gapAnalysis:'Blank file; brand-specific local components and tokens required. Approved concepts take precedence over legacy runtime typography.'};
