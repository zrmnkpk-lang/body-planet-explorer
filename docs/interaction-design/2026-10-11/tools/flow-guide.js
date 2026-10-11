await Promise.all(['Regular','Bold'].map(style=>figma.loadFontAsync({family:'Inter',style})));
const p=figma.currentPage,createdNodeIds=[];
function label(s,x,y,w,size=18,color='#B8C2C5'){const n=figma.createText();p.appendChild(n);createdNodeIds.push(n.id);n.fontName={family:'Inter',style:size>=24?'Bold':'Regular'};n.characters=s;n.fontSize=size;n.lineHeight={unit:'PIXELS',value:size*1.5};n.fills=[{type:'SOLID',color:figma.util.rgb(color)}];n.textAutoResize='HEIGHT';n.resize(w,n.height);n.x=x;n.y=y;return n;}
label('PORTAL FITNESS / FORMAL INTERACTION DESIGN',80,64,3800,42,'#F4F6F3');
label('Urban American comic · Light realism · Dark sport · Natural world',80,146,3800,22);
label('74 screens / 14 prototype entries / 4 main destinations / Native editable components',80,206,3800,22,'#C2D995');
label('Present from a flow entry. Normal and exception paths are separate. Illustrations are discrete assets; all UI labels and controls are editable.',80,266,3800,18);
label('HOME & ACCOUNT  /  Today’s plan → Edit → Save. Avatar → Account drawer → Account / Membership / Settings.',80,558,3800,28,'#C2D995');
label('TRAIN  /  No plan: start free → add exercises. With plan: preview → explicit start. Rest / pause / complete / save failure.',80,2858,3800,28,'#C2D995');
label('BODY PLANET  /  Full globe → Body metrics → Region focus. Edit a draft → Validate → Save or cancel.',80,7258,3800,28,'#C2D995');
label('AI COACH  /  Context → Draft → Send → Suggestion → Review changes → Confirm save. Error / keyboard / conflict states.',80,9558,3800,28,'#C2D995');
return {createdNodeIds};
