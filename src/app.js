import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { LANDMARKS } from "./landmarks.js";
import "./styles.css";
const $=s=>document.querySelector(s),host=$('#scene');
let renderer;
try{renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});}catch(e){$('#loading').hidden=true;$('#error').hidden=false;throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;host.appendChild(renderer.domElement);
const scene=new T.Scene(),camera=new T.PerspectiveCamera(37,1,.02,60);camera.position.set(0,.2,4.5);
const controls=new OrbitControls(camera,renderer.domElement);controls.enablePan=false;controls.enableDamping=true;controls.dampingFactor=.065;controls.rotateSpeed=.55;controls.zoomSpeed=.65;controls.minDistance=1.65;controls.maxDistance=5.6;controls.autoRotateSpeed=.35;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
scene.add(new T.AmbientLight(0xbed1e8,1.9));const key=new T.DirectionalLight(0xffead1,3.1);key.position.set(-3,5,4);scene.add(key);const rim=new T.DirectionalLight(0x65b9c8,1.3);rim.position.set(3,1,-3);scene.add(rim);
const root=new T.Group();scene.add(root);const picks=[],details=[];const zones={};
let seed=941;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
const rampData=new Uint8Array([55,55,55,255,104,104,104,255,174,174,174,255,239,239,239,255]);
const ramp=new T.DataTexture(rampData,4,1,T.RGBAFormat);ramp.needsUpdate=true;ramp.minFilter=ramp.magFilter=T.NearestFilter;
const mats=new Map();function mat(color){if(!mats.has(color))mats.set(color,new T.MeshToonMaterial({color,gradientMap:ramp}));return mats.get(color);}
function point(lat,lon,r=1){let a=lat*Math.PI/180,b=lon*Math.PI/180;return new T.Vector3(Math.sin(b)*Math.cos(a)*r,Math.sin(a)*r,Math.cos(b)*Math.cos(a)*r);}

const landmarkLayer=document.querySelector('#landmark-layer');
const landmarkEntries=landmarkLayer?LANDMARKS.map(landmark=>{
  const element=document.createElement('div');
  element.className='landmark landmark--'+landmark.type;
  element.dataset.landmark=landmark.id;
  element.dataset.terrain=landmark.type;
  element.title=landmark.description;
  const marker=document.createElement('span');
  marker.className='landmark__marker';
  const label=document.createElement('span');
  label.className='landmark__label';
  label.textContent=landmark.name;
  element.append(marker,label);
  landmarkLayer.appendChild(element);
  return {landmark,element,anchor:point(landmark.latitude,landmark.longitude,landmark.altitude),projected:new T.Vector3()};
}):[];
function updateLandmarks(detailLevel){
  if(!landmarkEntries.length)return;
  const rect=host.getBoundingClientRect();
  const viewDirection=camera.position.clone().normalize();
  landmarkEntries.forEach(entry=>{
    const world=entry.anchor.clone().applyMatrix4(root.matrixWorld);
    const inFront=world.clone().normalize().dot(viewDirection)>.17;
    const visible=detailLevel>=entry.landmark.minDetailLevel&&inFront;
    entry.element.classList.toggle('is-visible',visible);
    if(!visible)return;
    entry.projected.copy(world).project(camera);
    entry.element.style.transform='translate3d('+((entry.projected.x*.5+.5)*rect.width).toFixed(1)+'px,'+((-entry.projected.y*.5+.5)*rect.height).toFixed(1)+'px,0)';
  });
}

function mesh(geo,color,parent=root,zone=null,outline=false){const m=new T.Mesh(geo,mat(color));parent.add(m);if(zone){m.userData.zone=zone;picks.push(m);}if(outline){const e=new T.LineSegments(new T.EdgesGeometry(geo,28),new T.LineBasicMaterial({color:0x192638,transparent:true,opacity:.58}));m.add(e);}return m;}
const sea=mesh(new T.SphereGeometry(1,96,64),0x204966);sea.userData.ocean=true;picks.push(sea);
const halo=new T.Mesh(new T.SphereGeometry(1.035,64,48),new T.ShaderMaterial({transparent:true,side:T.BackSide,depthWrite:false,uniforms:{c:{value:new T.Color(0x63b8c6)}},vertexShader:'varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.0);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',fragmentShader:'varying vec3 n;varying vec3 v;uniform vec3 c;void main(){float f=pow(1.0-abs(dot(normalize(n),normalize(v))),3.0);gl_FragColor=vec4(c,f*.48);}'}));root.add(halo);
function relief(lat,lon,phase){const a=lat*.31+phase,b=lon*.19-phase*.7;return Math.sin(a*1.8+b)*.48+Math.cos(a*.75-b*1.4)*.31+Math.sin((a+b)*3.1)*.21;}
function patch(lat,lon,rx,ry,color,zone,height=.045,phase=0,reliefAmount=.022){const N=72,R=9,verts=[],ids=[];const ringPoint=(factor,angle,edge=false)=>{const w=1+.10*Math.sin(5*angle+phase)+.055*Math.cos(9*angle-phase)+.022*Math.sin(13*angle+phase*.3);const la=lat+Math.sin(angle)*ry*factor*w,lo=lon+Math.cos(angle)*rx*factor*w;const crown=Math.pow(1-factor,1.8)*height*.13;const local=height+reliefAmount*relief(la,lo,phase)*(0.34+factor*.66)+crown;return point(la,lo,1+(edge?0.006:local));};verts.push(...point(lat,lon,1+height+reliefAmount*.12).toArray());for(let j=1;j<=R;j++)for(let i=0;i<N;i++)verts.push(...ringPoint(j/R,i/N*Math.PI*2).toArray());for(let i=0;i<N;i++)ids.push(0,1+i,1+(i+1)%N);for(let j=1;j<R;j++)for(let i=0;i<N;i++){let a=1+(j-1)*N+i,b=1+(j-1)*N+(i+1)%N,c=a+N,d=b+N;ids.push(a,c,b,b,c,d);}const start=verts.length/3;for(let i=0;i<N;i++)verts.push(...ringPoint(1,i/N*Math.PI*2,true).toArray());for(let i=0;i<N;i++){let t=1+(R-1)*N+i,u=1+(R-1)*N+(i+1)%N;ids.push(t,start+i,u,u,start+i,start+(i+1)%N);}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setIndex(ids);geo.computeVertexNormals();const pos=geo.attributes.position;const index=geo.index;const a=new T.Vector3().fromBufferAttribute(pos,index.getX(0)),b=new T.Vector3().fromBufferAttribute(pos,index.getX(1)),c=new T.Vector3().fromBufferAttribute(pos,index.getX(2));if(b.clone().sub(a).cross(c.clone().sub(a)).dot(a)<0){for(let i=0;i<index.count;i+=3){const t=index.getX(i+1);index.setX(i+1,index.getX(i+2));index.setX(i+2,t);}geo.computeVertexNormals();}return mesh(geo,color,root,zone);}
patch(13,-29,33,32,0x81584c,'muscle',.024,1);patch(17,-30,29,27,0xa66f50,'muscle',.054,1);patch(20,-32,23,22,0xbd8b61,'muscle',.078,1);
patch(-22,27,38,28,0x475e54,'fat',.029,2);patch(-18,27,34,24,0x6c8469,'fat',.055,2);patch(-13,23,23,16,0x879474,'fat',.065,2);
patch(-12,157,26,24,0x6c8067,'fat',.038,4);patch(24,-147,23,22,0x9b725c,'muscle',.049,2);
for(let i=0;i<19;i++){let lon=95+i*8,lat=-28+Math.sin(i*.5)*15;patch(lat,lon,2+rand()*3,2+rand()*2, i%3===0?0xaa825e:0x697d65,i%3===0?'muscle':'fat',.02,rand()*6);}
function place(geo,color,lat,lon,r,zone,outline=false){const m=mesh(geo,color,root,zone,outline);m.position.copy(point(lat,lon,r));m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),point(lat,lon));return m;}
function peakGeometry(radius,height,segments=7,phase=0){const rings=[{y:0,r:1.28},{y:.18,r:1.08},{y:.42,r:.79},{y:.68,r:.46},{y:.86,r:.20}],verts=[],ids=[];for(const ring of rings)for(let i=0;i<segments;i++){const a=i/segments*Math.PI*2,jitter=1+.12*Math.sin(a*3+phase)+.06*Math.cos(a*5-phase);verts.push(Math.cos(a)*radius*ring.r*jitter,ring.y*height+Math.sin(a*2+phase)*height*.018,Math.sin(a)*radius*ring.r*jitter);}verts.push(0,height,0);const tip=rings.length*segments;for(let r=0;r<rings.length-1;r++)for(let i=0;i<segments;i++){const n=(i+1)%segments,a=r*segments+i,b=r*segments+n,c=(r+1)*segments+i,d=(r+1)*segments+n;ids.push(a,c,b,b,c,d);}for(let i=0;i<segments;i++){const a=(rings.length-1)*segments+i,b=(rings.length-1)*segments+(i+1)%segments;ids.push(a,tip,b);}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setIndex(ids);geo.computeVertexNormals();return geo;}
const mountainBases=[];function mountain(lat,lon,h,w){const g=new T.Group();root.add(g);g.position.copy(point(lat,lon,1.065));g.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),point(lat,lon));const phase=rand()*Math.PI*2;const rock=mesh(peakGeometry(w,h,7,phase),0xa66d50,g,'muscle',true);const snow=mesh(peakGeometry(w*.44,h*.42,6,phase+1.2),0xd9dcd7,g,'muscle',true);snow.position.y=h*.57;snow.rotation.y=.2;mountainBases.push(g);}
[[36,-37,.26,.105],[23,-31,.31,.12],[10,-25,.24,.105],[3,-42,.18,.08],[27,-49,.19,.075],[17,-14,.15,.07]].forEach(a=>mountain(...a));
for(let i=0;i<22;i++){let lat=1+rand()*39,lon=-49+rand()*35;const m=place(new T.ConeGeometry(.025+rand()*.018,.07,5),0x986a55,lat,lon,1.087,'muscle');details.push(m);}
// A continuous polar surface with separate sculpted glacier blocks.
mesh(new T.SphereGeometry(1.047,64,12,0,Math.PI*2,0,.39),0xbecbd9,root,'bone');
for(let ring=0;ring<3;ring++){const n=ring===0?7:14+ring*3;for(let i=0;i<n;i++){const lat=79-ring*10+rand()*3,lon=i/n*360+ring*11;place(new T.CylinderGeometry(.045+ring*.014,.06+ring*.014,.055+rand()*.06,5),i%3?0xc9d4df:0xa5bbce,lat,lon,1.043,'bone',true);}}
function river(coords,width,color=0x63c9c6,zone='water',r=1.083){const curve=new T.CatmullRomCurve3(coords.map(p=>point(p[0],p[1],r)));if(width>.003){mesh(new T.TubeGeometry(curve,76,width*1.75,5,false),0x315a61,root,null);}return mesh(new T.TubeGeometry(curve,76,width,7,false),color,root,zone);}
river([[62,5],[49,1],[36,4],[25,0],[13,7],[3,12],[-4,19],[-8,27],[-19,33],[-31,43],[-42,42]],.012);
patch(2,12,5,5,0x61c7c6,'water',.087,0);
river([[35,-11],[29,-8],[25,0]],.005);river([[15,23],[11,18],[3,12]],.006);river([[-6,44],[-12,39],[-19,33]],.005);river([[59,5],[49,1],[36,4],[25,0],[13,7]],.0028,0xc5e6df,'water',1.096);
for(const pts of [[[-29,16],[-25,23],[-19,33]],[[20,16],[16,12],[13,7]],[[43,-10],[40,-3],[36,4]],[[-15,51],[-18,44],[-19,33]]])details.push(river(pts,.0035));
function coniferGeometry(radius,height,segments=6,phase=0){const levels=[{y:0,r:1.16},{y:.24,r:1.02},{y:.43,r:.72},{y:.61,r:.62},{y:.77,r:.39},{y:.9,r:.27}],verts=[],ids=[];for(const level of levels)for(let i=0;i<segments;i++){const a=i/segments*Math.PI*2;const jitter=1+.09*Math.sin(a*2+phase)+.04*Math.cos(a*5-phase);verts.push(Math.cos(a)*radius*level.r*jitter,level.y*height,Math.sin(a)*radius*level.r*jitter);}verts.push(0,height,0);const tip=levels.length*segments;for(let r=0;r<levels.length-1;r++)for(let i=0;i<segments;i++){const n=(i+1)%segments,a=r*segments+i,b=r*segments+n,c=(r+1)*segments+i,d=(r+1)*segments+n;ids.push(a,c,b,b,c,d);}for(let i=0;i<segments;i++)ids.push((levels.length-1)*segments+i,tip,(levels.length-1)*segments+(i+1)%segments);const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setIndex(ids);geo.computeVertexNormals();return geo;}
const coniferGeometries=[coniferGeometry(1,2.5,5,.2),coniferGeometry(1,2.5,6,1.7),coniferGeometry(1,2.5,7,3.1)];
const trees=[];for(let i=0;i<180;i++){let lat=-35+rand()*34,lon=7+rand()*45;if(((lat+18)/22)**2+((lon-27)/30)**2>1||Math.abs(lon-(22-lat*.48))<5)continue;const s=.014+rand()*.024;const m=place(coniferGeometries[i%3],i%3?0x3e6255:0x557761,lat,lon,1.065+s,'fat');m.scale.setScalar(s);m.userData.detailScale=s;trees.push(m);if(i%3!==0)details.push(m);}
for(let i=0;i<48;i++){let lat=-35+rand()*38,lon=6+rand()*47;if(((lat+18)/23)**2+((lon-27)/31)**2>1)continue;details.push(place(new T.DodecahedronGeometry(.009+rand()*.012,0),0x7d8877,lat,lon,1.068,'fat'));}
// Southern volcanic island and a restrained caldera.
patch(-68,0,13,8,0x564b50,null,.035);place(new T.CylinderGeometry(.035,.12,.14,9),0x6d514d,-68,0,1.09,null,true);place(new T.CylinderGeometry(.031,.031,.006,12),0xe69b64,-68,0,1.165,null);
// Ocean currents drawn on the sphere, rather than an image pasted onto it.
for(let i=0;i<30;i++){let lat=-60+rand()*115,lon=rand()*360;const coords=[];for(let j=0;j<10;j++)coords.push([lat+Math.sin(j*.4)*1.5,lon+j*.8]);river(coords,.0012,0x477b90,null,1.005);}
// Sparse distant stars.
const starP=[];for(let i=0;i<150;i++){const v=new T.Vector3(rand()-.5,rand()-.5,rand()-.5).normalize().multiplyScalar(12);starP.push(...v.toArray());}const sg=new T.BufferGeometry();sg.setAttribute('position',new T.Float32BufferAttribute(starP,3));scene.add(new T.Points(sg,new T.PointsMaterial({color:0x8798b1,size:.015,transparent:true,opacity:.4})));
const data={muscle:{title:'造山带',en:'OROGENIC BELT',value:'28.6',unit:'kg',label:'骨骼肌量',desc:'山脊层层抬升，记录身体的力量。靠近观察雪峰、岩层和峡谷。',lat:22,lon:-30},water:{title:'生命水道',en:'LIVING WATERWAYS',value:'56.8',unit:'%',label:'体内水分比例',desc:'从极地冰川到河口湿地，水流将这个世界连接起来。放大寻找细小支流。',lat:8,lon:12},bone:{title:'极地要塞',en:'POLAR CITADEL',value:'2.8',unit:'kg',label:'骨量',desc:'冰川沿极地展开，坚实的棱面组成星球的支撑结构。',lat:68,lon:0},fat:{title:'季风大陆',en:'MONSOON CONTINENT',value:'22.4',unit:'%',label:'体脂率',desc:'森林、平原和湿地储存能量。靠近后，植被与河谷的层次逐渐清晰。',lat:-18,lon:27}};
let selected=null,targetCamera=null;const selectionRing=new T.Mesh(new T.RingGeometry(.11,.114,64),new T.MeshBasicMaterial({color:0xbce1d4,transparent:true,opacity:.65,side:T.DoubleSide,depthWrite:false}));selectionRing.visible=false;root.add(selectionRing);
function select(zone){if(!data[zone])throw new Error('Unknown zone');selected=zone;const d=data[zone];$('#card').hidden=false;$('#zone-title').textContent=d.title;$('#zone-en').textContent=d.en;$('#value').textContent=d.value;$('#unit').textContent=d.unit;$('#metric-label').textContent=d.label;$('#description').textContent=d.desc;document.querySelectorAll('[data-zone]').forEach(b=>b.classList.toggle('active',b.dataset.zone===zone));selectionRing.position.copy(point(d.lat,d.lon,1.095));selectionRing.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),point(d.lat,d.lon));selectionRing.visible=true;controls.autoRotate=false;$('#motion').setAttribute('aria-pressed','false');}
function close(){$('#card').hidden=true;selected=null;selectionRing.visible=false;document.querySelectorAll('[data-zone]').forEach(b=>b.classList.remove('active'));}
function focusZone(zone,distance=2.65){select(zone);const d=data[zone];targetCamera=point(d.lat,d.lon,distance);if(reduced){camera.position.copy(targetCamera);targetCamera=null;}}
function zoom(factor){targetCamera=null;camera.position.multiplyScalar(T.MathUtils.clamp(camera.position.length()*factor,controls.minDistance,controls.maxDistance)/camera.position.length());}
function reset(){close();targetCamera=new T.Vector3(0,.2,innerWidth<760?5.6:4.5);controls.autoRotate=false;$('#motion').setAttribute('aria-pressed','false');}
document.querySelectorAll('[data-zone]').forEach(b=>b.addEventListener('click',()=>focusZone(b.dataset.zone,3.6)));$('#close').onclick=close;$('#focus').onclick=()=>focusZone(selected,2.1);$('#plus').onclick=()=>zoom(.83);$('#minus').onclick=()=>zoom(1.2);$('#reset').onclick=reset;$('#motion').onclick=()=>{controls.autoRotate=!controls.autoRotate;$('#motion').setAttribute('aria-pressed',String(controls.autoRotate));};controls.addEventListener('start',()=>{targetCamera=null;});
const ray=new T.Raycaster(),pointer=new T.Vector2(),touches=new Set();let down=null,moved=0,multi=false;
host.addEventListener('pointerdown',e=>{touches.add(e.pointerId);if(touches.size>1)multi=true;else{multi=false;down={x:e.clientX,y:e.clientY};moved=0;}});host.addEventListener('pointermove',e=>{if(down)moved=Math.max(moved,Math.hypot(e.clientX-down.x,e.clientY-down.y));});host.addEventListener('pointercancel',e=>{touches.delete(e.pointerId);down=null;});host.addEventListener('pointerup',e=>{touches.delete(e.pointerId);if(!down||multi||moved>7)return;const rect=host.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);const hits=ray.intersectObjects(picks.filter(m=>m.visible),false);if(hits.length&&hits[0].object.userData.zone)select(hits[0].object.userData.zone);else close();down=null;});
host.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','Escape'].includes(e.key)){e.preventDefault();targetCamera=null;if(e.key==='+'||e.key==='-')zoom(e.key==='+'?.85:1.18);else if(e.key==='Escape')reset();else{const s=new T.Spherical().setFromVector3(camera.position);s.theta+=e.key==='ArrowLeft'?-.12:e.key==='ArrowRight'?.12:0;s.phi=T.MathUtils.clamp(s.phi+(e.key==='ArrowUp'?-.12:e.key==='ArrowDown'?.12:0),.1,Math.PI-.1);camera.position.setFromSpherical(s);}}});
function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.fov=w<760?45:37;camera.updateProjectionMatrix();}new ResizeObserver(resize).observe(host);if(innerWidth<760)camera.position.set(0,.2,5.6);resize();
let last=performance.now(),detail=0;function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.06);last=now;if(document.hidden)return;if(targetCamera){camera.position.lerp(targetCamera,reduced?1:1-Math.exp(-dt*5));if(camera.position.distanceTo(targetCamera)<.005)targetCamera=null;}controls.update(dt);root.updateMatrixWorld();const distance=camera.position.length();const desired=1-T.MathUtils.smoothstep(distance,2.55,3.35);detail+=(desired-detail)*Math.min(1,dt*6);details.forEach(m=>{m.visible=detail>.025;m.scale.setScalar(Math.max(.001,detail)*(m.userData.detailScale||1));});$('#level').textContent=distance<2.55?'山川近景':distance<3.4?'大陆视角':'星球全貌';$('#detail-label').textContent=distance<3.1?'支流与植被 · 细节已展开':'远观轮廓 · 近看山川';updateLandmarks(distance<3.1?1:0);renderer.render(scene,camera);}requestAnimationFrame(frame);$('#loading').hidden=true;
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();$('#error').hidden=false;});
const lifecycle=new AbortController();if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'explore_body_planet',description:'选择身体地貌并调整观察距离。仅操作模拟星球。',inputSchema:{type:'object',properties:{zone:{type:'string',enum:Object.keys(data)},view:{type:'string',enum:['orbit','region']}},required:['zone'],additionalProperties:false},execute:({zone,view='orbit'})=>{if(!data[zone]||!['orbit','region'].includes(view))throw new Error('Invalid zone or view');focusZone(zone,view==='region'?2.1:3.6);camera.position.copy(targetCamera);targetCamera=null;controls.update();return{zone,view,simulated:true};}},{signal:lifecycle.signal})).catch(()=>{});}catch{}}window.addEventListener('pagehide',()=>lifecycle.abort());
