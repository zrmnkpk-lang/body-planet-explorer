const page=await figma.getNodeByIdAsync(CTX.pages.library);
await figma.setCurrentPageAsync(page);
await Promise.all(['Regular','Medium','Semi Bold','Bold'].map(style=>figma.loadFontAsync({family:'Inter',style})));
const entries=Object.entries(CTX.variables),resolved=await Promise.all(entries.map(([,id])=>figma.variables.getVariableByIdAsync(id)));
const V={};entries.forEach(([k],i)=>V[k]=resolved[i]);
const createdNodeIds=[],components={},properties={},iconIds={};
function remember(n){createdNodeIds.push(n.id);return n;}
function paint(key){return figma.variables.setBoundVariableForPaint({type:'SOLID',color:{r:0,g:0,b:0}},'color',V[key]);}
function color(n,key){n.fills=[paint(key)];}
function text(parent,label,style='Label',ink='primary',w){const n=remember(figma.createText());parent.appendChild(n);n.fontName={family:'Inter',style:style==='Title'||style==='Section'||style==='Metric'?'Bold':style==='Label'?'Semi Bold':'Regular'};n.characters=label;n.textStyleId=CTX.textStyles[style];color(n,ink);n.textAutoResize='HEIGHT';if(w)n.resize(w,n.height);return n;}
function component(name,w,h){const c=remember(figma.createComponent());page.appendChild(c);c.name=name;c.resize(w,h);c.layoutMode='HORIZONTAL';c.primaryAxisAlignItems='CENTER';c.counterAxisAlignItems='CENTER';c.primaryAxisSizingMode='FIXED';c.counterAxisSizingMode='FIXED';c.fills=[];c.description='Portal Fitness reusable native component.';return c;}
function bindRadius(n,key='radius/control'){n.setBoundVariable('cornerRadius',V[key]);}
// Icons come directly from the project's lucide-react package, as editable SVG vectors.
for(const [name,svg] of Object.entries(ICONS)){
  const c=component('Icon/'+name,24,24);c.x=80+(Object.keys(iconIds).length%12)*70;c.y=120+Math.floor(Object.keys(iconIds).length/12)*70;
  const graphic=figma.createNodeFromSvg(svg);c.appendChild(graphic);graphic.name='SVG/'+name;createdNodeIds.push(graphic.id,...graphic.findAll(()=>true).map(n=>n.id));
  for(const n of graphic.findAll(()=>true)){if('fills'in n&&Array.isArray(n.fills))n.fills=n.fills.map(p=>p.type==='SOLID'?figma.variables.setBoundVariableForPaint(p,'color',V.primary):p);if('strokes'in n&&Array.isArray(n.strokes))n.strokes=n.strokes.map(p=>p.type==='SOLID'?figma.variables.setBoundVariableForPaint(p,'color',V.primary):p);}
  iconIds[name]=c.id;
}
// Variant grid pattern adapted from createComponentWithVariants.js; one page switch per call.
const variants=[];
for(const style of ['Primary','Secondary','Quiet'])for(const state of ['Default','Pressed','Disabled','Loading']){
  const c=component('Style='+style+', State='+state,350,48);bindRadius(c);c.setBoundVariable('paddingLeft',V['space/16']);c.setBoundVariable('paddingRight',V['space/16']);
  if(style==='Primary')color(c,state==='Disabled'?'raised':'action');else if(style==='Secondary')color(c,'raised');
  if(state==='Pressed')c.opacity=0.86;
  text(c,state==='Loading'?'Saving…':'Button','Label',style==='Primary'&&state!=='Disabled'?'onAction':'primary');variants.push(c);
}
const buttonSet=remember(figma.combineAsVariants(variants,page));buttonSet.name='Button';buttonSet.description='48px action; one primary action per view. Loading prevents duplicate submit. Disabled has no prototype action.';buttonSet.x=80;buttonSet.y=410;
buttonSet.resize(3*382,4*80);buttonSet.children.forEach((c,i)=>{c.x=(i%3)*382;c.y=Math.floor(i/3)*80;});
const labelKey=buttonSet.addComponentProperty('Label','TEXT','Button');for(const c of buttonSet.children)c.children.find(n=>n.type==='TEXT').componentPropertyReferences={characters:labelKey};properties.buttonLabel=labelKey;
for(const c of buttonSet.children)components['Button/'+c.name]=c.id;components.ButtonSet=buttonSet.id;
const fieldVariants=[];
for(const state of ['Default','Focused','Error','Disabled']){
  const c=component('State='+state,350,52);color(c,'raised');bindRadius(c);c.setBoundVariable('paddingLeft',V['space/16']);c.primaryAxisAlignItems='MIN';c.strokes=[paint(state==='Error'?'error':state==='Focused'?'action':'border')];c.strokeWeight=1;
  text(c,'Value','Body');fieldVariants.push(c);
}
const fieldSet=remember(figma.combineAsVariants(fieldVariants,page));fieldSet.name='Input';fieldSet.description='Text/numeric input; unit is a separate label. Errors stay adjacent to their field.';fieldSet.x=80;fieldSet.y=820;fieldSet.resize(4*382,84);fieldSet.children.forEach((c,i)=>{c.x=i*382;c.y=0;});
const valueKey=fieldSet.addComponentProperty('Value','TEXT','Value');for(const c of fieldSet.children)c.children.find(n=>n.type==='TEXT').componentPropertyReferences={characters:valueKey};properties.inputValue=valueKey;for(const c of fieldSet.children)components['Input/'+c.name]=c.id;components.InputSet=fieldSet.id;
const row=component('Action row',350,72);row.x=80;row.y=990;row.primaryAxisAlignItems='MIN';row.itemSpacing=12;row.setBoundVariable('paddingLeft',V['space/16']);row.setBoundVariable('paddingRight',V['space/16']);color(row,'card');bindRadius(row,'radius/card');
const ri=remember((await figma.getNodeByIdAsync(iconIds.ChevronRight)).createInstance());row.appendChild(ri);
const rl=text(row,'Action','Label',undefined,280);const rowLabel=row.addComponentProperty('Label','TEXT','Action');rl.componentPropertyReferences={characters:rowLabel};properties.rowLabel=rowLabel;components.Row=row.id;
const badge=component('Badge',92,28);badge.x=480;badge.y=990;color(badge,'raised');badge.cornerRadius=14;const bt=text(badge,'Planned','Small');const badgeKey=badge.addComponentProperty('Label','TEXT','Planned');bt.componentPropertyReferences={characters:badgeKey};components.Badge=badge.id;properties.badgeLabel=badgeKey;
const metrics=[];
for(const state of ['Default','Selected','Empty']){
  const c=component('State='+state,169,78);c.layoutMode='VERTICAL';c.primaryAxisAlignItems='CENTER';c.counterAxisAlignItems='MIN';c.setBoundVariable('paddingLeft',V['space/12']);c.setBoundVariable('itemSpacing',V['space/4']);color(c,'card');bindRadius(c,'radius/control');c.strokes=[paint(state==='Selected'?'action':'border')];c.strokeWeight=1;text(c,'Muscle','Small','secondary');text(c,state==='Empty'?'—':'32.8 kg','Section');metrics.push(c);
}
const metricSet=remember(figma.combineAsVariants(metrics,page));metricSet.name='Metric';metricSet.x=80;metricSet.y=1160;metricSet.resize(3*200,110);metricSet.children.forEach((c,i)=>{c.x=i*200;c.y=0;});
const metricLabel=metricSet.addComponentProperty('Label','TEXT','Muscle'),metricValue=metricSet.addComponentProperty('Value','TEXT','32.8 kg');for(const c of metricSet.children){c.children[0].componentPropertyReferences={characters:metricLabel};c.children[1].componentPropertyReferences={characters:metricValue};components['Metric/'+c.name]=c.id;}properties.metricLabel=metricLabel;properties.metricValue=metricValue;components.MetricSet=metricSet.id;
const bar=component('AI quick entry',350,46);bar.x=80;bar.y=1320;bar.primaryAxisAlignItems='MIN';bar.setBoundVariable('itemSpacing',V['space/12']);bar.setBoundVariable('paddingLeft',V['space/12']);color(bar,'card');bindRadius(bar);bar.strokes=[paint('action')];bar.strokeWeight=1;
const ai=remember((await figma.getNodeByIdAsync(iconIds.MessageCircle)).createInstance());bar.appendChild(ai);text(bar,'Ask AI Coach…','Body','secondary',240);const send=remember((await figma.getNodeByIdAsync(iconIds.ArrowRight)).createInstance());bar.appendChild(send);components.AIQuick=bar.id;
const avatar=component('Account avatar',44,44);avatar.x=480;avatar.y=1320;const circle=remember(figma.createEllipse());avatar.appendChild(circle);circle.resize(30,30);color(circle,'raised');circle.strokes=[paint('data')];circle.strokeWeight=1;components.Avatar=avatar.id;
const navItems=[];
for(const selected of ['Home','Train','Body Planet','AI Coach']){
 const nav=component('Selected='+selected,390,78);nav.primaryAxisAlignItems='SPACE_BETWEEN';nav.setBoundVariable('paddingLeft',V['space/16']);nav.setBoundVariable('paddingRight',V['space/16']);color(nav,'base');
 for(const [label,icon] of [['Home','House'],['Train','Dumbbell'],['Body Planet','Globe2'],['AI Coach','MessageCircle']]){
  const slot=remember(figma.createAutoLayout('VERTICAL'));nav.appendChild(slot);slot.name='Tab/'+label;slot.resize(83,64);slot.primaryAxisSizingMode='FIXED';slot.counterAxisSizingMode='FIXED';slot.primaryAxisAlignItems='CENTER';slot.counterAxisAlignItems='CENTER';slot.itemSpacing=4;slot.fills=[];
  const inst=remember((await figma.getNodeByIdAsync(iconIds[icon])).createInstance());slot.appendChild(inst);for(const n of inst.findAllWithCriteria({types:['VECTOR']})){n.strokes=n.strokes.map(p=>p.type==='SOLID'?figma.variables.setBoundVariableForPaint(p,'color',V[label===selected?'action':'secondary']):p);n.fills=n.fills.map(p=>p.type==='SOLID'?figma.variables.setBoundVariableForPaint(p,'color',V[label===selected?'action':'secondary']):p);}text(slot,label,'Nav',label===selected?'action':'secondary');
 }
 navItems.push(nav);
}
const navSet=remember(figma.combineAsVariants(navItems,page));navSet.name='Bottom navigation';navSet.description='Exactly four destinations. Hidden while keyboard is visible or a blocking form is open.';navSet.x=80;navSet.y=1490;navSet.resize(4*422,110);navSet.children.forEach((c,i)=>{c.x=i*422;c.y=0;components['Nav/'+c.name]=c.id;});components.NavSet=navSet.id;
return {createdNodeIds,components,properties,iconIds,componentSets:[buttonSet,fieldSet,metricSet,navSet].length,buttonVariants:12,inputVariants:4,metricVariants:3,navVariants:4,font:'Inter',nativeIconCount:34,styleIds:CTX.textStyles};
