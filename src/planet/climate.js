import * as T from "three"
import { direction, sample, seeded } from "./field.js"

const STORM_CENTERS = [[15, 12], [-25, 39], [5, 160], [-20, -125], [45, -50]]
const CYCLONE_CENTERS = [[79, -55], [5, -85]]
const CYCLONE_PERIOD = 30
const CYCLONE_RATE = 1 / CYCLONE_PERIOD
const CYCLONE_WIND_INFLUENCE_RADIUS = 0.615
const cycloneCycle = (site) => 0.13 + site * 0.5
const smoothPulse = (a, b, value) => {
  const t = T.MathUtils.clamp((value - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}
const cycloneHash = (value) => {
  const raw = Math.sin(value * 127.1 + 311.7) * 43758.5453
  return raw - Math.floor(raw)
}
const STORM_SCHEDULES = STORM_CENTERS.map((_, site) => {
  const seed = 73.17 + site * 21.31
  return {
    period: 20 + cycloneHash(seed) * 10,
    phase: cycloneHash(seed + 8.3) * 30,
    seed,
  }
})
export function cycloneState(time, site) {
  const phase = time * CYCLONE_RATE + cycloneCycle(site)
  const cycle = Math.floor(phase), event = phase - cycle
  const pulse = smoothPulse(0.025, 0.10, event) *
    (1 - smoothPulse(0.45, 0.525, event))
  const seed = cycle * 7.13 + site * 19.19
  const heading = cycloneHash(seed) * Math.PI * 2
  const travel = smoothPulse(0.08, 0.30, event)
  const distance = (0.07 + cycloneHash(seed + 11.7) * 0.07) * travel
  const size = 1 + 0.5 * cycloneHash(seed + 23.6)
  return { event, pulse, cycle, heading, distance, size }
}
export function stormState(time, site) {
  const schedule = STORM_SCHEDULES[site]
  const phase = (time + schedule.phase) / schedule.period
  const cycle = Math.floor(phase)
  const elapsed = (phase - cycle) * schedule.period
  const duration = 10 + 5 * cycloneHash(schedule.seed + cycle * 31.7 + 7.9)
  const pulse = smoothPulse(0.15, 1.15, elapsed) *
    (1 - smoothPulse(duration - 1.25, duration, elapsed))
  const size = 1 + 0.5 * cycloneHash(schedule.seed + cycle * 13.7 + 61.1)
  return { cycle, elapsed, duration, pulse, size, period: schedule.period, phaseOffset: schedule.phase }
}

const cloudVertexShader = `
uniform float uTime;
uniform float uDrift;
uniform float uStormClouds;
uniform vec3 uCycloneCenter0;
uniform vec3 uCycloneEast0;
uniform vec3 uCycloneNorth0;
uniform vec3 uCycloneCenter1;
uniform vec3 uCycloneEast1;
uniform vec3 uCycloneNorth1;
attribute vec3 aStormCenter;
attribute float aStormPeriod;
attribute float aStormPhase;
attribute float aStormSeed;
varying vec3 vCloudNormal;
varying vec3 vCloudPosition;
varying float vStormPulse;
varying float vCycloneClearance;
float cycloneRandom(float value){return fract(sin(value*127.1+311.7)*43758.5453);}
void weatherCyclone(vec3 baseCenter,vec3 east,vec3 north,float cycleOffset,float site,
  out vec3 center,out float pulse,out float size){
  float cyclePhase=uTime*0.0333333333+cycleOffset;
  float cycleIndex=floor(cyclePhase);
  float event=fract(cyclePhase);
  float seed=cycleIndex*7.13+site*19.19;
  float cycloneSize=1.0+0.5*cycloneRandom(seed+23.6);
  float heading=cycloneRandom(seed)*6.2831853;
  float travel=smoothstep(0.08,0.30,event);
  float drift=(0.07+cycloneRandom(seed+11.7)*0.07)*travel;
  center=normalize(baseCenter+(cos(heading)*east+sin(heading)*north)*drift);
  pulse=smoothstep(0.025,0.10,event)*(1.0-smoothstep(0.45,0.525,event));
  size=1.0+0.5*cycloneRandom(seed+23.6);
}
float clearCycloneClouds(vec3 cloudDirection){
  vec3 center0,center1;
  float pulse0,pulse1,size0,size1;
  weatherCyclone(uCycloneCenter0,uCycloneEast0,uCycloneNorth0,0.13,0.0,
    center0,pulse0,size0);
  weatherCyclone(uCycloneCenter1,uCycloneEast1,uCycloneNorth1,0.63,1.0,
    center1,pulse1,size1);
  float distance0=acos(clamp(dot(cloudDirection,center0),-1.0,1.0));
  float distance1=acos(clamp(dot(cloudDirection,center1),-1.0,1.0));
  float radius0=0.615*size0;
  float radius1=0.615*size1;
  float cut0=1.0-smoothstep(radius0*0.78,radius0,distance0);
  float cut1=1.0-smoothstep(radius1*0.78,radius1,distance1);
  return (1.0-pulse0*cut0)*(1.0-pulse1*cut1);
}
void main(){
  vec4 localPosition=vec4(position,1.0);
  vec3 instanceCenter=vec3(0.0);
  vec3 localNormal=normal;
  #ifdef USE_INSTANCING
    localPosition=instanceMatrix*localPosition;
    instanceCenter=instanceMatrix[3].xyz;
    mat3 cloudBasis=mat3(instanceMatrix);
    vec3 normalScale=vec3(dot(cloudBasis[0],cloudBasis[0]),
      dot(cloudBasis[1],cloudBasis[1]),dot(cloudBasis[2],cloudBasis[2]));
    localNormal=cloudBasis*(localNormal/normalScale);
  #endif
  vStormPulse=1.0;
  vCycloneClearance=1.0;
  if(uStormClouds>0.5){
    float stormTime=uTime+aStormPhase;
    float stormCycle=floor(stormTime/aStormPeriod);
    float elapsed=mod(stormTime,aStormPeriod);
    float duration=10.0+5.0*cycloneRandom(aStormSeed+stormCycle*31.7+7.9);
    float stormSize=1.0+0.5*cycloneRandom(aStormSeed+stormCycle*13.7+61.1);
    vStormPulse=smoothstep(0.15,1.15,elapsed)*
      (1.0-smoothstep(duration-1.25,duration,elapsed));
    vec3 stormAnchor=normalize(aStormCenter)*1.136;
    localPosition.xyz=stormAnchor+(localPosition.xyz-stormAnchor)*stormSize;
    instanceCenter=stormAnchor+(instanceCenter-stormAnchor)*stormSize;
  }
  float angle=uTime*uDrift;
  float c=cos(angle),s=sin(angle);
  mat2 rotation=mat2(c,-s,s,c);
  localPosition.xz=rotation*localPosition.xz;
  instanceCenter.xz=rotation*instanceCenter.xz;
  localNormal.xz=rotation*localNormal.xz;
  if(uStormClouds<0.5)vCycloneClearance=clearCycloneClouds(normalize(instanceCenter));
  vec4 viewPosition=modelViewMatrix*localPosition;
  vCloudNormal=normalize(normalMatrix*localNormal);
  vCloudPosition=localPosition.xyz;
  gl_Position=projectionMatrix*viewPosition;
}`

const cloudFragmentShader = `
uniform float uTime;
uniform float uOpacity;
uniform vec3 uColor;
varying vec3 vCloudNormal;
varying vec3 vCloudPosition;
varying float vStormPulse;
varying float vCycloneClearance;
void main(){
  vec3 normalDirection=normalize(vCloudNormal);
  float light=dot(normalDirection,normalize(vec3(-0.35,0.72,0.58)))*0.5+0.5;
  float grain=sin(vCloudPosition.x*28.0+uTime*0.16)*sin(vCloudPosition.z*22.0-uTime*0.12);
  float bands=floor((light+grain*0.045)*4.0+0.5)/4.0;
  float rim=pow(1.0-abs(normalDirection.z),2.2);
  vec3 color=uColor*(0.58+bands*0.44)+vec3(0.025,0.047,0.06)*rim;
  float alpha=uOpacity*(0.76+bands*0.2+rim*0.12)*vStormPulse*vCycloneClearance;
  gl_FragColor=vec4(color,alpha);
}`

function cloudMaterial(color, drift, stormClouds = false) {
  const cycloneUniforms = {}
  CYCLONE_CENTERS.forEach(([latitude, longitude], site) => {
    const center = new T.Vector3(...direction(latitude, longitude)),
      east = new T.Vector3(Math.cos(longitude * Math.PI / 180), 0,
        -Math.sin(longitude * Math.PI / 180)).normalize(),
      north = new T.Vector3().crossVectors(center, east).normalize()
    cycloneUniforms[`uCycloneCenter${site}`] = { value: center }
    cycloneUniforms[`uCycloneEast${site}`] = { value: east }
    cycloneUniforms[`uCycloneNorth${site}`] = { value: north }
  })
  return new T.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDrift: { value: drift },
      uOpacity: { value: 0 },
      uStormClouds: { value: stormClouds ? 1 : 0 },
      uColor: { value: new T.Color(color) },
      ...cycloneUniforms,
    },
    vertexShader: cloudVertexShader,
    fragmentShader: cloudFragmentShader,
    transparent: true,
    depthWrite: false,
  })
}

const windVertexShader = `
uniform float uTime;
uniform float uOpacity;
uniform float uCycloneInfluenceRadius;
uniform vec3 uCycloneCenter0;
uniform vec3 uCycloneEast0;
uniform vec3 uCycloneNorth0;
uniform vec3 uCycloneCenter1;
uniform vec3 uCycloneEast1;
uniform vec3 uCycloneNorth1;
attribute float aPhase;
attribute float aSpeed;
attribute float aTail;
attribute float aSide;
attribute float aWidth;
attribute float aStrength;
attribute float aLifetime;
varying float vAlpha;
float cycloneRandom(float value){return fract(sin(value*127.1+311.7)*43758.5453);}
vec3 applyCycloneFlow(vec3 point, vec3 baseCenter, vec3 east, vec3 north,
  float site, float cycleOffset){
  float cyclePhase=uTime*0.0333333333+cycleOffset;
  float cycleIndex=floor(cyclePhase);
  float event=fract(cyclePhase);
  float seed=cycleIndex*7.13+site*19.19;
  float heading=cycloneRandom(seed)*6.2831853;
  float travel=smoothstep(0.08,0.30,event);
  float drift=(0.07+cycloneRandom(seed+11.7)*0.07)*travel;
  vec3 center=normalize(baseCenter+(cos(heading)*east+sin(heading)*north)*drift);
  float pulse=smoothstep(0.025,0.10,event)*(1.0-smoothstep(0.45,0.525,event));
  vec3 direction=normalize(point);
  float cosine=clamp(dot(direction,center),-1.0,1.0);
  float distance=acos(cosine);
  float influence=(1.0-smoothstep(0.0,uCycloneInfluenceRadius*cycloneSize,distance))*pulse;
  vec3 tangent=direction-center*cosine;
  float tangentLength=length(tangent);
  if(influence<=0.001||tangentLength<0.00001)return point;
  vec3 radial=tangent/tangentLength;
  float azimuth=atan(dot(radial,north),dot(radial,east));
  float activeSeconds=clamp((event-0.025)/0.5,0.0,1.0)*15.0;
  float angle=azimuth-0.26*activeSeconds*influence;
  float contractedDistance=distance*(1.0-0.42*influence*clamp(activeSeconds/15.0,0.0,1.0));
  vec3 inward=cos(angle)*east+sin(angle)*north;
  return normalize(center*cos(contractedDistance)+inward*sin(contractedDistance))*length(point);
}
void main(){
  float angle=aPhase+uTime*aSpeed-sign(aSpeed)*aTail*(0.048+abs(aSpeed)*0.17);
  float lat=asin(position.y)+sin(angle*3.0+position.y*11.0)*0.008
    +aSide*aWidth*(0.16+0.84*sin(3.14159265*aTail));
  vec3 p=vec3(sin(angle)*cos(lat),sin(lat),cos(angle)*cos(lat))*1.09;
  float event=fract(uTime*0.067+aLifetime);
  float pulse=smoothstep(0.05,0.2,event)*(1.0-smoothstep(0.62,0.79,event));
  p=applyCycloneFlow(p,uCycloneCenter0,uCycloneEast0,uCycloneNorth0,0.0,0.13);
  p=applyCycloneFlow(p,uCycloneCenter1,uCycloneEast1,uCycloneNorth1,1.0,0.63);
  vAlpha=uOpacity*aStrength*pulse*(0.23+0.77*sin(3.14159265*aTail));
  gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
}`

const rainVertexShader = `
uniform float uTime;
uniform float uOpacity;
uniform float uCycloneStorm;
attribute float aPhase;
attribute float aSpeed;
attribute float aTail;
attribute float aGround;
attribute float aStormPeriod;
attribute float aStormPhase;
attribute float aStormSeed;
varying float vAlpha;
float cycloneRandom(float value){return fract(sin(value*127.1+311.7)*43758.5453);}
void main(){
  float progress=fract(aPhase+uTime*aSpeed);
  float radius=mix(1.16,aGround,progress)+aTail*0.014;
  float stormTime=uTime+aStormPhase;
  float stormCycle=floor(stormTime/aStormPeriod);
  float stormElapsed=mod(stormTime,aStormPeriod);
  float stormDuration=10.0+5.0*cycloneRandom(aStormSeed+stormCycle*31.7+7.9);
  float stormPulse=smoothstep(0.15,1.15,stormElapsed)*
    (1.0-smoothstep(stormDuration-1.25,stormDuration,stormElapsed));
  float angle=uTime*0.011;
  float c=cos(angle),s=sin(angle);
  vec3 p=position*radius;
  p.xz=mat2(c,-s,s,c)*p.xz;
  vAlpha=uOpacity*mix(1.0,0.12,aTail)*(0.55+0.45*sin(aPhase*31.0)*sin(aPhase*31.0))*
    stormPulse*(1.0+0.8*uCycloneStorm);
  gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
}`

const particleFragmentShader = `
varying float vAlpha;
uniform vec3 uColor;
void main(){gl_FragColor=vec4(uColor,vAlpha);}
`

function particleMaterial(vertexShader, color) {
  return new T.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uColor: { value: new T.Color(color) },
    },
    vertexShader,
    fragmentShader: particleFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: T.AdditiveBlending,
  })
}

function gpuWind(rand, count = 520) {
  const positions = [],
    phases = [],
    speeds = [],
    tails = [],
    sides = [],
    widths = [],
    strengths = [],
    lifetimes = [],
    indices = []
  for (let i = 0; i < count; i++) {
    const latitude = ((rand() * 124 - 62) * Math.PI) / 180,
      y = Math.sin(latitude),
      radius = Math.cos(latitude),
      phase = rand() * Math.PI * 2,
      speed = (0.025 + rand() * 0.055) * (rand() > 0.24 ? 1 : -1),
      strength = 0.35 + rand() * 0.65,
      lifetime = rand(),
      width = 0.001 + rand() * 0.00085,
      base = positions.length / 3
    for (let segment = 0; segment <= 3; segment++) {
      for (const side of [-1, 1]) {
        positions.push(0, y, radius)
        phases.push(phase)
        speeds.push(speed)
        tails.push(segment / 3)
        sides.push(side)
        widths.push(width)
        strengths.push(strength)
        lifetimes.push(lifetime)
      }
      if (segment < 3) {
        const n = base + segment * 2
        indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2)
      }
    }
  }
  const geometry = new T.BufferGeometry()
  geometry.setAttribute("position", new T.Float32BufferAttribute(positions, 3))
  geometry.setAttribute("aPhase", new T.Float32BufferAttribute(phases, 1))
  geometry.setAttribute("aSpeed", new T.Float32BufferAttribute(speeds, 1))
  geometry.setAttribute("aTail", new T.Float32BufferAttribute(tails, 1))
  geometry.setAttribute("aSide", new T.Float32BufferAttribute(sides, 1))
  geometry.setAttribute("aWidth", new T.Float32BufferAttribute(widths, 1))
  geometry.setAttribute("aStrength", new T.Float32BufferAttribute(strengths, 1))
  geometry.setAttribute("aLifetime", new T.Float32BufferAttribute(lifetimes, 1))
  geometry.setIndex(indices)
  const material = particleMaterial(windVertexShader, 0xffffff)
  material.uniforms.uCycloneInfluenceRadius = { value: CYCLONE_WIND_INFLUENCE_RADIUS }
  CYCLONE_CENTERS.forEach(([latitude, longitude], site) => {
    const center = new T.Vector3(...direction(latitude, longitude)),
      east = new T.Vector3(Math.cos(longitude * Math.PI / 180), 0,
        -Math.sin(longitude * Math.PI / 180)).normalize(),
      north = new T.Vector3().crossVectors(center, east).normalize()
    material.uniforms[`uCycloneCenter${site}`] = { value: center }
    material.uniforms[`uCycloneEast${site}`] = { value: east }
    material.uniforms[`uCycloneNorth${site}`] = { value: north }
  })
  const mesh = new T.Mesh(geometry, material)
  mesh.material.side = T.DoubleSide
  mesh.frustumCulled = false
  mesh.renderOrder = 5
  return mesh
}

// Short curved strips have real width; WebGL lineWidth is capped at one pixel
// on most desktop GPUs. Each strip follows the sphere in the vertex shader.
const monsoonVertexShader = `
uniform float uTime;
uniform float uOpacity;
attribute vec2 aAnchor;
attribute float aPhase;
attribute float aSpeed;
attribute float aTrail;
attribute float aSide;
attribute float aWidth;
attribute float aStrength;
attribute float aLifetime;
varying float vAlpha;
void main(){
  float travel=fract(aPhase+uTime*aSpeed);
  float lon=aAnchor.x+(travel-0.5)*0.42+aTrail*0.15;
  float envelope=sin(3.14159265*aTrail);
  float lat=aAnchor.y+0.065*sin((lon-aAnchor.x)*2.8+aPhase*6.283)
    +aSide*aWidth*(0.12+0.88*envelope);
  vec3 p=vec3(sin(lon)*cos(lat),sin(lat),cos(lon)*cos(lat))*1.091;
  float event=fract(uTime*0.028+aLifetime);
  float pulse=smoothstep(0.04,0.18,event)*(1.0-smoothstep(0.75,0.92,event));
  vAlpha=uOpacity*aStrength*envelope*pulse;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
}`

function gpuMonsoonBands(rand, count = 120) {
  const positions = [], anchors = [], phases = [], speeds = [],
    trails = [], sides = [], widths = [], strengths = [], lifetimes = [], indices = []
  for (let i = 0; i < count; i++) {
    const [lat, lon] = STORM_CENTERS[i % STORM_CENTERS.length],
      anchorLon = (lon + (rand() - 0.5) * 30) * Math.PI / 180,
      anchorLat = (lat + (rand() - 0.5) * 16) * Math.PI / 180,
      phase = rand(), speed = 0.012 + rand() * 0.02,
      width = 0.00125 + rand() * 0.00225,
      strength = 0.36 + rand() * 0.64,
      lifetime = rand(),
      base = positions.length / 3
    for (let step = 0; step <= 6; step++) {
      for (const side of [-1, 1]) {
        positions.push(0, 0, 0)
        anchors.push(anchorLon, anchorLat)
        phases.push(phase)
        speeds.push(speed)
        trails.push(step / 6)
        sides.push(side)
        widths.push(width)
        strengths.push(strength)
        lifetimes.push(lifetime)
      }
      if (step < 6) {
        const n = base + step * 2
        indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2)
      }
    }
  }
  const geometry = new T.BufferGeometry()
  geometry.setAttribute("position", new T.Float32BufferAttribute(positions, 3))
  for (const [name, values, size] of [
    ["aAnchor", anchors, 2], ["aPhase", phases, 1], ["aSpeed", speeds, 1],
    ["aTrail", trails, 1], ["aSide", sides, 1], ["aWidth", widths, 1],
    ["aStrength", strengths, 1], ["aLifetime", lifetimes, 1],
  ]) geometry.setAttribute(name, new T.Float32BufferAttribute(values, size))
  geometry.setIndex(indices)
  const mesh = new T.Mesh(geometry, particleMaterial(monsoonVertexShader, 0xffffff))
  mesh.material.side = T.DoubleSide
  mesh.frustumCulled = false
  mesh.renderOrder = 5
  return mesh
}

// Fine airflow traces the cloud walls while keeping the eye clear.
const polarWindVertexShader = `
uniform float uTime;
uniform float uOpacity;
attribute vec3 aCenter;
attribute vec3 aEast;
attribute vec3 aNorth;
attribute float aArm;
attribute float aTrail;
attribute float aSide;
attribute float aWidth;
attribute float aCycle;
attribute float aSite;
varying float vAlpha;
varying float vCycloneSite;
float cycloneRandom(float value){return fract(sin(value*127.1+311.7)*43758.5453);}
void main(){
  float cyclePhase=uTime*0.0333333333+aCycle;
  float cycleIndex=floor(cyclePhase);
  float event=fract(cyclePhase);
  float seed=cycleIndex*7.13+aSite*19.19;
  float cycloneSize=1.0+0.5*cycloneRandom(seed+23.6);
  float heading=cycloneRandom(seed)*6.2831853;
  float travel=smoothstep(0.08,0.30,event);
  float distance=(0.07+cycloneRandom(seed+11.7)*0.07)*travel;
  vec3 center=normalize(aCenter+(cos(heading)*aEast+sin(heading)*aNorth)*distance);
  float angle=aArm+aTrail*4.8-uTime*0.26;
  vec3 outward=cos(angle)*aEast+sin(angle)*aNorth;
  float radius=(0.055+aTrail*0.15)*cycloneSize+aSide*aWidth*cycloneSize;
  vec3 p=normalize(center+outward*radius)*1.187;
  float pulse=smoothstep(0.025,0.10,event)*(1.0-smoothstep(0.45,0.525,event));
  vAlpha=uOpacity*pulse*sin(3.14159265*aTrail);
  vCycloneSite=aSite;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
}`

const vortexFragmentShader = `
varying float vAlpha;
varying float vCycloneSite;
uniform vec3 uColor;
uniform float uCycloneStorm0;
uniform float uCycloneStorm1;
void main(){
  vec3 ice=vec3(0.69,0.86,1.0);
  vec3 tropical=vec3(0.82,0.67,0.66);
  float storm=mix(uCycloneStorm0,uCycloneStorm1,step(0.5,vCycloneSite));
  vec3 color=mix(uColor*mix(ice,tropical,vCycloneSite),vec3(0.035,0.052,0.073),storm);
  gl_FragColor=vec4(color,vAlpha*(1.0+0.22*storm));
}`

function gpuPolarVortices(rand) {
  const positions = [], centers = [], easts = [], norths = [],
    arms = [], trails = [], sides = [], widths = [], cycles = [], sites = [], indices = []
  CYCLONE_CENTERS.forEach(([latitude, longitude], site) => {
    const center = new T.Vector3(...direction(latitude, longitude)),
      east = new T.Vector3(Math.cos(longitude * Math.PI / 180), 0,
        -Math.sin(longitude * Math.PI / 180)).normalize(),
      north = new T.Vector3().crossVectors(center, east).normalize(),
      cycle = cycloneCycle(site)
    for (let arm = 0; arm < 3; arm++) {
      const base = positions.length / 3,
        angle = arm * Math.PI * 2 / 3 + (rand() - 0.5) * 0.24,
        width = 0.0011 + rand() * 0.0008
      for (let step = 0; step <= 18; step++) {
        for (const side of [-1, 1]) {
          positions.push(0, 0, 0)
          centers.push(center.x, center.y, center.z)
          easts.push(east.x, east.y, east.z)
          norths.push(north.x, north.y, north.z)
          arms.push(angle)
          trails.push(step / 18)
          sides.push(side)
          widths.push(width)
          cycles.push(cycle)
          sites.push(site)
        }
        if (step < 18) {
          const n = base + step * 2
          indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2)
        }
      }
    }
  })
  const geometry = new T.BufferGeometry()
  geometry.setAttribute("position", new T.Float32BufferAttribute(positions, 3))
  for (const [name, values, size] of [
    ["aCenter", centers, 3], ["aEast", easts, 3], ["aNorth", norths, 3],
    ["aArm", arms, 1], ["aTrail", trails, 1], ["aSide", sides, 1],
    ["aWidth", widths, 1], ["aCycle", cycles, 1], ["aSite", sites, 1],
  ]) geometry.setAttribute(name, new T.Float32BufferAttribute(values, size))
  geometry.setIndex(indices)
  const material = particleMaterial(polarWindVertexShader, 0xffffff)
  material.fragmentShader = vortexFragmentShader
  material.uniforms.uCycloneStorm0 = { value: 0 }
  material.uniforms.uCycloneStorm1 = { value: 0 }
  const mesh = new T.Mesh(geometry, material)
  mesh.material.side = T.DoubleSide
  mesh.frustumCulled = false
  mesh.renderOrder = 5
  return mesh
}

// Hundreds of overlapping cloud lobes form curved, rotating walls around
// each exposed eye. Instancing keeps the extra volume to a single draw call.
const cycloneCloudVertexShader = `
uniform float uTime;
float cycloneRandom(float value){return fract(sin(value*127.1+311.7)*43758.5453);}
attribute vec3 aVortexCenter;
attribute vec3 aVortexEast;
attribute vec3 aVortexNorth;
attribute float aVortexCycle;
attribute float aVortexSite;
varying vec3 vCloudNormal;
varying float vPulse;
varying float vCycloneSite;
void main(){
  vec3 p=position;
  vec3 n=normal;
  #ifdef USE_INSTANCING
    p=(instanceMatrix*vec4(p,1.0)).xyz;
    mat3 basis=mat3(instanceMatrix);
    vec3 scaleSquared=vec3(dot(basis[0],basis[0]),
      dot(basis[1],basis[1]),dot(basis[2],basis[2]));
    n=basis*(n/scaleSquared);
  #endif
  float cyclePhase=uTime*0.0333333333+aVortexCycle;
  float cycleIndex=floor(cyclePhase);
  float event=fract(cyclePhase);
  float seed=cycleIndex*7.13+aVortexSite*19.19;
  float cycloneSize=1.0+0.5*cycloneRandom(seed+23.6);
  float heading=cycloneRandom(seed)*6.2831853;
  float travel=smoothstep(0.08,0.30,event);
  float distance=(0.07+cycloneRandom(seed+11.7)*0.07)*travel;
  vec3 center=normalize(aVortexCenter+(cos(heading)*aVortexEast+
    sin(heading)*aVortexNorth)*distance);
  float angle=-uTime*0.26;
  float c=cos(angle),s=sin(angle);
  vec3 offset=p-aVortexCenter*1.161;
  offset*=cycloneSize;
  p=center*1.161+offset*c+cross(center,offset)*s
    +center*dot(center,offset)*(1.0-c);
  n=n*c+cross(center,n)*s+center*dot(center,n)*(1.0-c);
  vPulse=smoothstep(0.025,0.10,event)*(1.0-smoothstep(0.45,0.525,event));
  vCloudNormal=normalize(normalMatrix*n);
  vCycloneSite=aVortexSite;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
}`

const cycloneCloudFragmentShader = `
uniform float uOpacity;
uniform vec3 uColor;
uniform float uCycloneStorm0;
uniform float uCycloneStorm1;
varying vec3 vCloudNormal;
varying float vPulse;
varying float vCycloneSite;
void main(){
  float light=dot(normalize(vCloudNormal),normalize(vec3(-0.35,0.72,0.58)))*0.5+0.5;
  float band=floor(light*4.0+0.5)/4.0;
  vec3 iceTint=vec3(0.76,0.91,1.04);
  vec3 tropicalTint=vec3(0.96,0.76,0.73);
  vec3 tint=mix(iceTint,tropicalTint,vCycloneSite);
  vec3 color=mix(vec3(0.46,0.62,0.72),uColor*tint,0.48+band*0.48);
  float crystal=pow(max(0.0,dot(normalize(vCloudNormal),
    normalize(vec3(0.22,0.86,0.46)))),18.0);
  color+=(1.0-vCycloneSite)*crystal*vec3(0.07,0.14,0.22);
  float storm=mix(uCycloneStorm0,uCycloneStorm1,step(0.5,vCycloneSite));
  color=mix(color,vec3(0.028,0.042,0.062)*(0.72+band*0.4),storm);
  gl_FragColor=vec4(color,uOpacity*vPulse*(0.68+band*0.27)*(1.0+0.22*storm));
}`

function gpuPolarCloudWalls(rand, baseGeometry) {
  const items = [],
    up = new T.Vector3(0, 1, 0),
    helper = new T.Object3D()
  CYCLONE_CENTERS.forEach(([latitude, longitude], site) => {
    const center = new T.Vector3(...direction(latitude, longitude)),
      east = new T.Vector3(Math.cos(longitude * Math.PI / 180), 0,
        -Math.sin(longitude * Math.PI / 180)).normalize(),
      north = new T.Vector3().crossVectors(center, east).normalize()
    for (let arm = 0; arm < 4; arm++) {
      for (let step = 0; step < 42; step++) {
        if (rand() < 0.09) continue
        const t = (step + rand() * 0.55) / 42,
          angle = arm * Math.PI / 2 + t * Math.PI * 3.05
            + (rand() - 0.5) * 0.18,
          radial = 0.052 + 0.148 * t + (rand() - 0.5) * 0.013,
          v = center.clone()
            .addScaledVector(east, Math.cos(angle) * radial)
            .addScaledVector(north, Math.sin(angle) * radial).normalize(),
          scale = (0.014 + (1 - t) * 0.009 + rand() * 0.009)
        items.push({ center, east, north, v, site, scale })
        if (step % 3 === 0) {
          const lobe = v.clone().addScaledVector(east, (rand() - 0.5) * scale)
            .addScaledVector(north, (rand() - 0.5) * scale).normalize()
          items.push({ center, east, north, v: lobe, site, scale: scale * (0.63 + rand() * 0.27) })
        }
      }
    }
  })
  const geometry = baseGeometry.clone(),
    centers = new Float32Array(items.length * 3),
    easts = new Float32Array(items.length * 3),
    norths = new Float32Array(items.length * 3),
    cycles = new Float32Array(items.length),
    sites = new Float32Array(items.length),
    material = new T.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }, uOpacity: { value: 0 },
        uColor: { value: new T.Color(0xf1f8fa) },
        uCycloneStorm0: { value: 0 },
        uCycloneStorm1: { value: 0 },
      },
      vertexShader: cycloneCloudVertexShader,
      fragmentShader: cycloneCloudFragmentShader,
      transparent: true,
      depthWrite: false,
    }),
    mesh = new T.InstancedMesh(geometry, material, items.length)
  items.forEach(({ center, east, north, v, site, scale }, i) => {
    helper.position.copy(v).multiplyScalar(1.161 + (rand() - 0.5) * 0.012)
    helper.quaternion.setFromUnitVectors(up, v)
    helper.rotateY(rand() * Math.PI * 2)
    helper.scale.set(scale * (1.1 + rand() * 0.55),
      scale * (0.66 + rand() * 0.27), scale * (0.75 + rand() * 0.55))
    helper.updateMatrix()
    mesh.setMatrixAt(i, helper.matrix)
    center.toArray(centers, i * 3)
    east.toArray(easts, i * 3)
    north.toArray(norths, i * 3)
    cycles[i] = cycloneCycle(site)
    sites[i] = site
  })
  geometry.setAttribute("aVortexCenter", new T.InstancedBufferAttribute(centers, 3))
  geometry.setAttribute("aVortexEast", new T.InstancedBufferAttribute(easts, 3))
  geometry.setAttribute("aVortexNorth", new T.InstancedBufferAttribute(norths, 3))
  geometry.setAttribute("aVortexCycle", new T.InstancedBufferAttribute(cycles, 1))
  geometry.setAttribute("aVortexSite", new T.InstancedBufferAttribute(sites, 1))
  mesh.instanceMatrix.needsUpdate = true
  mesh.frustumCulled = false
  mesh.renderOrder = 4
  return mesh
}

const lightningVertexShader = `
uniform float uTime;
uniform float uOpacity;
uniform float uCycloneStorm;
attribute float aPhase;
attribute float aRate;
attribute float aProgress;
attribute float aStormPeriod;
attribute float aStormPhase;
attribute float aStormSeed;
varying float vAlpha;
float cycloneRandom(float value){return fract(sin(value*127.1+311.7)*43758.5453);}
void main(){
  float angle=uTime*0.011;
  float c=cos(angle),s=sin(angle);
  vec3 p=position;
  p.xz=mat2(c,-s,s,c)*p.xz;
  float flash=pow(max(0.0,sin(uTime*aRate+aPhase)),28.0);
  float stormTime=uTime+aStormPhase;
  float stormCycle=floor(stormTime/aStormPeriod);
  float stormElapsed=mod(stormTime,aStormPeriod);
  float stormDuration=10.0+5.0*cycloneRandom(aStormSeed+stormCycle*31.7+7.9);
  float stormPulse=smoothstep(0.15,1.15,stormElapsed)*
    (1.0-smoothstep(stormDuration-1.25,stormDuration,stormElapsed));
  vAlpha=uOpacity*flash*(1.0-0.55*aProgress)*stormPulse*(1.0+0.8*uCycloneStorm);
  gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
}`

function gpuLightning(rand, rainItems, count = 25) {
  const positions = [], phases = [], rates = [], progresses = [],
    stormPeriods = [], stormPhases = [], stormSeeds = [], indices = []
  for (let i = 0; i < count; i++) {
    const stormSite = i % STORM_CENTERS.length,
      candidates = rainItems.filter((item) => item.stormSite === stormSite),
      stormAnchor = candidates[(i * 7) % candidates.length],
      schedule = STORM_SCHEDULES[stormSite],
      center = stormAnchor.v,
      axis = new T.Vector3(0, 1, 0).cross(center).normalize(),
      across = center.clone().cross(axis).normalize(),
      ground = 1 + Math.max(0, sample(center.x, center.y, center.z).h) + 0.005,
      phase = rand() * Math.PI * 2,
      rate = 1.2 + rand() * 1.1,
      base = positions.length / 3
    for (let j = 0; j <= 10; j++) {
      const progress = j / 10,
        radius = 1.164 * (1 - progress) + ground * progress,
        jitter = j === 0 || j === 10 ? 0 : 0.006,
        point = center.clone()
          .addScaledVector(axis, (rand() - 0.5) * jitter)
          .addScaledVector(across, (rand() - 0.5) * jitter).normalize().multiplyScalar(radius),
        halfWidth = (0.0015 + 0.0013 * (1 - progress))
      for (const sign of [-1, 1]) {
        const edge = point.clone().addScaledVector(axis, halfWidth * sign)
        positions.push(edge.x, edge.y, edge.z)
        phases.push(phase)
        rates.push(rate)
        progresses.push(progress)
        stormPeriods.push(schedule.period)
        stormPhases.push(schedule.phase)
        stormSeeds.push(schedule.seed)
      }
      if (j < 10) {
        const n = base + 2 * j
        indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2)
      }
    }
  }
  const geometry = new T.BufferGeometry()
  geometry.setAttribute("position", new T.Float32BufferAttribute(positions, 3))
  geometry.setAttribute("aPhase", new T.Float32BufferAttribute(phases, 1))
  geometry.setAttribute("aRate", new T.Float32BufferAttribute(rates, 1))
  geometry.setAttribute("aProgress", new T.Float32BufferAttribute(progresses, 1))
  geometry.setAttribute("aStormPeriod", new T.Float32BufferAttribute(stormPeriods, 1))
  geometry.setAttribute("aStormPhase", new T.Float32BufferAttribute(stormPhases, 1))
  geometry.setAttribute("aStormSeed", new T.Float32BufferAttribute(stormSeeds, 1))
  geometry.setIndex(indices)
  const material = particleMaterial(lightningVertexShader, 0xe2ffff)
  material.uniforms.uCycloneStorm = { value: 0 }
  const mesh = new T.Mesh(geometry, material)
  mesh.material.side = T.DoubleSide
  mesh.frustumCulled = false
  mesh.renderOrder = 7
  return mesh
}

function gpuRain(rand, rainItems, count = 720) {
  const positions = [],
    phases = [],
    speeds = [],
    tails = [],
    grounds = [], stormPeriods = [], stormPhases = [], stormSeeds = []
  for (let i = 0; i < count; i++) {
    const item = rainItems[i % rainItems.length],
      jitter = new T.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5)
        .multiplyScalar(0.038)
        .add(item.v)
        .normalize(),
      phase = rand(),
      speed = 0.34 + rand() * 0.52,
      ground = 1 + Math.max(0, sample(jitter.x, jitter.y, jitter.z).h) + 0.004,
      schedule = STORM_SCHEDULES[item.stormSite]
    for (const tail of [0, 1]) {
      positions.push(jitter.x, jitter.y, jitter.z)
      phases.push(phase)
      speeds.push(speed)
      tails.push(tail)
      grounds.push(ground)
      stormPeriods.push(schedule.period)
      stormPhases.push(schedule.phase)
      stormSeeds.push(schedule.seed)
    }
  }
  const geometry = new T.BufferGeometry()
  geometry.setAttribute("position", new T.Float32BufferAttribute(positions, 3))
  geometry.setAttribute("aPhase", new T.Float32BufferAttribute(phases, 1))
  geometry.setAttribute("aSpeed", new T.Float32BufferAttribute(speeds, 1))
  geometry.setAttribute("aTail", new T.Float32BufferAttribute(tails, 1))
  geometry.setAttribute("aGround", new T.Float32BufferAttribute(grounds, 1))
  geometry.setAttribute("aStormPeriod", new T.Float32BufferAttribute(stormPeriods, 1))
  geometry.setAttribute("aStormPhase", new T.Float32BufferAttribute(stormPhases, 1))
  geometry.setAttribute("aStormSeed", new T.Float32BufferAttribute(stormSeeds, 1))
  const material = particleMaterial(rainVertexShader, 0xa8dff7)
  material.uniforms.uCycloneStorm = { value: 0 }
  const lines = new T.LineSegments(geometry, material)
  lines.frustumCulled = false
  lines.renderOrder = 4
  return lines
}

export function addClimate(root) {
  const rand = seeded(8217),
    up = new T.Vector3(0, 1, 0),
    helper = new T.Object3D(),
    cloudGeometry = new T.SphereGeometry(1, 12, 8),
    cloudItems = [],
    rainItems = [],
    stormDirections = STORM_CENTERS.map(([latitude, longitude]) =>
      new T.Vector3(...direction(latitude, longitude))),
    cycloneFrames = CYCLONE_CENTERS.map(([latitude, longitude]) => {
      const center = new T.Vector3(...direction(latitude, longitude)),
        east = new T.Vector3(Math.cos(longitude * Math.PI / 180), 0,
          -Math.sin(longitude * Math.PI / 180)).normalize(),
        north = new T.Vector3().crossVectors(center, east).normalize()
      return { center, east, north }
    })

  function cycloneStormLevels(time) {
    const levels = [0, 0]
    cycloneFrames.forEach(({ center, east, north }, site) => {
      const cyclone = cycloneState(time, site)
      if (cyclone.pulse <= 0) return
      const movingCenter = center.clone()
        .addScaledVector(east, Math.cos(cyclone.heading) * cyclone.distance)
        .addScaledVector(north, Math.sin(cyclone.heading) * cyclone.distance)
        .normalize()
      STORM_SCHEDULES.forEach((_, stormSite) => {
        const storm = stormState(time, stormSite)
        if (storm.pulse <= 0) return
        const movingStormCenter = stormDirections[stormSite].clone()
          .applyAxisAngle(up, -time * 0.011)
        const reach = CYCLONE_WIND_INFLUENCE_RADIUS * cyclone.size + 0.18 * storm.size,
          separation = movingCenter.angleTo(movingStormCenter),
          proximity = 1 - smoothPulse(reach * 0.55, reach, separation),
          overlap = cyclone.pulse * storm.pulse * proximity
        levels[site] = Math.max(levels[site], overlap)
      })
    })
    return levels
  }

  // Distinct large, medium, and small banks; rounded lobes vary in height
  // as well as footprint so they read as cloud volumes from the horizon.
  const sizeBands = [
    { count: 10, min: 0.105, range: 0.052, lobes: 6 },
    { count: 20, min: 0.063, range: 0.037, lobes: 3 },
    { count: 38, min: 0.024, range: 0.032, lobes: 1 },
  ]
  function addCloudCluster(items, v, scale, lobes, metadata = {}) {
    items.push({ v, scale, lift: 0, ...metadata })
    const tangent = new T.Vector3().crossVectors(v, up)
    if (tangent.lengthSq() < 0.01) tangent.set(1, 0, 0)
    tangent.normalize()
    const across = new T.Vector3().crossVectors(v, tangent).normalize()
    const offset = rand() * Math.PI * 2
    for (let j = 0; j < lobes; j++) {
      const angle = offset + j * Math.PI * 2 / lobes + (rand() - 0.5) * 0.5,
        spread = scale * (0.42 + rand() * 0.42),
        lobe = v.clone()
          .addScaledVector(tangent, Math.cos(angle) * spread)
          .addScaledVector(across, Math.sin(angle) * spread * (0.65 + rand() * 0.5))
          .normalize()
      items.push({
        v: lobe,
        scale: scale * (0.43 + rand() * 0.39),
        lift: scale * (rand() - 0.36) * 0.19,
        ...metadata,
      })
    }
  }
  let band = 0, inBand = 0
  for (let attempt = 0; attempt < 900 && band < sizeBands.length; attempt++) {
    const y = rand() * 1.72 - 0.86,
      longitude = rand() * Math.PI * 2,
      radius = Math.sqrt(1 - y * y),
      v = new T.Vector3(
        Math.sin(longitude) * radius,
        y,
        Math.cos(longitude) * radius,
      ),
      s = sample(v.x, v.y, v.z)
    if (s.h > 0 && s.moisture < 0.48 && rand() > 0.18) continue
    const size = sizeBands[band]
    const scale = size.min + rand() * size.range
    addCloudCluster(cloudItems, v, scale, size.lobes)
    if (++inBand >= size.count) { band++; inBand = 0 }
  }

  // Five separated storm cells share their own schedule with local rain and
  // lightning. Their activity and size vary independently on every cycle.
  const stormCloudItems = []
  for (let stormSite = 0; stormSite < STORM_CENTERS.length; stormSite++) {
    const [lat, lon] = STORM_CENTERS[stormSite],
      schedule = STORM_SCHEDULES[stormSite]
    const center = new T.Vector3(...direction(lat, lon))
    const metadata = {
      stormCenter: center,
      stormSite,
      stormPeriod: schedule.period,
      stormPhase: schedule.phase,
      stormSeed: schedule.seed,
    }
    for (let i = 0; i < 26; i++) {
      const v = center.clone().add(new T.Vector3(
        rand() - 0.5, rand() - 0.5, rand() - 0.5,
      ).multiplyScalar(i < 6 ? 0.075 : 0.18)).normalize()
      const terrain = sample(v.x, v.y, v.z)
      if (terrain.desert > 0.24 || terrain.polar > 0.35) continue
      const scale = i < 6 ? 0.082 + rand() * 0.038 : 0.036 + rand() * 0.052
      addCloudCluster(stormCloudItems, v, scale,
        i < 6 ? 2 : i % 3 === 0 ? 1 : 0, metadata)
      if (i % 2 === 0) rainItems.push({ v, stormSite })
    }
    if (!rainItems.some((item) => item.stormSite === stormSite))
      rainItems.push({ v: center, stormSite })
  }

  function cloudMesh(items, material, altitude, stormClouds = false) {
    const geometry = cloudGeometry.clone()
    if (stormClouds) {
      const centers = new Float32Array(items.length * 3),
        periods = new Float32Array(items.length),
        phases = new Float32Array(items.length),
        seeds = new Float32Array(items.length)
      items.forEach(({ stormCenter, stormPeriod, stormPhase, stormSeed }, i) => {
        stormCenter.toArray(centers, i * 3)
        periods[i] = stormPeriod
        phases[i] = stormPhase
        seeds[i] = stormSeed
      })
      geometry.setAttribute("aStormCenter", new T.InstancedBufferAttribute(centers, 3))
      geometry.setAttribute("aStormPeriod", new T.InstancedBufferAttribute(periods, 1))
      geometry.setAttribute("aStormPhase", new T.InstancedBufferAttribute(phases, 1))
      geometry.setAttribute("aStormSeed", new T.InstancedBufferAttribute(seeds, 1))
    }
    const mesh = new T.InstancedMesh(geometry, material, items.length)
    items.forEach(({ v, scale, lift }, i) => {
      helper.position.copy(v).multiplyScalar(altitude + lift)
      helper.quaternion.setFromUnitVectors(up, v)
      helper.rotateY(rand() * Math.PI * 2)
      helper.scale.set(
        scale * (1.15 + rand() * 0.55),
        Math.min(0.039, scale * (0.32 + rand() * 0.14)),
        scale * (0.78 + rand() * 0.52),
      )
      helper.updateMatrix()
      mesh.setMatrixAt(i, helper.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
    if (stormClouds) mesh.frustumCulled = false
    mesh.renderOrder = 3
    return mesh
  }

  const clouds = cloudMesh(cloudItems, cloudMaterial(0xf1f7f5, 0.008), 1.095),
    rainClouds = cloudMesh(stormCloudItems, cloudMaterial(0x374a59, 0.011, true), 1.136, true),
    wind = gpuWind(rand),
    monsoon = gpuMonsoonBands(rand),
    vortices = gpuPolarVortices(rand),
    cycloneClouds = gpuPolarCloudWalls(rand, cloudGeometry),
    rain = gpuRain(rand, rainItems),
    lightning = gpuLightning(rand, rainItems)
  rainClouds.renderOrder = 4
  rain.renderOrder = 6
  root.add(clouds, rainClouds, cycloneClouds, wind, monsoon, vortices, rain, lightning)

  return {
    cloudCount: cloudItems.length,
    cloudSizeCounts: sizeBands.map(({ count }) => count),
    windParticleCount: wind.geometry.attributes.position.count / 8,
    rainParticleCount: rain.geometry.attributes.position.count / 2,
    stormCloudCount: stormCloudItems.length,
    stormCenters: STORM_CENTERS,
    windRibbonCount: monsoon.geometry.attributes.aAnchor.count / 14,
    cycloneCount: CYCLONE_CENTERS.length,
    cycloneCenters: CYCLONE_CENTERS,
    stormCenterCount: STORM_CENTERS.length,
    stormSchedules: STORM_SCHEDULES,
    polarCloudCount: cycloneClouds.count,
    lightningCount: lightning.geometry.attributes.aPhase.count / 22,
    update(weights, now, reduced) {
      const time = reduced ? 0 : now * 0.001
      const cycloneStorm = cycloneStormLevels(time), stormIntensity = Math.max(...cycloneStorm)
      clouds.material.uniforms.uTime.value = time
      clouds.material.uniforms.uOpacity.value = weights.clouds * 0.43
      rainClouds.material.uniforms.uTime.value = time
      rainClouds.material.uniforms.uOpacity.value = weights.weather * 0.56
      cycloneClouds.visible = weights.weather > 0.01
      cycloneClouds.material.uniforms.uTime.value = time
      cycloneClouds.material.uniforms.uOpacity.value = weights.weather * 0.52
      cycloneClouds.material.uniforms.uCycloneStorm0.value = cycloneStorm[0]
      cycloneClouds.material.uniforms.uCycloneStorm1.value = cycloneStorm[1]
      wind.visible = weights.weather > 0.01
      wind.material.uniforms.uTime.value = time
      wind.material.uniforms.uOpacity.value = weights.weather * 0.48
      monsoon.visible = weights.weather > 0.01
      monsoon.material.uniforms.uTime.value = time
      monsoon.material.uniforms.uOpacity.value = weights.weather * 0.39
      vortices.visible = weights.weather > 0.01
      vortices.material.uniforms.uTime.value = time
      vortices.material.uniforms.uOpacity.value = weights.weather * 0.16
      vortices.material.uniforms.uCycloneStorm0.value = cycloneStorm[0]
      vortices.material.uniforms.uCycloneStorm1.value = cycloneStorm[1]
      rain.visible = weights.weather > 0.01
      rain.material.uniforms.uTime.value = time
      rain.material.uniforms.uOpacity.value = weights.weather * 0.46
      rain.material.uniforms.uCycloneStorm.value = stormIntensity
      lightning.visible = weights.weather > 0.01 && !reduced
      lightning.material.uniforms.uTime.value = time
      lightning.material.uniforms.uOpacity.value = weights.weather * 0.92
      lightning.material.uniforms.uCycloneStorm.value = stormIntensity
    },
  }
}
