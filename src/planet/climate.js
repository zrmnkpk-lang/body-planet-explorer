import * as T from "three"
import { direction, sample, seeded } from "./field.js"

const STORM_CENTERS = [[15, 12], [-25, 39], [5, 160]]

const cloudVertexShader = `
uniform float uTime;
uniform float uDrift;
varying vec3 vCloudNormal;
varying vec3 vCloudPosition;
void main(){
  vec4 localPosition=vec4(position,1.0);
  vec3 localNormal=normal;
  #ifdef USE_INSTANCING
    localPosition=instanceMatrix*localPosition;
    localNormal=mat3(instanceMatrix)*localNormal;
  #endif
  float angle=uTime*uDrift;
  float c=cos(angle),s=sin(angle);
  mat2 rotation=mat2(c,-s,s,c);
  localPosition.xz=rotation*localPosition.xz;
  localNormal.xz=rotation*localNormal.xz;
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
void main(){
  vec3 normalDirection=normalize(vCloudNormal);
  float light=dot(normalDirection,normalize(vec3(-0.35,0.72,0.58)))*0.5+0.5;
  float grain=sin(vCloudPosition.x*28.0+uTime*0.16)*sin(vCloudPosition.z*22.0-uTime*0.12);
  float bands=floor((light+grain*0.04)*3.0+0.5)/3.0;
  float rim=pow(1.0-abs(normalDirection.z),2.2);
  vec3 color=uColor*(0.9+bands*0.16)+vec3(0.04,0.08,0.09)*rim;
  float alpha=uOpacity*(0.82+bands*0.16+rim*0.1);
  gl_FragColor=vec4(color,alpha);
}`

function cloudMaterial(color, drift) {
  return new T.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDrift: { value: drift },
      uOpacity: { value: 0 },
      uColor: { value: new T.Color(color) },
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
attribute float aPhase;
attribute float aSpeed;
attribute float aTail;
attribute float aStrength;
varying float vAlpha;
void main(){
  float angle=aPhase+uTime*aSpeed-aTail*(0.022+aSpeed*0.16);
  float c=cos(angle),s=sin(angle);
  vec3 p=position;
  p.xz=mat2(c,-s,s,c)*p.xz;
  p.y+=sin(angle*3.0+position.y*11.0)*0.008*(1.0-abs(position.y));
  p=normalize(p)*(1.058+0.004*sin(angle*2.0+position.y*17.0));
  vAlpha=uOpacity*aStrength*mix(1.0,0.18,aTail);
  gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
}`

const rainVertexShader = `
uniform float uTime;
uniform float uOpacity;
attribute float aPhase;
attribute float aSpeed;
attribute float aTail;
attribute float aGround;
varying float vAlpha;
void main(){
  float progress=fract(aPhase+uTime*aSpeed);
  float radius=mix(1.124,aGround,progress)+aTail*0.014;
  float angle=uTime*0.011;
  float c=cos(angle),s=sin(angle);
  vec3 p=position*radius;
  p.xz=mat2(c,-s,s,c)*p.xz;
  vAlpha=uOpacity*mix(1.0,0.12,aTail)*(0.55+0.45*sin(aPhase*31.0)*sin(aPhase*31.0));
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

function gpuWind(rand, count = 1600) {
  const positions = [],
    phases = [],
    speeds = [],
    tails = [],
    strengths = []
  for (let i = 0; i < count; i++) {
    const latitude = ((rand() * 124 - 62) * Math.PI) / 180,
      y = Math.sin(latitude),
      radius = Math.cos(latitude),
      phase = rand() * Math.PI * 2,
      speed = (0.025 + rand() * 0.055) * (rand() > 0.24 ? 1 : -1),
      strength = 0.35 + rand() * 0.65
    for (const tail of [0, 1]) {
      positions.push(0, y, radius)
      phases.push(phase)
      speeds.push(speed)
      tails.push(tail)
      strengths.push(strength)
    }
  }
  const geometry = new T.BufferGeometry()
  geometry.setAttribute("position", new T.Float32BufferAttribute(positions, 3))
  geometry.setAttribute("aPhase", new T.Float32BufferAttribute(phases, 1))
  geometry.setAttribute("aSpeed", new T.Float32BufferAttribute(speeds, 1))
  geometry.setAttribute("aTail", new T.Float32BufferAttribute(tails, 1))
  geometry.setAttribute("aStrength", new T.Float32BufferAttribute(strengths, 1))
  const material = particleMaterial(windVertexShader, 0xb9eee9),
    lines = new T.LineSegments(geometry, material)
  lines.frustumCulled = false
  lines.renderOrder = 4
  return lines
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
varying float vAlpha;
void main(){
  float travel=fract(aPhase+uTime*aSpeed);
  float lon=aAnchor.x+(travel-0.5)*1.12+aTrail*0.30;
  float envelope=sin(3.14159265*aTrail);
  float lat=aAnchor.y+0.065*sin((lon-aAnchor.x)*2.8+aPhase*6.283)
    +aSide*aWidth*(0.12+0.88*envelope);
  vec3 p=vec3(sin(lon)*cos(lat),sin(lat),cos(lon)*cos(lat))*1.091;
  vAlpha=uOpacity*aStrength*envelope
    *smoothstep(0.02,0.18,travel)*(1.0-smoothstep(0.82,0.98,travel));
  gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
}`

function gpuMonsoonBands(rand, count = 330) {
  const positions = [], anchors = [], phases = [], speeds = [],
    trails = [], sides = [], widths = [], strengths = [], indices = []
  for (let i = 0; i < count; i++) {
    const [lat, lon] = STORM_CENTERS[i % STORM_CENTERS.length],
      anchorLon = (lon + (rand() - 0.5) * 64) * Math.PI / 180,
      anchorLat = (lat + (rand() - 0.5) * 27) * Math.PI / 180,
      phase = rand(), speed = 0.012 + rand() * 0.02,
      width = 0.0025 + rand() * 0.0045,
      strength = 0.36 + rand() * 0.64,
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
    ["aStrength", strengths, 1],
  ]) geometry.setAttribute(name, new T.Float32BufferAttribute(values, size))
  geometry.setIndex(indices)
  const mesh = new T.Mesh(geometry, particleMaterial(monsoonVertexShader, 0xa2eee5))
  mesh.material.side = T.DoubleSide
  mesh.frustumCulled = false
  mesh.renderOrder = 5
  return mesh
}

const lightningVertexShader = `
uniform float uTime;
uniform float uOpacity;
attribute float aPhase;
attribute float aRate;
attribute float aProgress;
varying float vAlpha;
void main(){
  float angle=uTime*0.011;
  float c=cos(angle),s=sin(angle);
  vec3 p=position;
  p.xz=mat2(c,-s,s,c)*p.xz;
  float flash=pow(max(0.0,sin(uTime*aRate+aPhase)),28.0);
  vAlpha=uOpacity*flash*(1.0-0.55*aProgress);
  gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
}`

function gpuLightning(rand, rainItems, count = 24) {
  const positions = [], phases = [], rates = [], progresses = [], indices = []
  for (let i = 0; i < count; i++) {
    const center = rainItems[(i * 7) % rainItems.length].v,
      axis = new T.Vector3(0, 1, 0).cross(center).normalize(),
      across = center.clone().cross(axis).normalize(),
      ground = 1 + Math.max(0, sample(center.x, center.y, center.z).h) + 0.005,
      phase = rand() * Math.PI * 2,
      rate = 1.2 + rand() * 1.1,
      base = positions.length / 3
    for (let j = 0; j <= 7; j++) {
      const progress = j / 7,
        radius = 1.116 * (1 - progress) + ground * progress,
        jitter = j === 0 || j === 7 ? 0 : 0.0038,
        point = center.clone()
          .addScaledVector(axis, (rand() - 0.5) * jitter)
          .addScaledVector(across, (rand() - 0.5) * jitter).normalize().multiplyScalar(radius),
        halfWidth = (0.0009 + 0.0007 * (1 - progress))
      for (const sign of [-1, 1]) {
        const edge = point.clone().addScaledVector(axis, halfWidth * sign)
        positions.push(edge.x, edge.y, edge.z)
        phases.push(phase)
        rates.push(rate)
        progresses.push(progress)
      }
      if (j < 7) {
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
  geometry.setIndex(indices)
  const mesh = new T.Mesh(geometry, particleMaterial(lightningVertexShader, 0xe2ffff))
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
    grounds = []
  for (let i = 0; i < count; i++) {
    const item = rainItems[i % rainItems.length],
      jitter = new T.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5)
        .multiplyScalar(0.038)
        .add(item.v)
        .normalize(),
      phase = rand(),
      speed = 0.34 + rand() * 0.52,
      ground = 1 + Math.max(0, sample(jitter.x, jitter.y, jitter.z).h) + 0.004
    for (const tail of [0, 1]) {
      positions.push(jitter.x, jitter.y, jitter.z)
      phases.push(phase)
      speeds.push(speed)
      tails.push(tail)
      grounds.push(ground)
    }
  }
  const geometry = new T.BufferGeometry()
  geometry.setAttribute("position", new T.Float32BufferAttribute(positions, 3))
  geometry.setAttribute("aPhase", new T.Float32BufferAttribute(phases, 1))
  geometry.setAttribute("aSpeed", new T.Float32BufferAttribute(speeds, 1))
  geometry.setAttribute("aTail", new T.Float32BufferAttribute(tails, 1))
  geometry.setAttribute("aGround", new T.Float32BufferAttribute(grounds, 1))
  const material = particleMaterial(rainVertexShader, 0x70d3dd),
    lines = new T.LineSegments(geometry, material)
  lines.frustumCulled = false
  lines.renderOrder = 4
  return lines
}

export function addClimate(root) {
  const rand = seeded(8217),
    up = new T.Vector3(0, 1, 0),
    helper = new T.Object3D(),
    cloudGeometry = new T.SphereGeometry(1, 12, 7),
    cloudItems = [],
    rainItems = []

  // Four cloud sizes, with overlapping lobes around the largest white banks.
  const sizeBands = [
    { count: 10, min: 0.105, range: 0.052, lobes: 3 },
    { count: 16, min: 0.066, range: 0.032, lobes: 1 },
    { count: 22, min: 0.038, range: 0.022, lobes: 0 },
    { count: 30, min: 0.021, range: 0.016, lobes: 0 },
  ]
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
    cloudItems.push({ v, scale })
    if (size.lobes) {
      const tangent = new T.Vector3().crossVectors(v, up).normalize()
      if (tangent.lengthSq() < 0.01) tangent.set(1, 0, 0)
      const across = new T.Vector3().crossVectors(v, tangent).normalize()
      for (let j = 0; j < size.lobes; j++) {
        const angle = j * Math.PI * 2 / size.lobes + rand() * 0.3
        const lobe = v.clone()
          .addScaledVector(tangent, Math.cos(angle) * scale * 0.72)
          .addScaledVector(across, Math.sin(angle) * scale * 0.58)
          .normalize()
        cloudItems.push({ v: lobe, scale: scale * (0.58 + rand() * 0.16) })
      }
    }
    if (++inBand >= size.count) { band++; inBand = 0 }
  }

  // Three wet mainland and island systems share the dark banks, rain, and
  // electrical activity. Keep the dry continents free of storm coverage.
  const stormCloudItems = []
  for (const [lat, lon] of STORM_CENTERS) {
    const center = new T.Vector3(...direction(lat, lon))
    for (let i = 0; i < 24; i++) {
      const v = center.clone().add(new T.Vector3(
        rand() - 0.5, rand() - 0.5, rand() - 0.5,
      ).multiplyScalar(i < 4 ? 0.07 : 0.18)).normalize()
      const terrain = sample(v.x, v.y, v.z)
      if (terrain.desert > 0.24 || terrain.polar > 0.35) continue
      const scale = i < 4 ? 0.076 + rand() * 0.035 : 0.032 + rand() * 0.048
      stormCloudItems.push({ v, scale })
      if (i % 2 === 0) rainItems.push({ v })
    }
  }

  function cloudMesh(items, material, altitude) {
    const mesh = new T.InstancedMesh(cloudGeometry, material, items.length)
    items.forEach(({ v, scale }, i) => {
      helper.position.copy(v).multiplyScalar(altitude)
      helper.quaternion.setFromUnitVectors(up, v)
      helper.rotateY(rand() * Math.PI * 2)
      helper.scale.set(scale * (1.4 + rand() * 0.55), scale * 0.11, scale)
      helper.updateMatrix()
      mesh.setMatrixAt(i, helper.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
    mesh.renderOrder = 3
    return mesh
  }

  const clouds = cloudMesh(cloudItems, cloudMaterial(0xf1f7f5, 0.008), 1.075),
    rainClouds = cloudMesh(stormCloudItems, cloudMaterial(0x4d6373, 0.011), 1.116),
    wind = gpuWind(rand),
    monsoon = gpuMonsoonBands(rand),
    rain = gpuRain(rand, rainItems),
    lightning = gpuLightning(rand, rainItems)
  rainClouds.renderOrder = 4
  rain.renderOrder = 6
  root.add(clouds, rainClouds, wind, monsoon, rain, lightning)

  return {
    cloudCount: cloudItems.length,
    cloudSizeCounts: sizeBands.map(({ count }) => count),
    windParticleCount: wind.geometry.attributes.position.count / 2,
    rainParticleCount: rain.geometry.attributes.position.count / 2,
    stormCloudCount: stormCloudItems.length,
    stormCenters: STORM_CENTERS,
    windRibbonCount: monsoon.geometry.attributes.aAnchor.count / 14,
    lightningCount: lightning.geometry.attributes.aPhase.count / 16,
    update(weights, now, reduced) {
      const time = reduced ? 0 : now * 0.001
      clouds.material.uniforms.uTime.value = time
      clouds.material.uniforms.uOpacity.value = weights.clouds * 0.34
      rainClouds.material.uniforms.uTime.value = time
      rainClouds.material.uniforms.uOpacity.value = weights.weather * 0.64
      wind.visible = weights.weather > 0.01
      wind.material.uniforms.uTime.value = time
      wind.material.uniforms.uOpacity.value = weights.weather * 0.42
      monsoon.visible = weights.weather > 0.01
      monsoon.material.uniforms.uTime.value = time
      monsoon.material.uniforms.uOpacity.value = weights.weather * 0.57
      rain.visible = weights.weather > 0.01
      rain.material.uniforms.uTime.value = time
      rain.material.uniforms.uOpacity.value = weights.weather * 0.46
      lightning.visible = weights.weather > 0.01 && !reduced
      lightning.material.uniforms.uTime.value = time
      lightning.material.uniforms.uOpacity.value = weights.weather * 0.92
    },
  }
}
