import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { LANDMARKS, TERRAIN_TYPES } from "./landmarks.js";
import "./styles.css";

const $ = (selector) => document.querySelector(selector);
const host = $("#scene");
const landmarkLayer = $("#landmark-layer");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = false;
host.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x10131f, 0.025);

const camera = new THREE.PerspectiveCamera(37, 1, 0.015, 50);
camera.position.set(0, 0.12, innerWidth < 720 ? 4.4 : 3.65);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.enableDamping = true;
controls.dampingFactor = 0.065;
controls.rotateSpeed = 0.48;
controls.zoomSpeed = 0.82;
controls.minDistance = 1.28;
controls.maxDistance = 5.3;

scene.add(new THREE.HemisphereLight(0xc8d9e8, 0x20243a, 2.25));
const key = new THREE.DirectionalLight(0xffddbd, 2.7);
key.position.set(-3.5, 5, 4);
scene.add(key);
const rim = new THREE.DirectionalLight(0x65bac5, 1.15);
rim.position.set(4, 1, -4);
scene.add(rim);

const planet = new THREE.Group();
scene.add(planet);

const clickable = [];
const lod1 = [];
const lod2 = [];
const materialCache = new Map();
let selectedZone = null;
let cameraDestination = null;
let seed = 6103;

function random() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}

function spherePoint(latitude, longitude, radius = 1) {
  const lat = THREE.MathUtils.degToRad(latitude);
  const lon = THREE.MathUtils.degToRad(longitude);
  return new THREE.Vector3(
    Math.sin(lon) * Math.cos(lat) * radius,
    Math.sin(lat) * radius,
    Math.cos(lon) * Math.cos(lat) * radius,
  );
}

// Four grayscale steps preserve the intended color while producing graphic cel shading.
const rampData = new Uint8Array([
  72, 72, 72, 255,
  126, 126, 126, 255,
  188, 188, 188, 255,
  238, 238, 238, 255,
]);
const toneRamp = new THREE.DataTexture(rampData, 4, 1, THREE.RGBAFormat);
toneRamp.needsUpdate = true;
toneRamp.minFilter = toneRamp.magFilter = THREE.NearestFilter;

function toonMaterial(color, { transparent = false, opacity = 1 } = {}) {
  const keyName = `${color}-${transparent}-${opacity}`;
  if (!materialCache.has(keyName)) {
    materialCache.set(
      keyName,
      new THREE.MeshToonMaterial({
        color,
        gradientMap: toneRamp,
        transparent,
        opacity,
      }),
    );
  }
  return materialCache.get(keyName);
}

function addMesh(geometry, color, { parent = planet, zone = null, lod = 0 } = {}) {
  const mesh = new THREE.Mesh(geometry, toonMaterial(color));
  if (lod > 0) {
    mesh.material = mesh.material.clone();
    mesh.material.transparent = true;
    mesh.material.opacity = 0;
    mesh.material.depthWrite = false;
  }
  parent.add(mesh);
  if (zone) {
    mesh.userData.zone = zone;
    clickable.push(mesh);
  }
  if (lod === 1) lod1.push(mesh);
  if (lod === 2) lod2.push(mesh);
  return mesh;
}

function addEdges(mesh, opacity = 0.45, threshold = 25) {
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry, threshold),
    new THREE.LineBasicMaterial({
      color: 0x172133,
      transparent: true,
      opacity,
    }),
  );
  mesh.add(edges);
  return edges;
}

function placeRadially(object, latitude, longitude, radius) {
  const normal = spherePoint(latitude, longitude).normalize();
  object.position.copy(normal.multiplyScalar(radius));
  object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal.normalize());
  return object;
}

// Builds a curved, irregular continental shelf with a real side wall.
function terrainPatch({
  latitude,
  longitude,
  radiusX,
  radiusY,
  elevation,
  color,
  zone,
  phase = 0,
  rings = 7,
  segments = 56,
}) {
  const positions = [];
  const indices = [];

  positions.push(...spherePoint(latitude, longitude, 1 + elevation).toArray());

  for (let ring = 1; ring <= rings; ring += 1) {
    const factor = ring / rings;
    for (let segment = 0; segment < segments; segment += 1) {
      const angle = (segment / segments) * Math.PI * 2;
      const irregularity =
        1 +
        Math.sin(angle * 3 + phase) * 0.065 +
        Math.cos(angle * 7 - phase) * 0.035 +
        Math.sin(angle * 11 + phase * 0.7) * 0.018;
      const lat = latitude + Math.sin(angle) * radiusY * factor * irregularity;
      const lon = longitude + Math.cos(angle) * radiusX * factor * irregularity;
      const crown = Math.pow(1 - factor, 1.8) * elevation * 0.13;
      positions.push(...spherePoint(lat, lon, 1 + elevation + crown).toArray());
    }
  }

  for (let segment = 0; segment < segments; segment += 1) {
    indices.push(0, 1 + segment, 1 + ((segment + 1) % segments));
  }

  for (let ring = 1; ring < rings; ring += 1) {
    const innerStart = 1 + (ring - 1) * segments;
    const outerStart = innerStart + segments;
    for (let segment = 0; segment < segments; segment += 1) {
      const next = (segment + 1) % segments;
      indices.push(
        innerStart + segment,
        outerStart + segment,
        innerStart + next,
        innerStart + next,
        outerStart + segment,
        outerStart + next,
      );
    }
  }

  const wallStart = positions.length / 3;
  for (let segment = 0; segment < segments; segment += 1) {
    const angle = (segment / segments) * Math.PI * 2;
    const irregularity =
      1 +
      Math.sin(angle * 3 + phase) * 0.065 +
      Math.cos(angle * 7 - phase) * 0.035 +
      Math.sin(angle * 11 + phase * 0.7) * 0.018;
    positions.push(
      ...spherePoint(
        latitude + Math.sin(angle) * radiusY * irregularity,
        longitude + Math.cos(angle) * radiusX * irregularity,
        1.003,
      ).toArray(),
    );
  }

  const outerStart = 1 + (rings - 1) * segments;
  for (let segment = 0; segment < segments; segment += 1) {
    const next = (segment + 1) % segments;
    indices.push(
      outerStart + segment,
      wallStart + segment,
      outerStart + next,
      outerStart + next,
      wallStart + segment,
      wallStart + next,
    );
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);

  // Ensure every triangle faces away from the center of the globe.
  const position = geometry.attributes.position;
  const index = geometry.index;
  const a = new THREE.Vector3().fromBufferAttribute(position, index.getX(0));
  const b = new THREE.Vector3().fromBufferAttribute(position, index.getX(1));
  const c = new THREE.Vector3().fromBufferAttribute(position, index.getX(2));
  if (b.clone().sub(a).cross(c.clone().sub(a)).dot(a) < 0) {
    for (let cursor = 0; cursor < index.count; cursor += 3) {
      const swap = index.getX(cursor + 1);
      index.setX(cursor + 1, index.getX(cursor + 2));
      index.setX(cursor + 2, swap);
    }
  }

  geometry.computeVertexNormals();
  const patch = addMesh(geometry, color, { zone });
  addEdges(patch, 0.22, 38);
  return patch;
}

function jaggedMountainGeometry(height, width, sides = 7) {
  const positions = [];
  const indices = [];
  const levels = [
    { y: 0, radius: width },
    { y: height * 0.36, radius: width * 0.65 },
    { y: height * 0.7, radius: width * 0.31 },
    { y: height, radius: 0.015 },
  ];

  for (let level = 0; level < levels.length; level += 1) {
    for (let side = 0; side < sides; side += 1) {
      const angle = (side / sides) * Math.PI * 2;
      const jitter = 0.88 + random() * 0.22;
      const offset = level > 1 ? Math.sin(side * 2.1) * width * 0.06 : 0;
      positions.push(
        Math.cos(angle) * levels[level].radius * jitter + offset,
        levels[level].y,
        Math.sin(angle) * levels[level].radius * jitter,
      );
    }
  }

  for (let level = 0; level < levels.length - 1; level += 1) {
    for (let side = 0; side < sides; side += 1) {
      const next = (side + 1) % sides;
      const lower = level * sides;
      const upper = (level + 1) * sides;
      indices.push(
        lower + side, upper + side, lower + next,
        lower + next, upper + side, upper + next,
      );
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function mountain(latitude, longitude, height, width, detail = false) {
  const group = new THREE.Group();
  placeRadially(group, latitude, longitude, 1.075);
  planet.add(group);

  const rock = addMesh(jaggedMountainGeometry(height, width), 0x8d5848, {
    parent: group,
    zone: "muscle",
  });
  rock.rotation.y = random() * Math.PI;
  addEdges(rock, 0.62, 12);

  const snow = addMesh(
    jaggedMountainGeometry(height * 0.3, width * 0.32, 7),
    0xd9d9d2,
    { parent: group, zone: "muscle", lod: detail ? 1 : 0 },
  );
  snow.position.y = height * 0.7;
  snow.rotation.y = rock.rotation.y;
  addEdges(snow, 0.46, 12);
}

function curvedLine(points, width, color, zone = null, lod = 0, radius = 1.09) {
  const curve = new THREE.CatmullRomCurve3(
    points.map(([lat, lon]) => spherePoint(lat, lon, radius)),
  );
  return addMesh(new THREE.TubeGeometry(curve, 72, width, 5, false), color, {
    zone,
    lod,
  });
}

function radialRock(latitude, longitude, size, color, zone, lod = 1) {
  const rock = addMesh(new THREE.DodecahedronGeometry(size, 0), color, { zone, lod });
  placeRadially(rock, latitude, longitude, 1.083 + size * 0.5);
  rock.scale.set(1, 0.65 + random() * 0.45, 0.75 + random() * 0.35);
  addEdges(rock, 0.38, 8);
  return rock;
}

// Ocean: smooth at orbit scale, with subtle current lines introduced nearby.
const ocean = addMesh(new THREE.SphereGeometry(1, 112, 72), 0x23465d);
const outline = new THREE.Mesh(
  new THREE.SphereGeometry(1.013, 72, 48),
  new THREE.MeshBasicMaterial({ color: 0x111725, side: THREE.BackSide }),
);
planet.add(outline);

const atmosphere = new THREE.Mesh(
  new THREE.SphereGeometry(1.037, 72, 48),
  new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { color: { value: new THREE.Color(0x66b9c2) } },
    vertexShader: `
      varying vec3 normalView;
      varying vec3 viewDirection;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        normalView = normalize(normalMatrix * normal);
        viewDirection = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 normalView;
      varying vec3 viewDirection;
      uniform vec3 color;
      void main() {
        float rim = pow(1.0 - abs(dot(normalView, viewDirection)), 3.2);
        gl_FragColor = vec4(color, rim * 0.42);
      }
    `,
  }),
);
planet.add(atmosphere);

// Curved layered continents replace the former flat cylinders.
terrainPatch({
  latitude: 16, longitude: -31, radiusX: 34, radiusY: 31,
  elevation: 0.025, color: 0x684b48, zone: "muscle", phase: 0.7,
});
terrainPatch({
  latitude: 18, longitude: -31, radiusX: 30, radiusY: 27,
  elevation: 0.052, color: 0x8e5d4e, zone: "muscle", phase: 1.15,
});
terrainPatch({
  latitude: 20, longitude: -32, radiusX: 24, radiusY: 21,
  elevation: 0.078, color: 0xb47655, zone: "muscle", phase: 1.7,
});

terrainPatch({
  latitude: -20, longitude: 29, radiusX: 38, radiusY: 28,
  elevation: 0.028, color: 0x40564e, zone: "fat", phase: 2.1,
});
terrainPatch({
  latitude: -17, longitude: 28, radiusX: 33, radiusY: 24,
  elevation: 0.052, color: 0x5d755f, zone: "fat", phase: 2.55,
});
terrainPatch({
  latitude: -13, longitude: 24, radiusX: 23, radiusY: 16,
  elevation: 0.069, color: 0x7c896f, zone: "fat", phase: 3.1,
});

terrainPatch({
  latitude: -11, longitude: 157, radiusX: 25, radiusY: 20,
  elevation: 0.034, color: 0x586e5d, zone: "fat", phase: 4.2,
});
terrainPatch({
  latitude: 23, longitude: -147, radiusX: 23, radiusY: 20,
  elevation: 0.042, color: 0x8c6857, zone: "muscle", phase: 5,
});

// A readable mountain chain with non-identical silhouettes.
[
  [37, -39, 0.3, 0.11],
  [25, -31, 0.35, 0.13],
  [12, -25, 0.27, 0.115],
  [5, -43, 0.19, 0.082],
  [29, -50, 0.21, 0.082],
  [18, -14, 0.16, 0.068, true],
].forEach((args) => mountain(...args));

// Glacier cap follows the sphere and is broken into irregular shelves.
terrainPatch({
  latitude: 76, longitude: 0, radiusX: 92, radiusY: 18,
  elevation: 0.03, color: 0xaabccc, zone: "bone", phase: 0.4,
  segments: 72,
});
for (let ring = 0; ring < 3; ring += 1) {
  const count = ring === 0 ? 7 : 12 + ring * 4;
  for (let index = 0; index < count; index += 1) {
    const latitude = 81 - ring * 8 + random() * 3;
    const longitude = (index / count) * 360 + ring * 13;
    const block = radialRock(
      latitude,
      longitude,
      0.045 + ring * 0.013 + random() * 0.012,
      index % 3 ? 0xc6d1da : 0x9fb6c7,
      "bone",
      ring === 2 ? 1 : 0,
    );
    block.scale.y *= 0.55;
  }
}

// Main river stays legible from orbit; thin tributaries arrive at LOD 1.
curvedLine([
  [63, 5], [52, 2], [42, 4], [33, 1], [24, 3],
  [15, 8], [6, 12], [-3, 18], [-10, 27], [-20, 34], [-33, 43],
], 0.0115, 0x64c9c5, "water");

const lake = addMesh(new THREE.SphereGeometry(0.073, 24, 14), 0x64c9c5, {
  zone: "water",
});
placeRadially(lake, 5, 12, 1.085);
lake.scale.set(1.25, 0.22, 0.72);

[
  [[43, -12], [37, -6], [33, 1]],
  [[20, 24], [13, 18], [6, 12]],
  [[-5, 45], [-13, 40], [-20, 34]],
  [[55, 19], [47, 12], [42, 4]],
  [[-14, 52], [-18, 44], [-20, 34]],
].forEach((points) => curvedLine(points, 0.004, 0x73d1cc, "water", 1, 1.094));

[
  [[33, -17], [31, -9], [33, 1]],
  [[17, 31], [12, 23], [6, 12]],
  [[-4, 33], [-6, 25], [-3, 18]],
  [[-26, 49], [-29, 46], [-33, 43]],
].forEach((points) => curvedLine(points, 0.0021, 0x95d9d2, null, 2, 1.098));

// Mountain ridgelines and broad strata emerge at closer distances.
[
  [[35, -47], [31, -40], [25, -31], [20, -25]],
  [[18, -47], [15, -39], [12, -25]],
  [[8, -48], [6, -43], [3, -36]],
].forEach((points) => curvedLine(points, 0.0022, 0xd09a73, null, 1, 1.102));

for (let index = 0; index < 42; index += 1) {
  radialRock(
    1 + random() * 40,
    -52 + random() * 40,
    0.009 + random() * 0.018,
    index % 4 ? 0x765044 : 0xc08a68,
    "muscle",
    index < 18 ? 1 : 2,
  );
}

// Forest bands: base silhouettes at orbit, denser vegetation near the surface.
for (let index = 0; index < 165; index += 1) {
  const latitude = -36 + random() * 36;
  const longitude = 5 + random() * 49;
  if (
    ((latitude + 18) / 23) ** 2 + ((longitude - 29) / 32) ** 2 > 1 ||
    Math.abs(longitude - (23 - latitude * 0.46)) < 4.2
  ) continue;

  const size = 0.014 + random() * 0.022;
  const tree = addMesh(
    new THREE.ConeGeometry(size, size * (2.5 + random() * 0.7), 5),
    index % 4 ? 0x344f48 : 0x536d5a,
    { zone: "fat", lod: index % 3 === 0 ? 0 : index % 4 === 0 ? 2 : 1 },
  );
  placeRadially(tree, latitude, longitude, 1.078 + size);
  tree.rotation.y = random() * Math.PI;
}

// Wetland stones and shoreline micro-detail only at the closest level.
for (let index = 0; index < 38; index += 1) {
  radialRock(
    -34 + random() * 25,
    18 + random() * 38,
    0.006 + random() * 0.009,
    index % 2 ? 0x71806e : 0x3d5d54,
    null,
    2,
  );
}

for (let index = 0; index < 18; index += 1) {
  const latitude = -18 + Math.sin(index * 0.72) * 17;
  const longitude = 75 + index * 7.2;
  terrainPatch({
    latitude,
    longitude,
    radiusX: 1.8 + random() * 2.7,
    radiusY: 1.5 + random() * 2.2,
    elevation: 0.02,
    color: index % 3 ? 0x526c5a : 0x916b55,
    zone: index % 3 ? "fat" : "muscle",
    phase: index,
    rings: 3,
    segments: 18,
  });
}

// Sparse ocean currents, visible only on approach.
for (let index = 0; index < 22; index += 1) {
  const latitude = -55 + random() * 105;
  const longitude = 60 + random() * 240;
  curvedLine(
    Array.from({ length: 8 }, (_, pointIndex) => [
      latitude + Math.sin(pointIndex * 0.55) * 1.3,
      longitude + pointIndex * 1.15,
    ]),
    0.0011,
    0x47758a,
    null,
    index % 3 === 0 ? 2 : 1,
    1.006,
  );
}

// Small southern caldera.
terrainPatch({
  latitude: -67, longitude: 0, radiusX: 12, radiusY: 7,
  elevation: 0.035, color: 0x50484e, phase: 4, rings: 4, segments: 28,
});
const volcano = addMesh(jaggedMountainGeometry(0.15, 0.12, 8), 0x654a49);
placeRadially(volcano, -67, 0, 1.07);
const lava = addMesh(new THREE.ConeGeometry(0.03, 0.07, 7), 0xdb7650);
placeRadially(lava, -67, 0, 1.17);

// Sparse stars keep attention on the planet.
const starPositions = [];
for (let index = 0; index < 110; index += 1) {
  const point = new THREE.Vector3(
    random() - 0.5,
    random() - 0.5,
    random() - 0.5,
  ).normalize().multiplyScalar(11);
  starPositions.push(...point.toArray());
}
const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute("position", new THREE.Float32BufferAttribute(starPositions, 3));
scene.add(new THREE.Points(
  starGeometry,
  new THREE.PointsMaterial({
    color: 0x8391a8, size: 0.013, transparent: true, opacity: 0.28,
  }),
));

const zoneInfo = {
  muscle: {
    title: "造山带",
    code: "OROGENIC BELT",
    description: "铜橙色荒漠高原、岩层与尖锐山脊，共同记录身体的力量。",
    latitude: 22, longitude: -30,
  },
  water: {
    title: "生命水道",
    code: "LIVING WATERWAYS",
    description: "冰川融水经过湖泊、支流与河谷，将星球上的不同生态连接起来。",
    latitude: 10, longitude: 8,
  },
  bone: {
    title: "极地要塞",
    code: "POLAR CITADEL",
    description: "断裂冰川和坚硬冰盖覆盖北极，形成稳定的极地结构。",
    latitude: 69, longitude: 3,
  },
  fat: {
    title: "季风大陆",
    code: "MONSOON CONTINENT",
    description: "森林、平原与湿地形成稳定而丰沛的能量储备。",
    latitude: -18, longitude: 29,
  },
};

// Labels remain editable HTML and are projected from the 3D anchors every frame.
const labelEntries = LANDMARKS.map((landmark) => {
  const element = document.createElement("div");
  element.className = "landmark";
  element.dataset.detail = String(landmark.minDetailLevel);
  element.style.setProperty(
    "--terrain-color",
    TERRAIN_TYPES[landmark.type]?.color ?? "#69cfca",
  );

  const anchor = document.createElement("span");
  anchor.className = "landmark-anchor";
  const line = document.createElement("span");
  line.className = "landmark-line";
  const label = document.createElement("span");
  label.className = "landmark-label";
  label.textContent = landmark.name;
  const type = document.createElement("small");
  type.className = "landmark-detail";
  type.textContent = landmark.type;
  label.appendChild(type);
  element.append(anchor, line, label);
  landmarkLayer.appendChild(element);

  return {
    landmark,
    element,
    localPosition: spherePoint(
      landmark.latitude,
      landmark.longitude,
      landmark.altitude,
    ),
    worldPosition: new THREE.Vector3(),
    projected: new THREE.Vector3(),
  };
});

function updateLabels(detailLevel) {
  const rect = host.getBoundingClientRect();
  const cameraDirection = camera.position.clone().normalize();

  for (const entry of labelEntries) {
    entry.worldPosition.copy(entry.localPosition).applyMatrix4(planet.matrixWorld);
    const facing = entry.worldPosition.clone().normalize().dot(cameraDirection);
    const visible =
      facing > 0.2 &&
      detailLevel >= entry.landmark.minDetailLevel;

    entry.element.classList.toggle("visible", visible);
    if (!visible) continue;

    entry.projected.copy(entry.worldPosition).project(camera);
    const x = (entry.projected.x * 0.5 + 0.5) * rect.width;
    const y = (-entry.projected.y * 0.5 + 0.5) * rect.height;
    entry.element.style.transform =
      `translate3d(${x - 9}px, ${y}px, 0) translateY(-50%)`;
  }
}

const selectionRing = new THREE.Mesh(
  new THREE.RingGeometry(0.085, 0.094, 64),
  new THREE.MeshBasicMaterial({
    color: 0xc5e3dc,
    transparent: true,
    opacity: 0.72,
    side: THREE.DoubleSide,
    depthWrite: false,
  }),
);
selectionRing.visible = false;
planet.add(selectionRing);

function setSelection(zone) {
  const info = zoneInfo[zone];
  if (!info) return;
  selectedZone = zone;

  $("#detail-card").hidden = false;
  $("#zone-code").textContent = info.code;
  $("#zone-title").textContent = info.title;
  $("#zone-description").textContent = info.description;
  document.querySelectorAll("[data-zone]").forEach((button) => {
    button.classList.toggle("active", button.dataset.zone === zone);
  });

  const normal = spherePoint(info.latitude, info.longitude).normalize();
  selectionRing.position.copy(normal.clone().multiplyScalar(1.14));
  selectionRing.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
  selectionRing.visible = true;
}

function clearSelection() {
  selectedZone = null;
  selectionRing.visible = false;
  $("#detail-card").hidden = true;
  document.querySelectorAll("[data-zone]").forEach((button) => {
    button.classList.remove("active");
  });
}

function focusZone(zone, distance = 2.55) {
  setSelection(zone);
  const info = zoneInfo[zone];
  cameraDestination = spherePoint(info.latitude, info.longitude, distance);
  if (reducedMotion) {
    camera.position.copy(cameraDestination);
    cameraDestination = null;
  }
}

function zoom(factor) {
  cameraDestination = null;
  camera.position.setLength(THREE.MathUtils.clamp(
    camera.position.length() * factor,
    controls.minDistance,
    controls.maxDistance,
  ));
}

document.querySelectorAll("[data-zone]").forEach((button) => {
  button.addEventListener("click", () => focusZone(button.dataset.zone));
});
$("#close-card").addEventListener("click", clearSelection);
$("#focus-zone").addEventListener("click", () => {
  if (selectedZone) focusZone(selectedZone, 1.62);
});
$("#zoom-in").addEventListener("click", () => zoom(0.76));
$("#zoom-out").addEventListener("click", () => zoom(1.28));
$("#reset-view").addEventListener("click", () => {
  clearSelection();
  cameraDestination = new THREE.Vector3(
    0, 0.12, innerWidth < 720 ? 4.4 : 3.65,
  );
});

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const activePointers = new Set();
let pointerStart = null;
let pointerTravel = 0;
let multiplePointers = false;

host.addEventListener("pointerdown", (event) => {
  activePointers.add(event.pointerId);
  multiplePointers = activePointers.size > 1;
  if (!multiplePointers) {
    pointerStart = { x: event.clientX, y: event.clientY };
    pointerTravel = 0;
  }
});
host.addEventListener("pointermove", (event) => {
  if (!pointerStart) return;
  pointerTravel = Math.max(
    pointerTravel,
    Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y),
  );
});
host.addEventListener("pointercancel", (event) => {
  activePointers.delete(event.pointerId);
  pointerStart = null;
});
host.addEventListener("pointerup", (event) => {
  activePointers.delete(event.pointerId);
  if (!pointerStart || multiplePointers || pointerTravel > 7) return;

  const rect = host.getBoundingClientRect();
  pointer.set(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1,
  );
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster
    .intersectObjects(clickable.filter((object) => object.visible), false)
    .find((entry) => entry.object.userData.zone);

  if (hit) setSelection(hit.object.userData.zone);
  else clearSelection();
  pointerStart = null;
});

host.addEventListener("keydown", (event) => {
  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "+", "-", "Escape"].includes(event.key)) return;
  event.preventDefault();
  if (event.key === "+") zoom(0.8);
  else if (event.key === "-") zoom(1.22);
  else if (event.key === "Escape") clearSelection();
  else {
    const spherical = new THREE.Spherical().setFromVector3(camera.position);
    spherical.theta += event.key === "ArrowLeft" ? -0.12 : event.key === "ArrowRight" ? 0.12 : 0;
    spherical.phi = THREE.MathUtils.clamp(
      spherical.phi + (event.key === "ArrowUp" ? -0.12 : event.key === "ArrowDown" ? 0.12 : 0),
      0.1,
      Math.PI - 0.1,
    );
    camera.position.setFromSpherical(spherical);
  }
});

controls.addEventListener("start", () => {
  cameraDestination = null;
});

function resize() {
  const width = host.clientWidth;
  const height = host.clientHeight;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.fov = width < 720 ? 44 : 37;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(host);
resize();

function setLodVisibility(objects, amount) {
  for (const object of objects) {
    object.visible = amount > 0.015;
    object.material.opacity = amount;
    object.material.depthWrite = amount > 0.72;
  }
}

let previousTime = performance.now();
let lod1Amount = 0;
let lod2Amount = 0;

function render(time) {
  requestAnimationFrame(render);
  const delta = Math.min((time - previousTime) / 1000, 0.06);
  previousTime = time;

  if (cameraDestination) {
    camera.position.lerp(
      cameraDestination,
      reducedMotion ? 1 : 1 - Math.exp(-delta * 5),
    );
    if (camera.position.distanceTo(cameraDestination) < 0.004) {
      cameraDestination = null;
    }
  }

  controls.update();
  planet.updateMatrixWorld();

  const distance = camera.position.length();
  const targetLod1 = 1 - THREE.MathUtils.smoothstep(distance, 2.65, 3.2);
  const targetLod2 = 1 - THREE.MathUtils.smoothstep(distance, 1.65, 2.15);
  lod1Amount += (targetLod1 - lod1Amount) * Math.min(1, delta * 7);
  lod2Amount += (targetLod2 - lod2Amount) * Math.min(1, delta * 8);
  setLodVisibility(lod1, lod1Amount);
  setLodVisibility(lod2, lod2Amount);

  const detailLevel = distance < 2.9 ? 1 : 0;
  updateLabels(detailLevel);

  $("#view-level").textContent =
    distance < 1.78 ? "地形细节" :
    distance < 2.75 ? "山川近景" :
    distance < 3.35 ? "大陆视角" :
    "星球全貌";

  renderer.render(scene, camera);
}

$("#loading").hidden = true;
requestAnimationFrame(render);
