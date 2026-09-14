import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { LANDMARKS, TERRAIN_TYPES } from "./landmarks.js";
import "./styles.css";

const host = document.querySelector("#scene");
const landmarkLayer = document.querySelector("#landmark-layer");
const loading = document.querySelector("#loading");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
renderer.outputColorSpace = THREE.SRGBColorSpace;
host.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.02, 50);
camera.position.set(0, 0.18, innerWidth < 720 ? 5.4 : 4.35);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.enableDamping = true;
controls.dampingFactor = 0.065;
controls.rotateSpeed = 0.55;
controls.zoomSpeed = 0.65;
controls.minDistance = 1.72;
controls.maxDistance = 5.7;

scene.add(new THREE.AmbientLight(0xbccde1, 1.8));
const key = new THREE.DirectionalLight(0xffe4ca, 3);
key.position.set(-3, 5, 4);
scene.add(key);
const rim = new THREE.DirectionalLight(0x6dbbc4, 1.2);
rim.position.set(3, 1, -3);
scene.add(rim);

const planet = new THREE.Group();
scene.add(planet);
const clickable = [];
const nearDetails = [];
let selectedZone = null;
let cameraDestination = null;
let seed = 2718;

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

const toneRamp = new THREE.DataTexture(
  new Uint8Array([58, 105, 165, 225]),
  4,
  1,
  THREE.RedFormat,
);
toneRamp.needsUpdate = true;
toneRamp.minFilter = toneRamp.magFilter = THREE.NearestFilter;

const materialCache = new Map();
function toonMaterial(color) {
  if (!materialCache.has(color)) {
    materialCache.set(
      color,
      new THREE.MeshToonMaterial({ color, gradientMap: toneRamp }),
    );
  }
  return materialCache.get(color);
}

function addMesh(geometry, color, parent = planet, zone = null) {
  const object = new THREE.Mesh(geometry, toonMaterial(color));
  parent.add(object);
  if (zone) {
    object.userData.zone = zone;
    clickable.push(object);
  }
  return object;
}

function addEdges(mesh, opacity = 0.48) {
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry, 28),
    new THREE.LineBasicMaterial({
      color: 0x182334,
      transparent: true,
      opacity,
    }),
  );
  mesh.add(edges);
}

function placeRadial(object, latitude, longitude, radius) {
  const normal = spherePoint(latitude, longitude).normalize();
  object.position.copy(normal.clone().multiplyScalar(radius));
  object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
  return object;
}

function plateau(latitude, longitude, width, depth, height, color, zone) {
  const geometry = new THREE.CylinderGeometry(0.5, 0.54, height, 20, 1);
  const object = addMesh(geometry, color, planet, zone);
  object.scale.set(width, 1, depth);
  placeRadial(object, latitude, longitude, 1.01 + height / 2);
  addEdges(object, 0.32);
  return object;
}

function mountain(latitude, longitude, height, width) {
  const group = new THREE.Group();
  placeRadial(group, latitude, longitude, 1.065);
  planet.add(group);

  const rock = addMesh(
    new THREE.ConeGeometry(width, height, 7, 1),
    0x9c644d,
    group,
    "muscle",
  );
  rock.position.y = height * 0.42;
  rock.rotation.y = random() * Math.PI;

  const snow = addMesh(
    new THREE.ConeGeometry(width * 0.33, height * 0.32, 7, 1),
    0xd9dbd5,
    group,
    "muscle",
  );
  snow.position.y = height * 0.74;
  snow.rotation.y = rock.rotation.y;
  addEdges(rock);
  addEdges(snow);
}

function river(points, width = 0.009, detail = false) {
  const curve = new THREE.CatmullRomCurve3(
    points.map(([lat, lon]) => spherePoint(lat, lon, 1.087)),
  );
  const water = addMesh(
    new THREE.TubeGeometry(curve, 60, width, 5, false),
    0x64cac6,
    planet,
    "water",
  );
  if (detail) nearDetails.push(water);
  return water;
}

// Ocean body and a restrained outline.
const ocean = addMesh(new THREE.SphereGeometry(1, 96, 64), 0x254c66);
clickable.push(ocean);
const outline = new THREE.Mesh(
  new THREE.SphereGeometry(1.012, 64, 48),
  new THREE.MeshBasicMaterial({
    color: 0x111725,
    side: THREE.BackSide,
  }),
);
planet.add(outline);

// Western desert/highland continent and southeastern forest continent.
plateau(15, -31, 1.05, 0.92, 0.045, 0x79554d, "muscle");
plateau(17, -31, 0.91, 0.79, 0.075, 0xa66f50, "muscle");
plateau(21, -31, 0.72, 0.59, 0.105, 0xb98358, "muscle");

plateau(-20, 28, 1.08, 0.86, 0.05, 0x465a51, "fat");
plateau(-17, 28, 0.94, 0.73, 0.08, 0x647d65, "fat");
plateau(-13, 25, 0.65, 0.48, 0.1, 0x7d8f72, "fat");

plateau(-10, 157, 0.55, 0.42, 0.06, 0x647a65, "fat");
plateau(23, -146, 0.52, 0.41, 0.065, 0x94705a, "muscle");

[
  [36, -39, 0.27, 0.105],
  [24, -31, 0.32, 0.12],
  [11, -25, 0.25, 0.105],
  [5, -43, 0.18, 0.08],
  [28, -49, 0.19, 0.075],
].forEach((args) => mountain(...args));

// Polar glacier: visible from every longitude.
const polarCap = addMesh(
  new THREE.SphereGeometry(1.045, 64, 12, 0, Math.PI * 2, 0, 0.39),
  0xbecbd8,
  planet,
  "bone",
);
clickable.push(polarCap);

for (let ring = 0; ring < 3; ring += 1) {
  const count = ring === 0 ? 7 : 14 + ring * 3;
  for (let index = 0; index < count; index += 1) {
    const glacier = addMesh(
      new THREE.CylinderGeometry(
        0.045 + ring * 0.013,
        0.06 + ring * 0.014,
        0.055 + random() * 0.055,
        6,
      ),
      index % 3 ? 0xc8d3dd : 0xa8bdce,
      planet,
      "bone",
    );
    placeRadial(
      glacier,
      79 - ring * 10 + random() * 3,
      (index / count) * 360 + ring * 11,
      1.075,
    );
    addEdges(glacier, 0.38);
  }
}

// Main waterway, lake and tributaries.
river([
  [62, 5], [49, 1], [36, 4], [25, 0], [13, 7],
  [3, 12], [-5, 20], [-9, 28], [-19, 34], [-31, 43],
], 0.012);

const lake = addMesh(
  new THREE.SphereGeometry(0.078, 20, 12),
  0x64cac6,
  planet,
  "water",
);
placeRadial(lake, 3, 12, 1.07);
lake.scale.set(1.15, 0.24, 0.75);

[
  [[35, -11], [29, -8], [25, 0]],
  [[16, 24], [11, 18], [3, 12]],
  [[-6, 44], [-13, 39], [-19, 34]],
  [[43, -10], [40, -3], [36, 4]],
].forEach((points) => river(points, 0.0045, true));

// Forest uses directional conifers instead of rounded toy-like clusters.
for (let index = 0; index < 120; index += 1) {
  const latitude = -35 + random() * 34;
  const longitude = 8 + random() * 43;
  if (
    ((latitude + 18) / 22) ** 2 + ((longitude - 28) / 29) ** 2 > 1 ||
    Math.abs(longitude - (22 - latitude * 0.48)) < 4
  ) {
    continue;
  }
  const size = 0.018 + random() * 0.019;
  const tree = addMesh(
    new THREE.ConeGeometry(size, size * 2.7, 5),
    index % 3 ? 0x3d5e53 : 0x526f5e,
    planet,
    "fat",
  );
  placeRadial(tree, latitude, longitude, 1.075 + size);
  if (index % 3 !== 0) nearDetails.push(tree);
}

// Desert rock detail, shown only near the surface.
for (let index = 0; index < 24; index += 1) {
  const latitude = 2 + random() * 39;
  const longitude = -51 + random() * 36;
  const rock = addMesh(
    new THREE.ConeGeometry(0.02 + random() * 0.017, 0.065, 5),
    0x89604f,
    planet,
    "muscle",
  );
  placeRadial(rock, latitude, longitude, 1.105);
  nearDetails.push(rock);
}

// Small southern volcanic area.
plateau(-67, 0, 0.26, 0.17, 0.045, 0x574c51, null);
const volcano = addMesh(
  new THREE.CylinderGeometry(0.035, 0.12, 0.14, 9),
  0x6d514d,
);
placeRadial(volcano, -67, 0, 1.1);
const lava = addMesh(new THREE.CylinderGeometry(0.03, 0.03, 0.007, 12), 0xdc865c);
placeRadial(lava, -67, 0, 1.174);

// Sparse background points.
const starPositions = [];
for (let index = 0; index < 130; index += 1) {
  const position = new THREE.Vector3(
    random() - 0.5,
    random() - 0.5,
    random() - 0.5,
  ).normalize().multiplyScalar(12);
  starPositions.push(...position.toArray());
}
const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(starPositions, 3),
);
scene.add(
  new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({
      color: 0x8391a8,
      size: 0.014,
      transparent: true,
      opacity: 0.35,
    }),
  ),
);

const zoneInfo = {
  muscle: {
    title: "造山带",
    code: "OROGENIC BELT",
    description: "铜橙色荒漠高原与尖锐山脊共同记录身体的力量。",
    latitude: 22,
    longitude: -30,
  },
  water: {
    title: "生命水道",
    code: "LIVING WATERWAYS",
    description: "冰川融水经过湖泊、支流和河谷，将整个星球连接起来。",
    latitude: 10,
    longitude: 8,
  },
  bone: {
    title: "极地要塞",
    code: "POLAR CITADEL",
    description: "断裂的冰川棱面覆盖北极，构成星球坚实的支撑区域。",
    latitude: 69,
    longitude: 3,
  },
  fat: {
    title: "季风大陆",
    code: "MONSOON CONTINENT",
    description: "森林、平原和湿地形成稳定而丰沛的能量储备。",
    latitude: -18,
    longitude: 29,
  },
};

// Floating labels are ordinary editable HTML.
const labelEntries = LANDMARKS.map((landmark) => {
  const element = document.createElement("div");
  element.className = "landmark";
  element.dataset.detail = String(landmark.minDetailLevel);
  element.style.setProperty(
    "--terrain-color",
    TERRAIN_TYPES[landmark.type]?.color ?? "#69cfca",
  );
  element.innerHTML = `
    <span class="landmark-anchor"></span>
    <span class="landmark-line"></span>
    <span class="landmark-label">
      ${landmark.name}
      <small class="landmark-detail">${landmark.type}</small>
    </span>
  `;
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
    screenPosition: new THREE.Vector3(),
  };
});

function updateLandmarkLabels(detailLevel) {
  const rect = host.getBoundingClientRect();
  const cameraDirection = camera.position.clone().normalize();

  for (const entry of labelEntries) {
    entry.worldPosition.copy(entry.localPosition).applyMatrix4(planet.matrixWorld);
    const surfaceDirection = entry.worldPosition.clone().normalize();
    const isFront = surfaceDirection.dot(cameraDirection) > 0.16;
    const levelVisible = detailLevel >= entry.landmark.minDetailLevel;

    entry.element.classList.toggle("visible", isFront && levelVisible);
    if (!isFront || !levelVisible) continue;

    entry.screenPosition.copy(entry.worldPosition).project(camera);
    const x = (entry.screenPosition.x * 0.5 + 0.5) * rect.width;
    const y = (-entry.screenPosition.y * 0.5 + 0.5) * rect.height;
    entry.element.style.transform = `translate3d(${x - 9}px, ${y}px, 0) translateY(-50%)`;
  }
}

const selectionRing = new THREE.Mesh(
  new THREE.RingGeometry(0.105, 0.112, 64),
  new THREE.MeshBasicMaterial({
    color: 0xc2e0d9,
    transparent: true,
    opacity: 0.68,
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
  document.querySelector("#detail-card").hidden = false;
  document.querySelector("#zone-code").textContent = info.code;
  document.querySelector("#zone-title").textContent = info.title;
  document.querySelector("#zone-description").textContent = info.description;
  document.querySelectorAll("[data-zone]").forEach((button) => {
    button.classList.toggle("active", button.dataset.zone === zone);
  });

  const normal = spherePoint(info.latitude, info.longitude).normalize();
  selectionRing.position.copy(normal.clone().multiplyScalar(1.125));
  selectionRing.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    normal,
  );
  selectionRing.visible = true;
}

function clearSelection() {
  selectedZone = null;
  selectionRing.visible = false;
  document.querySelector("#detail-card").hidden = true;
  document.querySelectorAll("[data-zone]").forEach((button) => {
    button.classList.remove("active");
  });
}

function focusZone(zone, distance = 2.25) {
  setSelection(zone);
  const info = zoneInfo[zone];
  cameraDestination = spherePoint(
    info.latitude,
    info.longitude,
    distance,
  );
  if (reducedMotion) {
    camera.position.copy(cameraDestination);
    cameraDestination = null;
  }
}

function zoom(factor) {
  cameraDestination = null;
  const distance = THREE.MathUtils.clamp(
    camera.position.length() * factor,
    controls.minDistance,
    controls.maxDistance,
  );
  camera.position.setLength(distance);
}

document.querySelectorAll("[data-zone]").forEach((button) => {
  button.addEventListener("click", () => focusZone(button.dataset.zone, 3.35));
});
document.querySelector("#close-card").addEventListener("click", clearSelection);
document.querySelector("#focus-zone").addEventListener("click", () => {
  if (selectedZone) focusZone(selectedZone, 2.15);
});
document.querySelector("#zoom-in").addEventListener("click", () => zoom(0.84));
document.querySelector("#zoom-out").addEventListener("click", () => zoom(1.18));
document.querySelector("#reset-view").addEventListener("click", () => {
  clearSelection();
  cameraDestination = new THREE.Vector3(
    0,
    0.18,
    innerWidth < 720 ? 5.4 : 4.35,
  );
});

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let pointerStart = null;
let pointerTravel = 0;
let multiplePointers = false;
const activePointers = new Set();

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
    Math.hypot(
      event.clientX - pointerStart.x,
      event.clientY - pointerStart.y,
    ),
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
  if (event.key === "+") zoom(0.86);
  else if (event.key === "-") zoom(1.16);
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
  camera.fov = width < 720 ? 45 : 38;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(host);
resize();

let previousTime = performance.now();
let detailAmount = 0;

function render(time) {
  requestAnimationFrame(render);
  const delta = Math.min((time - previousTime) / 1000, 0.06);
  previousTime = time;

  if (cameraDestination) {
    camera.position.lerp(
      cameraDestination,
      reducedMotion ? 1 : 1 - Math.exp(-delta * 5),
    );
    if (camera.position.distanceTo(cameraDestination) < 0.005) {
      cameraDestination = null;
    }
  }

  controls.update();
  planet.updateMatrixWorld();

  const distance = camera.position.length();
  const desiredDetail = 1 - THREE.MathUtils.smoothstep(distance, 2.55, 3.35);
  detailAmount += (desiredDetail - detailAmount) * Math.min(1, delta * 6);

  for (const object of nearDetails) {
    object.visible = detailAmount > 0.025;
    object.scale.setScalar(Math.max(0.001, detailAmount));
  }

  const detailLevel = distance < 3.15 ? 1 : 0;
  updateLandmarkLabels(detailLevel);
  document.querySelector("#view-level").textContent =
    distance < 2.55 ? "山川近景" : distance < 3.4 ? "大陆视角" : "星球全貌";

  renderer.render(scene, camera);
}

loading.hidden = true;
requestAnimationFrame(render);
