import * as T from "three"
import { sample, seeded } from "./field.js"

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
  float radius=mix(1.078,aGround,progress)+aTail*0.014;
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
    if (s.moisture > 0.64 && s.h < 0.04 && rainItems.length < 18)
      rainItems.push({ v: v.clone(), scale: 0.03 + rand() * 0.025 })
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
    rainClouds = cloudMesh(rainItems, cloudMaterial(0x70899c, 0.011), 1.047),
    wind = gpuWind(rand),
    rain = gpuRain(rand, rainItems)
  root.add(clouds, rainClouds, wind, rain)

  return {
    cloudCount: cloudItems.length,
    cloudSizeCounts: sizeBands.map(({ count }) => count),
    windParticleCount: wind.geometry.attributes.position.count / 2,
    rainParticleCount: rain.geometry.attributes.position.count / 2,
    update(weights, now, reduced) {
      const time = reduced ? 0 : now * 0.001
      clouds.material.uniforms.uTime.value = time
      clouds.material.uniforms.uOpacity.value = weights.clouds * 0.34
      rainClouds.material.uniforms.uTime.value = time
      rainClouds.material.uniforms.uOpacity.value = weights.weather * 0.3
      wind.visible = weights.weather > 0.01
      wind.material.uniforms.uTime.value = time
      wind.material.uniforms.uOpacity.value = weights.weather * 0.34
      rain.visible = weights.weather > 0.01
      rain.material.uniforms.uTime.value = time
      rain.material.uniforms.uOpacity.value = weights.weather * 0.46
    },
  }
}
