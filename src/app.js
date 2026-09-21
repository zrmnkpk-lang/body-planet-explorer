import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { LANDMARKS } from "./landmarks.js";
import "./styles.css";
const $=s=>document.querySelector(s),host=$('#scene');
let renderer;
try{renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});}catch(e){$('#loading').hidden=true;$('#error').hidden=false;throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;host.appendChild(renderer.domElement);
const scene=new T.Scene(),camera=new T.PerspectiveCamera(37,1,.02,60);camera.position.set(0,.16,3.85);
const controls=new OrbitControls(camera,renderer.domElement);controls.enablePan=false;controls.enableDamping=true;controls.dampingFactor=.065;controls.rotateSpeed=.55;controls.zoomSpeed=.65;controls.minDistance=1.65;controls.maxDistance=5.6;controls.autoRotateSpeed=.35;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
scene.add(new T.AmbientLight(0xbed1e8,1.9));const key=new T.DirectionalLight(0xffead1,3.1);key.position.set(-3,5,4);scene.add(key);const rim=new T.DirectionalLight(0x65b9c8,1.3);rim.position.set(3,1,-3);scene.add(rim);
const root=new T.Group();scene.add(root);const picks=[],details=[];const zones={};
let seed=941;
function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}

// Continuous spherical terrain: one height field drives the whole planet.
// The same field is sampled by the landmark helpers, rivers and collision proxy.
const rampData=new Uint8Array([42,48,60,255,96,103,112,255,170,171,167,255,240,239,225,255]);
const ramp=new T.DataTexture(rampData,4,1,T.RGBAFormat);ramp.needsUpdate=true;ramp.minFilter=ramp.magFilter=T.NearestFilter;
const terrainPalette={
  ocean:[0x183d59,0x245772,0x2d6680],
  muscle:[0x765149,0x9b6650,0xc08963],
  fat:[0x42584e,0x638067,0x8d9670],
  water:[0x3d7780,0x4e9a97,0x72bbb0],
  bone:[0x9aafc0,0xc4d3dc,0xe4eceb]
};
const terrainMats=new Map();
function terrainMaterial(){
  if(!terrainMats.has('terrain'))terrainMats.set('terrain',new T.MeshToonMaterial({vertexColors:true,gradientMap:ramp,roughness:.92}));
  return terrainMats.get('terrain');
}
const mats=new Map();
function mat(color){if(!mats.has(color))mats.set(color,new T.MeshToonMaterial({color,gradientMap:ramp}));return mats.get(color);}
function point(lat,lon,r=1){let a=lat*Math.PI/180,b=lon*Math.PI/180;return new T.Vector3(Math.sin(b)*Math.cos(a)*r,Math.sin(a)*r,Math.cos(b)*Math.cos(a)*r);}
const landmarkLayer=document.querySelector('#landmark-layer');
const landmarkEntries=landmarkLayer?LANDMARKS.map(landmark=>{
  const element=document.createElement('div');element.className='landmark landmark--'+landmark.type;element.dataset.landmark=landmark.id;element.dataset.terrain=landmark.type;element.title=landmark.description;
  const marker=document.createElement('span');marker.className='landmark__marker';const label=document.createElement('span');label.className='landmark__label';label.textContent=landmark.name;element.append(marker,label);landmarkLayer.appendChild(element);
  return {landmark,element,anchor:point(landmark.latitude,landmark.longitude,landmark.altitude),projected:new T.Vector3()};
}):[];
function updateLandmarks(detailLevel){if(!landmarkEntries.length)return;const rect=host.getBoundingClientRect(),viewDirection=camera.position.clone().normalize();landmarkEntries.forEach(entry=>{const world=entry.anchor.clone().applyMatrix4(root.matrixWorld),inFront=world.clone().normalize().dot(viewDirection)>.17,visible=detailLevel>=entry.landmark.minDetailLevel&&inFront;entry.element.classList.toggle('is-visible',visible);if(!visible)return;entry.projected.copy(world).project(camera);entry.element.style.transform='translate3d('+((entry.projected.x*.5+.5)*rect.width).toFixed(1)+'px,'+((-entry.projected.y*.5+.5)*rect.height).toFixed(1)+'px,0)';});}
function hash3(x,y,z){const n=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453;return n-Math.floor(n);}
function valueNoise(x,y,z){const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),fx=x-ix,fy=y-iy,fz=z-iz;const sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy),sz=fz*fz*(3-2*fz);const n000=hash3(ix,iy,iz),n100=hash3(ix+1,iy,iz),n010=hash3(ix,iy+1,iz),n110=hash3(ix+1,iy+1,iz),n001=hash3(ix,iy,iz+1),n101=hash3(ix+1,iy,iz+1),n011=hash3(ix,iy+1,iz+1),n111=hash3(ix+1,iy+1,iz+1);const x00=n000+(n100-n000)*sx,x10=n010+(n110-n010)*sx,x01=n001+(n101-n001)*sx,x11=n011+(n111-n011)*sx;return (x00+(x10-x00)*sy)+(x01+(x11-x01)*sy-x00-(x10-x00)*sy)*sz;}
function fbm(v,octaves=4){let sum=0,amp=.5,freq=1;for(let i=0;i<octaves;i++){sum+=valueNoise(v.x*freq,v.y*freq,v.z*freq)*amp;freq*=2.02;amp*=.5;}return sum;}
function ridged(v){return 1-Math.abs(fbm(v,4)*2-1);}
function wrapLon(v){return ((v+180)%360+360)%360-180;}
function angularRegionScore(lat,lon,region){const dLat=(lat-region.lat)/region.ry,dLon=wrapLon(lon-region.lon)/region.rx;return Math.exp(-(dLat*dLat+dLon*dLon)*1.65);}
const regionDefs=[
  {zone:'muscle',lat:18,lon:-30,rx:44,ry:35},
  {zone:'muscle',lat:24,lon:-146,rx:27,ry:23},
  {zone:'fat',lat:-18,lon:28,rx:43,ry:29},
  {zone:'fat',lat:-10,lon:158,rx:28,ry:23},
  {zone:'water',lat:4,lon:10,rx:17,ry:15}
];
function terrainSample(lat,lon){
  const d=point(lat,lon,1);
  const macro=fbm(new T.Vector3(d.x*1.6+9,d.y*1.6-4,d.z*1.6+3),4);
  const warped=fbm(new T.Vector3(d.x*3.1+macro*.8,d.y*3.1-macro*.4,d.z*3.1+macro*.6),3);
  const scores=regionDefs.map(r=>angularRegionScore(lat,lon,r));
  let regionIndex=0;for(let i=1;i<scores.length;i++)if(scores[i]>scores[regionIndex])regionIndex=i;
  const base=scores[regionIndex];
  const edgeNoise=(warped-.5)*.18+(macro-.5)*.12;
  const landMask=Math.max(0,Math.min(1,base+edgeNoise));
  const zone=landMask>.31?regionDefs[regionIndex].zone:'ocean';
  const belt=Math.max(Math.exp(-Math.pow((lat-23)/17,2)),Math.exp(-Math.pow((lat+18)/22,2))*.78);
  const mountainNoise=Math.pow(ridged(new T.Vector3(d.x*5.2+2,d.y*5.2-1,d.z*5.2+4)),2.7);
  const fine=fbm(new T.Vector3(d.x*13-3,d.y*13+2,d.z*13+5),3);
  const elevation=zone==='ocean' ? .002+fine*.002 : .011+landMask*.019+belt*mountainNoise*.065+fine*.014;
  const slope=Math.min(1,mountainNoise*.9+fine*.25);
  const humidity=Math.max(0,Math.min(1,fbm(new T.Vector3(d.x*2.5-8,d.y*2.5+1,d.z*2.5+7),4)));
  const snow=Math.max(Math.abs(lat)/90,0)*.58+elevation*3.7;
  return {zone,landMask,elevation,slope,humidity,snow};
}
function biomeColor(sample,lat,lon){
  const palette=terrainPalette[sample.zone]||terrainPalette.ocean;
  let t=Math.max(0,Math.min(1,.18+sample.elevation*5+sample.slope*.34));
  if(sample.zone!=='ocean'&&sample.snow>.78)t=Math.min(1,.72+sample.snow*.22);
  if(sample.zone==='fat'&&sample.humidity>.67)t*=.78;
  const c0=new T.Color(palette[0]),c1=new T.Color(palette[1]),c2=new T.Color(palette[2]);
  const c=t<.55?c0.clone().lerp(c1,t/0.55):c1.clone().lerp(c2,(t-.55)/.45);
  if(sample.zone==='bone'&&Math.abs(lat)>62)c.lerp(new T.Color(0xe7f0f1),Math.min(1,(Math.abs(lat)-62)/23));
  return c;
}
function buildTerrain(subdivisions){
  const geo=new T.IcosahedronGeometry(1,subdivisions),pos=geo.attributes.position,colors=new Float32Array(pos.count*3);
  for(let i=0;i<pos.count;i++){
    const v=new T.Vector3().fromBufferAttribute(pos,i).normalize();
    const lat=Math.asin(v.y)*180/Math.PI,lon=Math.atan2(v.x,v.z)*180/Math.PI,s=terrainSample(lat,lon);
    const radius=1+s.elevation+(s.zone==='ocean'?0:s.landMask*.012);
    pos.setXYZ(i,v.x*radius,v.y*radius,v.z*radius);
    const c=biomeColor(s,lat,lon);colors[i*3]=c.r;colors[i*3+1]=c.g;colors[i*3+2]=c.b;
  }
  geo.setAttribute('color',new T.BufferAttribute(colors,3));geo.computeVertexNormals();return geo;
}
const globalTerrain=new T.Mesh(buildTerrain(6),terrainMaterial());globalTerrain.name='continuous-global-terrain';root.add(globalTerrain);
const closeTerrain=new T.Mesh(buildTerrain(7),terrainMaterial());closeTerrain.name='close-range-terrain';closeTerrain.visible=false;root.add(closeTerrain);details.push(closeTerrain);
// A low-density proxy keeps selection stable while the visual mesh swaps LODs.
const collision=new T.Mesh(new T.SphereGeometry(1.12,64,40),new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));collision.userData.collision=true;root.add(collision);picks.push(collision);

function terrainRadius(lat,lon,extra=.006){return 1+terrainSample(lat,lon).elevation+extra;}
function mesh(geo,color,parent=root,zone=null,outline=false){const material=color instanceof T.Material?color:mat(color);const m=new T.Mesh(geo,material);parent.add(m);if(zone){m.userData.zone=zone;picks.push(m);}if(outline){const e=new T.LineSegments(new T.EdgesGeometry(geo,28),new T.LineBasicMaterial({color:0x192638,transparent:true,opacity:.42}));m.add(e);}return m;}
function place(geo,color,lat,lon,r,zone,outline=false){const m=mesh(geo,color,root,zone,outline);const n=point(lat,lon,1);m.position.copy(n.multiplyScalar(r));m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),n);return m;}

function peakGeometry(radius,height,segments=9,phase=0){const rings=[{y:0,r:1.42},{y:.14,r:1.25},{y:.34,r:.96},{y:.58,r:.66},{y:.78,r:.39},{y:.9,r:.22}],verts=[],ids=[];for(let j=0;j<rings.length;j++)for(let i=0;i<segments;i++){const a=i/segments*Math.PI*2,jitter=1+.16*Math.sin(a*3+phase+j*.7)+.07*Math.cos(a*5-phase);const skewX=Math.sin(phase)*.08*j/rings.length,skewZ=Math.cos(phase)*.06*j/rings.length;verts.push(Math.cos(a)*radius*rings[j].r*jitter+skewX*radius,rings[j].y*height+Math.sin(a*2+phase+j)*height*.026,Math.sin(a)*radius*rings[j].r*jitter+skewZ*radius);}const tip=rings.length*segments;verts.push(radius*.08*Math.sin(phase),height,radius*.08*Math.cos(phase));for(let r=0;r<rings.length-1;r++)for(let i=0;i<segments;i++){const n=(i+1)%segments,a=r*segments+i,b=r*segments+n,c=(r+1)*segments+i,d=(r+1)*segments+n;ids.push(a,c,b,b,c,d);}for(let i=0;i<segments;i++){const a=(rings.length-1)*segments+i,b=(rings.length-1)*segments+(i+1)%segments;ids.push(a,tip,b);}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setIndex(ids);geo.computeVertexNormals();return geo;}
const mountainBases=[];
function mountain(lat,lon,h,w,zone='muscle'){const g=new T.Group();root.add(g);const n=point(lat,lon,1);g.position.copy(n.multiplyScalar(terrainRadius(lat,lon,.012)));g.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),n);const phase=rand()*Math.PI*2;mesh(peakGeometry(w,h,9,phase),0x956452,g,zone,true);const secondary=mesh(peakGeometry(w*.62,h*.65,8,phase+1.8),0x805348,g,zone,true);secondary.position.set(w*.48,h*.05,-w*.16);const snow=mesh(peakGeometry(w*.38,h*.38,8,phase+.7),0xd9deda,g,zone,true);snow.position.set(-w*.06,h*.6,w*.03);mountainBases.push(g);}
[[36,-37,.28,.12],[23,-31,.34,.14],[10,-25,.25,.11],[3,-42,.18,.08],[27,-49,.2,.08],[17,-14,.16,.07],[-12,18,.19,.08]].forEach(a=>mountain(...a));

// Polar ice cap and fractured glacier fields.
mesh(new T.SphereGeometry(1.034,96,24,0,Math.PI*2,0,.42),0xc5d3df,root,'bone');
for(let ring=0;ring<5;ring++){const n=12+ring*8;for(let i=0;i<n;i++){const lat=76-ring*8+rand()*2.2,lon=i/n*360+ring*17+rand()*6;const s=.018+rand()*.028;place(new T.DodecahedronGeometry(s,0),i%4?0xc9d7df:0xa7c0d1,lat,lon,terrainRadius(lat,lon,.025),'bone',true);}}

function river(coords,width,color=0x63c9c6,zone='water'){const points=coords.map(([lat,lon])=>point(lat,lon,terrainRadius(lat,lon,.008)));const curve=new T.CatmullRomCurve3(points);if(width>.003)mesh(new T.TubeGeometry(curve,96,width*2.2,6,false),0x294b58,root,null);return mesh(new T.TubeGeometry(curve,96,width,8,false),color,root,zone);}
river([[62,5],[49,1],[36,4],[25,0],[13,7],[3,12],[-4,19],[-8,27],[-19,33],[-31,43],[-42,42]],.011);
river([[35,-11],[29,-8],[25,0]],.005);river([[15,23],[11,18],[3,12]],.006);river([[-6,44],[-12,39],[-19,33]],.005);river([[59,5],[49,1],[36,4],[25,0],[13,7]],.0028,0xc5e6df,'water');
for(const pts of [[[-29,16],[-25,23],[-19,33]],[[20,16],[16,12],[13,7]],[[43,-10],[40,-3],[36,4]],[[-15,51],[-18,44],[-19,33]]])river(pts,.0035);

function coniferGeometry(radius,height,segments=6,phase=0){const levels=[{y:0,r:1.18},{y:.2,r:1.04},{y:.36,r:.78},{y:.54,r:.66},{y:.72,r:.45},{y:.87,r:.28}],verts=[],ids=[];for(const level of levels)for(let i=0;i<segments;i++){const a=i/segments*Math.PI*2,j=1+.09*Math.sin(a*2+phase)+.05*Math.cos(a*5-phase);verts.push(Math.cos(a)*radius*level.r*j,level.y*height,Math.sin(a)*radius*level.r*j);}verts.push(.03*Math.sin(phase),height,.03*Math.cos(phase));const tip=levels.length*segments;for(let r=0;r<levels.length-1;r++)for(let i=0;i<segments;i++){const n=(i+1)%segments,a=r*segments+i,b=r*segments+n,c=(r+1)*segments+i,d=(r+1)*segments+n;ids.push(a,c,b,b,c,d);}for(let i=0;i<segments;i++)ids.push((levels.length-1)*segments+i,tip,(levels.length-1)*segments+(i+1)%segments);const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setIndex(ids);geo.computeVertexNormals();return geo;}
const treeGeometries=[coniferGeometry(1,2.8,5,.2),coniferGeometry(1,2.55,6,1.7),coniferGeometry(1,2.35,7,3.1)];
const treeMats=[new T.MeshToonMaterial({color:0x345548,gradientMap:ramp}),new T.MeshToonMaterial({color:0x4e725f,gradientMap:ramp}),new T.MeshToonMaterial({color:0x6d866c,gradientMap:ramp})];
const treeBatches=treeGeometries.map((geo,i)=>new T.InstancedMesh(geo,treeMats[i],760));treeBatches.forEach((m,i)=>{m.name='forest-instanced-'+i;m.userData.detail=true;root.add(m);});
const tmpMatrix=new T.Matrix4(),tmpQuat=new T.Quaternion(),tmpScale=new T.Vector3(),tmpPos=new T.Vector3(),up=new T.Vector3(0,1,0);let treeCounts=[0,0,0];
for(let i=0;i<treeBatches.length;i++)for(let j=0;j<760;j++){const lat=-39+rand()*40,lon=3+rand()*53,s=terrainSample(lat,lon),forest=s.zone==='fat'&&s.humidity>.42&&s.slope<.7&&s.landMask>.32;if(!forest){tmpScale.set(0,0,0);tmpMatrix.compose(tmpPos,tmpQuat,tmpScale);treeBatches[i].setMatrixAt(j,tmpMatrix);continue;}const n=point(lat,lon,1),scale=.012+rand()*.024;tmpPos.copy(n).multiplyScalar(terrainRadius(lat,lon,.018));tmpQuat.setFromUnitVectors(up,n);tmpScale.set(scale,scale*(.9+rand()*.3),scale);tmpMatrix.compose(tmpPos,tmpQuat,tmpScale);treeBatches[i].setMatrixAt(j,tmpMatrix);treeCounts[i]++;}
treeBatches.forEach(m=>{m.instanceMatrix.needsUpdate=true;m.computeBoundingSphere();details.push(m);});
const rockMat=new T.MeshToonMaterial({color:0x816e62,gradientMap:ramp});const rocks=new T.InstancedMesh(new T.DodecahedronGeometry(1,0),rockMat,620);rocks.name='rock-outcrops';rocks.userData.detail=true;root.add(rocks);for(let i=0;i<620;i++){const lat=-42+rand()*84,lon=-180+rand()*360,s=terrainSample(lat,lon);if(s.zone==='ocean'||s.elevation<.024){tmpScale.set(0,0,0);tmpMatrix.compose(tmpPos,tmpQuat,tmpScale);rocks.setMatrixAt(i,tmpMatrix);continue;}const n=point(lat,lon,1);tmpPos.copy(n).multiplyScalar(terrainRadius(lat,lon,.02));tmpQuat.setFromUnitVectors(up,n);const scale=.006+rand()*.018;tmpScale.set(scale*(.7+rand()*.5),scale*(1+rand()*1.8),scale*(.7+rand()*.5));tmpMatrix.compose(tmpPos,tmpQuat,tmpScale);rocks.setMatrixAt(i,tmpMatrix);}rocks.instanceMatrix.needsUpdate=true;rocks.computeBoundingSphere();details.push(rocks);
// Wetland canopy and a volcanic southern island.
for(let i=0;i<110;i++){const lat=-32+rand()*29,lon=4+rand()*48,s=terrainSample(lat,lon);if(s.zone==='fat'&&s.humidity>.62)place(new T.DodecahedronGeometry(.008+rand()*.012,0),0x778b76,lat,lon,terrainRadius(lat,lon,.019),'fat');}
const island=new T.Group();root.add(island);island.position.copy(point(-68,0,terrainRadius(-68,0,.01)));island.quaternion.setFromUnitVectors(up,point(-68,0));mesh(new T.CylinderGeometry(.035,.13,.14,9),0x6d514d,island);mesh(new T.CylinderGeometry(.031,.031,.006,12),0xe69b64,island).position.y=.07;
// Subtle deep-ocean current lines keep the sphere lively without adding map seams.
for(let i=0;i<28;i++){const lat=-60+rand()*115,lon=rand()*360,coords=[];for(let j=0;j<12;j++)coords.push([lat+Math.sin(j*.4)*1.5,lon+j*.8]);river(coords,.0011,0x477b90,null);}
// Sparse distant stars.
const starP=[];for(let i=0;i<180;i++){const v=new T.Vector3(rand()-.5,rand()-.5,rand()-.5).normalize().multiplyScalar(12);starP.push(...v.toArray());}const sg=new T.BufferGeometry();sg.setAttribute('position',new T.Float32BufferAttribute(starP,3));scene.add(new T.Points(sg,new T.PointsMaterial({color:0x8798b1,size:.015,transparent:true,opacity:.4})));
const data={muscle:{title:'造山带',en:'OROGENIC BELT',value:'28.6',unit:'kg',label:'骨骼肌量',desc:'山脊层层抬升，记录身体的力量。靠近观察雪峰、岩层和峡谷。',lat:22,lon:-30},water:{title:'生命水道',en:'LIVING WATERWAYS',value:'56.8',unit:'%',label:'体内水分比例',desc:'从极地冰川到河口湿地，水流将这个世界连接起来。放大寻找细小支流。',lat:8,lon:12},bone:{title:'极地要塞',en:'POLAR CITADEL',value:'2.8',unit:'kg',label:'骨量',desc:'冰川沿极地展开，坚实的棱面组成星球的支撑结构。',lat:68,lon:0},fat:{title:'季风大陆',en:'MONSOON CONTINENT',value:'22.4',unit:'%',label:'体脂率',desc:'森林、平原和湿地储存能量。靠近后，植被与河谷的层次逐渐清晰。',lat:-18,lon:27}};
let selected=null,targetCamera=null;const selectionRing=new T.Mesh(new T.RingGeometry(.11,.114,64),new T.MeshBasicMaterial({color:0xbce1d4,transparent:true,opacity:.65,side:T.DoubleSide,depthWrite:false}));selectionRing.visible=false;root.add(selectionRing);
function select(zone){if(!data[zone])throw new Error('Unknown zone');selected=zone;const d=data[zone];$('#card').hidden=false;$('#zone-title').textContent=d.title;$('#zone-en').textContent=d.en;$('#value').textContent=d.value;$('#unit').textContent=d.unit;$('#metric-label').textContent=d.label;$('#description').textContent=d.desc;document.querySelectorAll('[data-zone]').forEach(b=>b.classList.toggle('active',b.dataset.zone===zone));selectionRing.position.copy(point(d.lat,d.lon,1.095));selectionRing.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),point(d.lat,d.lon));selectionRing.visible=true;controls.autoRotate=false;$('#motion').setAttribute('aria-pressed','false');}
function close(){$('#card').hidden=true;selected=null;selectionRing.visible=false;document.querySelectorAll('[data-zone]').forEach(b=>b.classList.remove('active'));}
function focusZone(zone,distance=2.65){select(zone);const d=data[zone];targetCamera=point(d.lat,d.lon,distance);if(reduced){camera.position.copy(targetCamera);targetCamera=null;}}
function zoom(factor){targetCamera=null;camera.position.multiplyScalar(T.MathUtils.clamp(camera.position.length()*factor,controls.minDistance,controls.maxDistance)/camera.position.length());}
function reset(){close();targetCamera=new T.Vector3(0,.16,innerWidth<760?5.05:3.85);controls.autoRotate=false;$('#motion').setAttribute('aria-pressed','false');}
document.querySelectorAll('[data-zone]').forEach(b=>b.addEventListener('click',()=>focusZone(b.dataset.zone,3.6)));$('#close').onclick=close;$('#focus').onclick=()=>focusZone(selected,2.1);$('#plus').onclick=()=>zoom(.83);$('#minus').onclick=()=>zoom(1.2);$('#reset').onclick=reset;$('#motion').onclick=()=>{controls.autoRotate=!controls.autoRotate;$('#motion').setAttribute('aria-pressed',String(controls.autoRotate));};controls.addEventListener('start',()=>{targetCamera=null;});
const ray=new T.Raycaster(),pointer=new T.Vector2(),touches=new Set();let down=null,moved=0,multi=false;
host.addEventListener('pointerdown',e=>{touches.add(e.pointerId);if(touches.size>1)multi=true;else{multi=false;down={x:e.clientX,y:e.clientY};moved=0;}});host.addEventListener('pointermove',e=>{if(down)moved=Math.max(moved,Math.hypot(e.clientX-down.x,e.clientY-down.y));});host.addEventListener('pointercancel',e=>{touches.delete(e.pointerId);down=null;});host.addEventListener('pointerup',e=>{touches.delete(e.pointerId);if(!down||multi||moved>7)return;const rect=host.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);const hits=ray.intersectObjects(picks.filter(m=>m.visible),false);if(hits.length){const hit=hits[0],obj=hit.object;if(obj.userData.zone)select(obj.userData.zone);else if(obj.userData.collision){const local=root.worldToLocal(hit.point.clone()).normalize(),lat=Math.asin(local.y)*180/Math.PI,lon=Math.atan2(local.x,local.z)*180/Math.PI;const sample=terrainSample(lat,lon);if(Math.abs(lat)>55)select('bone');else if(sample.zone!=='ocean')select(sample.zone);else close();}else close();}else close();down=null;});
host.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','Escape'].includes(e.key)){e.preventDefault();targetCamera=null;if(e.key==='+'||e.key==='-')zoom(e.key==='+'?.85:1.18);else if(e.key==='Escape')reset();else{const s=new T.Spherical().setFromVector3(camera.position);s.theta+=e.key==='ArrowLeft'?-.12:e.key==='ArrowRight'?.12:0;s.phi=T.MathUtils.clamp(s.phi+(e.key==='ArrowUp'?-.12:e.key==='ArrowDown'?.12:0),.1,Math.PI-.1);camera.position.setFromSpherical(s);}}});
function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.fov=w<760?45:37;camera.updateProjectionMatrix();}new ResizeObserver(resize).observe(host);if(innerWidth<760)camera.position.set(0,.16,5.05);resize();
let last=performance.now(),detail=0;function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.06);last=now;if(document.hidden)return;if(targetCamera){camera.position.lerp(targetCamera,reduced?1:1-Math.exp(-dt*5));if(camera.position.distanceTo(targetCamera)<.005)targetCamera=null;}controls.update(dt);root.updateMatrixWorld();const distance=camera.position.length();const desired=1-T.MathUtils.smoothstep(distance,2.55,3.35);detail+=(desired-detail)*Math.min(1,dt*6);const detailVisible=detail>.025;globalTerrain.visible=!detailVisible;closeTerrain.visible=detailVisible;details.forEach(m=>{if(m!==closeTerrain)m.visible=detailVisible;});$('#level').textContent=distance<2.55?'山川近景':distance<3.4?'大陆视角':'星球全貌';$('#detail-label').textContent=distance<3.1?'支流与植被 · 细节已展开':'远观轮廓 · 近看山川';updateLandmarks(distance<3.1?1:0);renderer.render(scene,camera);}requestAnimationFrame(frame);$('#loading').hidden=true;
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();$('#error').hidden=false;});
const lifecycle=new AbortController();if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'explore_body_planet',description:'选择身体地貌并调整观察距离。仅操作模拟星球。',inputSchema:{type:'object',properties:{zone:{type:'string',enum:Object.keys(data)},view:{type:'string',enum:['orbit','region']}},required:['zone'],additionalProperties:false},execute:({zone,view='orbit'})=>{if(!data[zone]||!['orbit','region'].includes(view))throw new Error('Invalid zone or view');focusZone(zone,view==='region'?2.1:3.6);camera.position.copy(targetCamera);targetCamera=null;controls.update();return{zone,view,simulated:true};}},{signal:lifecycle.signal})).catch(()=>{});}catch{}}window.addEventListener('pagehide',()=>lifecycle.abort());
