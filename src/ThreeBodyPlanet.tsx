// @refresh reset
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

type ZoneId = "muscle" | "water" | "bone" | "fat";

interface BodyMetrics {
  muscle: string;
  water: string;
  bone: string;
  fat: string;
}

interface ThreeBodyPlanetProps {
  bodyMetrics: BodyMetrics;
  activeZone: ZoneId | null;
  onZoneSelect: (zone: ZoneId | null) => void;
  command: { id: number; type: "in" | "out" | "reset" };
  onViewDistance: (distance: number) => void;
  snapshot?: boolean;
  autoRotate?: boolean;
}

const LANDMARKS = [
  { id: "polar", name: "骨骼要塞", zone: "bone", latitude: 69, longitude: 3, detail: 0 },
  { id: "river", name: "生命水道", zone: "water", latitude: 18, longitude: 4, detail: 0 },
  { id: "mountains", name: "造山带", zone: "muscle", latitude: 22, longitude: -30, detail: 1 },
  { id: "monsoon", name: "季风大陆", zone: "fat", latitude: -18, longitude: 29, detail: 1 },
] as const;

const ZONE_FOCUS: Record<ZoneId, [number, number]> = {
  muscle: [22, -30],
  water: [10, 8],
  bone: [69, 3],
  fat: [-18, 29],
};

function spherePoint(latitude: number, longitude: number, radius = 1) {
  const latitudeRadians = THREE.MathUtils.degToRad(latitude);
  const longitudeRadians = THREE.MathUtils.degToRad(longitude);
  return new THREE.Vector3(
    Math.sin(longitudeRadians) * Math.cos(latitudeRadians) * radius,
    Math.sin(latitudeRadians) * radius,
    Math.cos(longitudeRadians) * Math.cos(latitudeRadians) * radius,
  );
}

export default function ThreeBodyPlanet({
  bodyMetrics,
  activeZone,
  onZoneSelect,
  command,
  onViewDistance,
  snapshot = false,
  autoRotate = false,
}: ThreeBodyPlanetProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<Record<string, HTMLSpanElement | null>>({});
  const onZoneSelectRef = useRef(onZoneSelect);
  const onViewDistanceRef = useRef(onViewDistance);
  const activeZoneRef = useRef(activeZone);
  const sceneRef = useRef<{
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    planet: THREE.Group;
    selectionRing: THREE.Mesh;
    setDestination: (zone: ZoneId | null) => void;
    setMetrics: (muscle: number, bone: number, water: number) => void;
  } | null>(null);

  onZoneSelectRef.current = onZoneSelect;
  onViewDistanceRef.current = onViewDistance;
  activeZoneRef.current = activeZone;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const colorCanvas = document.createElement("canvas");
    colorCanvas.width = 1;
    colorCanvas.height = 1;
    const colorContext = colorCanvas.getContext("2d", { willReadFrequently: true });
    if (!colorContext) throw new Error("无法初始化星球配色解析器。");
    const readToken = (name: string) => {
      const probe = document.createElement("span");
      probe.style.color = `var(${name})`;
      host.appendChild(probe);
      const resolvedColor = getComputedStyle(probe).color;
      probe.remove();
      colorContext.clearRect(0, 0, 1, 1);
      colorContext.fillStyle = resolvedColor;
      colorContext.fillRect(0, 0, 1, 1);
      const [red, green, blue] = colorContext.getImageData(0, 0, 1, 1).data;
      return `rgb(${red}, ${green}, ${blue})`;
    };
    const colors = {
      ocean: readToken("--brand-secondary"),
      rock: readToken("--warning"),
      forest: readToken("--success"),
      ice: readToken("--on-brand"),
      water: readToken("--brand-primary"),
      ink: readToken("--surface-dark"),
      stars: readToken("--text-secondary"),
    };

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.02, 50);
    camera.position.set(0, 0.18, 4.35);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.065;
    controls.rotateSpeed = 0.55;
    controls.zoomSpeed = 0.65;
    controls.minDistance = 1.72;
    controls.maxDistance = 5.7;
    controls.enabled = !snapshot;

    scene.add(new THREE.AmbientLight(colors.ice, 1.8));
    const key = new THREE.DirectionalLight(colors.ice, 2.8);
    key.position.set(-3, 5, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(colors.water, 1.1);
    rim.position.set(3, 1, -3);
    scene.add(rim);

    let seed = 6103;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const gradient = new THREE.DataTexture(new Uint8Array([72, 72, 72, 255, 126, 126, 126, 255, 188, 188, 188, 255, 238, 238, 238, 255]), 4, 1, THREE.RGBAFormat);
    gradient.needsUpdate = true;
    gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
    const materials = new Map<string, THREE.MeshToonMaterial>();
    const material = (color: string) => {
      if (!materials.has(color)) materials.set(color, new THREE.MeshToonMaterial({ color, gradientMap: gradient }));
      return materials.get(color)!;
    };

    const planet = new THREE.Group();
    scene.add(planet);
    const clickable: THREE.Mesh[] = [];
    const nearDetails: THREE.Mesh[] = [];
    const addMesh = (geometry: THREE.BufferGeometry, color: string, parent = planet, zone?: ZoneId) => {
      const mesh = new THREE.Mesh(geometry, material(color));
      parent.add(mesh);
      if (zone) {
        mesh.userData.zone = zone;
        clickable.push(mesh);
      }
      return mesh;
    };
    function placeRadial<T extends THREE.Object3D>(object: T, latitude: number, longitude: number, radius: number): T {
      const normal = spherePoint(latitude, longitude).normalize();
      object.position.copy(normal.multiplyScalar(radius));
      object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
      return object;
    }
    const addEdges = (mesh: THREE.Mesh, opacity = 0.45) => {
      mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 28), new THREE.LineBasicMaterial({ color: colors.ink, transparent: true, opacity })));
    };
    const plateau = (latitude: number, longitude: number, width: number, depth: number, height: number, color: string, zone: ZoneId) => {
      const mesh = addMesh(new THREE.CylinderGeometry(0.5, 0.54, height, 20, 1), color, planet, zone);
      mesh.scale.set(width, 1, depth);
      placeRadial(mesh, latitude, longitude, 1.01 + height / 2);
      addEdges(mesh, 0.32);
      return mesh;
    };
    const terrainPatch = (latitude: number, longitude: number, radiusX: number, radiusY: number, elevation: number, color: string, zone: ZoneId | undefined, phase: number) => {
      const rings = 8;
      const segments = 64;
      const positions: number[] = [...spherePoint(latitude, longitude, 1 + elevation).toArray()];
      const indices: number[] = [];
      for (let ring = 1; ring <= rings; ring += 1) {
        const factor = ring / rings;
        for (let segment = 0; segment < segments; segment += 1) {
          const angle = (segment / segments) * Math.PI * 2;
          const irregularity = 1 + Math.sin(angle * 5 + phase) * 0.1 + Math.cos(angle * 9 - phase) * 0.055;
          const latitudePoint = latitude + Math.sin(angle) * radiusY * factor * irregularity;
          const longitudePoint = longitude + Math.cos(angle) * radiusX * factor * irregularity;
          positions.push(...spherePoint(latitudePoint, longitudePoint, 1 + elevation).toArray());
        }
      }
      for (let segment = 0; segment < segments; segment += 1) indices.push(0, 1 + segment, 1 + ((segment + 1) % segments));
      for (let ring = 1; ring < rings; ring += 1) {
        const innerStart = 1 + (ring - 1) * segments;
        const outerStart = innerStart + segments;
        for (let segment = 0; segment < segments; segment += 1) {
          const next = (segment + 1) % segments;
          indices.push(innerStart + segment, outerStart + segment, innerStart + next, innerStart + next, outerStart + segment, outerStart + next);
        }
      }
      const wallStart = positions.length / 3;
      for (let segment = 0; segment < segments; segment += 1) {
        const angle = (segment / segments) * Math.PI * 2;
        const irregularity = 1 + Math.sin(angle * 5 + phase) * 0.1 + Math.cos(angle * 9 - phase) * 0.055;
        positions.push(...spherePoint(latitude + Math.sin(angle) * radiusY * irregularity, longitude + Math.cos(angle) * radiusX * irregularity, 1.003).toArray());
      }
      const outerStart = 1 + (rings - 1) * segments;
      for (let segment = 0; segment < segments; segment += 1) {
        const next = (segment + 1) % segments;
        indices.push(outerStart + segment, wallStart + segment, outerStart + next, outerStart + next, wallStart + segment, wallStart + next);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      const patch = addMesh(geometry, color, planet, zone);
      addEdges(patch, 0.22);
      return patch;
    };
    const mountain = (latitude: number, longitude: number, height: number, width: number) => {
      const group = placeRadial(new THREE.Group(), latitude, longitude, 1.065);
      planet.add(group);
      const rock = addMesh(new THREE.ConeGeometry(width, height, 7, 1), colors.rock, group, "muscle");
      rock.position.y = height * 0.4;
      rock.rotation.y = random() * Math.PI;
      const snow = addMesh(new THREE.ConeGeometry(width * 0.31, height * 0.31, 7), colors.ice, group, "muscle");
      snow.position.y = height * 0.745;
      snow.rotation.y = rock.rotation.y;
      addEdges(rock, 0.62);
      addEdges(snow, 0.46);
      return group;
    };
    const river = (points: [number, number][], width: number, detail = false, color = colors.water, zone: ZoneId | undefined = "water", radius = 1.087) => {
      const curve = new THREE.CatmullRomCurve3(points.map(([latitude, longitude]) => spherePoint(latitude, longitude, radius)));
      const mesh = addMesh(new THREE.TubeGeometry(curve, 60, width, 5, false), color, planet, zone);
      if (detail) {
        mesh.material = material(color).clone();
        mesh.material.transparent = true;
        mesh.material.opacity = 0;
        mesh.material.depthWrite = false;
        nearDetails.push(mesh);
      }
    };

    addMesh(new THREE.SphereGeometry(1, 96, 64), colors.ocean);
    const outline = new THREE.Mesh(new THREE.SphereGeometry(1.012, 64, 48), new THREE.MeshBasicMaterial({ color: colors.ink, side: THREE.BackSide }));
    planet.add(outline);

    const mountainGroups = [
      mountain(36, -37, 0.26, 0.105), mountain(23, -31, 0.31, 0.12), mountain(10, -25, 0.24, 0.105), mountain(3, -42, 0.18, 0.08), mountain(27, -49, 0.19, 0.075), mountain(17, -14, 0.15, 0.07),
    ];
    terrainPatch(13, -29, 33, 32, 0.024, colors.rock, "muscle", 1);
    terrainPatch(17, -30, 29, 27, 0.054, colors.rock, "muscle", 1);
    terrainPatch(20, -32, 23, 22, 0.078, colors.rock, "muscle", 1);
    [
      terrainPatch(-22, 27, 38, 28, 0.029, colors.forest, "fat", 2),
      terrainPatch(-18, 27, 34, 24, 0.055, colors.forest, "fat", 2),
      terrainPatch(-13, 23, 23, 16, 0.065, colors.forest, "fat", 2),
      terrainPatch(-12, 157, 26, 24, 0.038, colors.forest, "fat", 4),
    ];
    for (let index = 0; index < 18; index += 1) {
      const latitude = -28 + Math.sin(index * 0.5) * 15;
      const longitude = 95 + index * 8;
      terrainPatch(latitude, longitude, 2 + random() * 3, 2 + random() * 2, 0.02, index % 3 === 0 ? colors.rock : colors.forest, index % 3 === 0 ? "muscle" : "fat", random() * 6);
    }
    const polarCap = addMesh(new THREE.SphereGeometry(1.047, 64, 12, 0, Math.PI * 2, 0, 0.39), colors.ice, planet, "bone");
    for (let ring = 0; ring < 3; ring += 1) {
      const count = ring === 0 ? 7 : 14 + ring * 3;
      for (let index = 0; index < count; index += 1) {
        const glacier = addMesh(new THREE.CylinderGeometry(0.045 + ring * 0.014, 0.06 + ring * 0.014, 0.055 + random() * 0.06, 5), index % 3 ? colors.ice : colors.water, planet, "bone");
        placeRadial(glacier, 79 - ring * 10 + random() * 3, (index / count) * 360 + ring * 11, 1.043);
      addEdges(glacier, 0.38);
      }
    }
    river([[62, 5], [49, 1], [36, 4], [25, 0], [13, 7], [3, 12], [-5, 20], [-9, 28], [-19, 34], [-31, 43]], 0.012);
    const lake = addMesh(new THREE.SphereGeometry(0.078, 20, 12), colors.water, planet, "water");
    placeRadial(lake, 3, 12, 1.07);
    lake.scale.set(1.15, 0.24, 0.75);
    [
      [[43, -12], [37, -6], [33, 1]],
      [[20, 24], [13, 18], [6, 12]],
      [[-5, 45], [-13, 40], [-20, 34]],
      [[55, 19], [47, 12], [42, 4]],
      [[-14, 52], [-18, 44], [-20, 34]],
    ].forEach((points) => river(points as [number, number][], 0.004, true));
    for (let index = 0; index < 165; index += 1) {
      const latitude = -36 + random() * 36;
      const longitude = 5 + random() * 49;
      if (((latitude + 18) / 23) ** 2 + ((longitude - 29) / 32) ** 2 > 1 || Math.abs(longitude - (23 - latitude * 0.46)) < 4.2) continue;
      const size = 0.014 + random() * 0.022;
      const tree = addMesh(new THREE.ConeGeometry(size, size * (2.5 + random() * 0.7), 5), colors.forest, planet, "fat");
      placeRadial(tree, latitude, longitude, 1.078 + size);
      tree.rotation.y = random() * Math.PI;
      if (index % 3) {
        tree.material = material(colors.forest).clone();
        tree.material.transparent = true;
        tree.material.opacity = 0;
        tree.material.depthWrite = false;
        nearDetails.push(tree);
      }
    }

    for (let index = 0; index < 30; index += 1) {
      const latitude = -60 + random() * 115;
      const longitude = random() * 360;
      const current = Array.from({ length: 10 }, (_, pointIndex) => [latitude + Math.sin(pointIndex * 0.4) * 1.5, longitude + pointIndex * 0.8] as [number, number]);
      river(current, 0.0012, false, colors.ocean, undefined, 1.005);
    }

    terrainPatch(-68, 0, 13, 8, 0.035, colors.rock, undefined, 4);
    const volcano = addMesh(new THREE.CylinderGeometry(0.035, 0.12, 0.14, 9), colors.rock);
    placeRadial(volcano, -68, 0, 1.09);
    const caldera = addMesh(new THREE.CylinderGeometry(0.031, 0.031, 0.006, 12), colors.water);
    placeRadial(caldera, -68, 0, 1.165);

    const stars: number[] = [];
    for (let index = 0; index < 90; index += 1) {
      const position = new THREE.Vector3(Math.sin(index * 17), Math.cos(index * 31), Math.sin(index * 47)).normalize().multiplyScalar(12);
      stars.push(...position.toArray());
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute("position", new THREE.Float32BufferAttribute(stars, 3));
    scene.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: colors.stars, size: 0.014, transparent: true, opacity: 0.35 })));

    const selectionRing = new THREE.Mesh(new THREE.RingGeometry(0.105, 0.115, 64), new THREE.MeshBasicMaterial({ color: colors.water, transparent: true, opacity: 0.78, side: THREE.DoubleSide, depthWrite: false }));
    selectionRing.visible = false;
    planet.add(selectionRing);
    let destination: THREE.Vector3 | null = null;
    const setDestination = (zone: ZoneId | null) => {
      if (!zone) {
        selectionRing.visible = false;
        return;
      }
      const [latitude, longitude] = ZONE_FOCUS[zone];
      const normal = spherePoint(latitude, longitude).normalize();
      selectionRing.position.copy(normal.clone().multiplyScalar(1.14));
      selectionRing.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      selectionRing.visible = true;
      destination = spherePoint(latitude, longitude, 2.6);
    };
    const setMetrics = (muscleAmount: number, boneAmount: number, waterAmount: number) => {
      const muscleScale = Math.max(0.55, Math.min(1.6, muscleAmount / 42));
      const boneScale = Math.max(0.7, Math.min(1.45, boneAmount / 3.2));
      const waterLevel = Math.max(0.6, Math.min(1.35, waterAmount / 61.2));
      mountainGroups.forEach((mountainGroup) => mountainGroup.scale.set(1, muscleScale, 1));
      polarCap.scale.setScalar(boneScale);
      material(colors.water).emissive.set(colors.water);
      material(colors.water).emissiveIntensity = Math.max(0, waterLevel - 0.6) * 0.35;
    };
    sceneRef.current = { camera, controls, planet, selectionRing, setDestination, setMetrics };

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerStart: { x: number; y: number } | null = null;
    const onPointerDown = (event: PointerEvent) => { pointerStart = { x: event.clientX, y: event.clientY }; };
    const onPointerUp = (event: PointerEvent) => {
      if (!pointerStart || Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 7) return;
      const rect = host.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(clickable, false).find((entry) => entry.object.userData.zone);
      onZoneSelectRef.current((hit?.object.userData.zone as ZoneId | undefined) ?? null);
      pointerStart = null;
    };
    if (!snapshot) {
      host.addEventListener("pointerdown", onPointerDown);
      host.addEventListener("pointerup", onPointerUp);
    }

    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.fov = width < 360 ? 48 : 42;
      camera.updateProjectionMatrix();
      if (snapshot && !autoRotate) renderer.render(scene, camera);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();

    let frame = 0;
    let previousTime = performance.now();
    const render = (time: number) => {
      frame = requestAnimationFrame(render);
      const delta = Math.min((time - previousTime) / 1000, 0.06);
      previousTime = time;
      if (autoRotate) planet.rotation.y += delta * 0.12;
      if (destination) {
        camera.position.lerp(destination, 1 - Math.exp(-delta * 5));
        if (camera.position.distanceTo(destination) < 0.01) destination = null;
      }
      controls.update();
      planet.updateMatrixWorld();
      const distance = camera.position.length();
      const detail = 1 - THREE.MathUtils.smoothstep(distance, 2.55, 3.35);
      nearDetails.forEach((object) => {
        object.visible = detail > 0.015;
        (object.material as THREE.MeshToonMaterial).opacity = detail;
      });
      LANDMARKS.forEach((landmark) => {
        const label = labelsRef.current[landmark.id];
        if (!label) return;
        const worldPosition = spherePoint(landmark.latitude, landmark.longitude, 1.18).applyMatrix4(planet.matrixWorld);
        const isFront = worldPosition.clone().normalize().dot(camera.position.clone().normalize()) > 0.16;
        const isVisible = isFront && (landmark.detail === 0 || distance < 3.15);
        label.dataset.visible = String(isVisible);
        if (isVisible) {
          const projected = worldPosition.project(camera);
          label.style.transform = `translate3d(${(projected.x * 0.5 + 0.5) * host.clientWidth}px, ${(-projected.y * 0.5 + 0.5) * host.clientHeight}px, 0) translate(-50%, -50%)`;
        }
      });
      onViewDistanceRef.current(distance < 2.55 ? 2 : distance < 3.4 ? 3 : 4);
      renderer.render(scene, camera);
    };
    if (!snapshot || autoRotate) frame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      if (!snapshot) {
        host.removeEventListener("pointerdown", onPointerDown);
        host.removeEventListener("pointerup", onPointerUp);
      }
      controls.dispose();
      renderer.dispose();
      gradient.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments || object instanceof THREE.Points) object.geometry.dispose();
      });
      host.replaceChildren();
      sceneRef.current = null;
    };
  }, [autoRotate, snapshot]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.setDestination(activeZone);
  }, [activeZone]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || command.id === 0) return;
    if (command.type === "reset") {
      scene.camera.position.set(0, 0.18, 4.35);
      scene.controls.target.set(0, 0, 0);
      scene.setDestination(null);
      return;
    }
    scene.camera.position.setLength(THREE.MathUtils.clamp(scene.camera.position.length() * (command.type === "in" ? 0.84 : 1.18), scene.controls.minDistance, scene.controls.maxDistance));
  }, [command]);

  useEffect(() => {
    sceneRef.current?.setMetrics(Number(bodyMetrics.muscle), Number(bodyMetrics.bone), Number(bodyMetrics.water));
  }, [bodyMetrics.bone, bodyMetrics.muscle, bodyMetrics.water]);

  return (
    /* Astra UI has no 3D canvas primitive; this canvas host is required for the imported Three.js globe and its gesture controls. */
    <div className="three-planet-shell">
      <div ref={hostRef} className="three-planet-canvas" />
      {!snapshot && <div className="three-planet-labels" aria-hidden="true">
        {LANDMARKS.map((landmark) => (
          <span key={landmark.id} ref={(element) => { labelsRef.current[landmark.id] = element; }} className={`three-planet-label three-planet-label-${landmark.zone}`}>
            {landmark.name}
          </span>
        ))}
      </div>}
    </div>
  );
}
