// world.js — builds the island: a seeded heightmap with beaches, grass,
// rock and snow, the sea around it, a sky with sun and clouds, the runway
// strip, and the glowing rings and beacons the missions use. It also owns
// heightAt(x, z), the one function the flight model trusts for collisions.

import { CONFIG } from './config.js';
import { fbmNoise, makeRng } from './random.js';

const C = CONFIG.colors;

// Terrain height at world (x, z). A smooth island: high in the middle,
// falling to the sea at the coast, with a flat pad where the runway sits.
export function heightAt(x, z, seed) {
  const r = Math.hypot(x, z);
  const coast = 1 - smoothstep(CONFIG.islandRadius * 0.55, CONFIG.islandRadius, r);
  if (coast <= 0) return 0;
  const n = fbmNoise(x * 0.0016 + 7.3, z * 0.0016 + 2.9, seed, 4);
  const ridge = fbmNoise(x * 0.0006 + 1.1, z * 0.0006 + 4.4, seed + 7, 3);
  let h = (n * 0.7 + ridge * 0.6) * CONFIG.maxTerrainHeight * coast;
  // Flatten a pad for the runway so the strip sits on level ground.
  const rw = CONFIG.runway;
  const dx = Math.abs(x - rw.x);
  const dz = Math.abs(z - rw.z);
  const pad = Math.max(0, 1 - Math.max(dx / 90, dz / 190));
  h = h * (1 - pad) + 2.2 * pad;
  return Math.max(0, h);
}

function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// Pick a terrain colour from height and slope, for the vertex colours.
function terrainColor(h, slope, out) {
  if (h < 3.5) return out.setHex(C.sand);
  if (h > 190) return out.setHex(C.snow);
  if (slope > 0.62 || h > 120) return out.setHex(C.rock);
  return out.setHex(C.grass);
}

function buildTerrain(scene, seed) {
  const size = CONFIG.worldSize;
  const seg = CONFIG.terrainSegments;
  let geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const col = new THREE.Color();
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = heightAt(x, z, seed);
    pos.setY(i, h);
    // A cheap slope estimate from the heightmap's neighbours.
    const sx = heightAt(x + 8, z, seed) - heightAt(x - 8, z, seed);
    const sz = heightAt(x, z + 8, seed) - heightAt(x, z - 8, seed);
    const slope = Math.min(1, Math.hypot(sx, sz) / 16);
    terrainColor(h, slope, col);
    // Slight per-vertex variation so the facets read as low-poly facets.
    const v = 0.94 + 0.06 * ((i * 2654435761) % 100) / 100;
    tmp.copy(col).multiplyScalar(v);
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo = geo.toNonIndexed();
  geo.computeVertexNormals();
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = false;
  scene.add(mesh);
  return mesh;
}

function buildWater(scene) {
  const geo = new THREE.PlaneGeometry(CONFIG.worldSize * 3, CONFIG.worldSize * 3);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshLambertMaterial({
    color: C.water,
    transparent: true,
    opacity: 0.88,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = CONFIG.waterLevel;
  scene.add(mesh);
  return mesh;
}

function buildSky(scene) {
  scene.background = new THREE.Color(C.sky);
  scene.fog = new THREE.Fog(C.fog, CONFIG.fogNear, CONFIG.fogFar);
  // Sun: a bright disc high in the sky plus the light that lights the world.
  const sun = new THREE.Mesh(
    new THREE.CircleGeometry(46, 32),
    new THREE.MeshBasicMaterial({ color: 0xfff6c9, fog: false }),
  );
  sun.position.set(-700, 620, -900);
  sun.lookAt(0, 0, 0);
  scene.add(sun);
  const light = new THREE.DirectionalLight(0xfff2d8, 1.25);
  light.position.set(-600, 800, -400);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0xbcd8e8, 0.85));
  // A few soft clouds: flattened white ellipsoids drifting slowly.
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.92 });
  const clouds = [];
  const rng = makeRng(99);
  for (let i = 0; i < 14; i++) {
    const g = new THREE.Group();
    const puffs = 3 + Math.floor(rng() * 3);
    for (let p = 0; p < puffs; p++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(18 + rng() * 22, 10, 8), cloudMat);
      s.position.set((rng() - 0.5) * 70, (rng() - 0.5) * 8, (rng() - 0.5) * 30);
      s.scale.y = 0.45;
      g.add(s);
    }
    const a = rng() * Math.PI * 2;
    const r = 300 + rng() * 800;
    g.position.set(Math.cos(a) * r, 210 + rng() * 120, Math.sin(a) * r);
    scene.add(g);
    clouds.push(g);
  }
  return { clouds };
}

function buildRunway(scene) {
  const rw = CONFIG.runway;
  const group = new THREE.Group();
  // The strip sits flush with the flattened pad (terrain 2.2 here), so the
  // plane's wheels rest exactly on it.
  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(rw.width, 0.6, rw.length),
    new THREE.MeshLambertMaterial({ color: C.runway }),
  );
  strip.position.set(rw.x, 1.9, rw.z);
  group.add(strip);
  // Centreline dashes and the two threshold bars, just above the strip.
  const markMat = new THREE.MeshLambertMaterial({ color: C.runwayMark });
  for (let d = -rw.length / 2 + 22; d < rw.length / 2 - 10; d += 26) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.15, 12), markMat);
    dash.position.set(rw.x, 2.28, rw.z + d);
    group.add(dash);
  }
  for (const end of [-1, 1]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(rw.width - 6, 0.15, 6), markMat);
    bar.position.set(rw.x, 2.28, rw.z + end * (rw.length / 2 - 10));
    group.add(bar);
  }
  // Four small windsock poles at the corners, for a recognisable airfield.
  const poleMat = new THREE.MeshLambertMaterial({ color: 0xe85d3d });
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 9, 6), poleMat);
      pole.position.set(rw.x + sx * (rw.width / 2 + 8), 6.5, rw.z + sz * (rw.length / 2 - 6));
      group.add(pole);
      const sock = new THREE.Mesh(new THREE.ConeGeometry(1.4, 5, 8), new THREE.MeshLambertMaterial({ color: 0xffc93c }));
      sock.rotation.z = Math.PI / 2;
      sock.position.set(rw.x + sx * (rw.width / 2 + 8) + sx * 2.4, 10.4, rw.z + sz * (rw.length / 2 - 6));
      group.add(sock);
    }
  }
  scene.add(group);
  return group;
}

// A ring course: six rings over the island, each higher and further along
// than the last, so the pilot climbs and turns through the whole island.
export function ringCourse(seed) {
  const rng = makeRng(seed + 31);
  const rings = [];
  let x = 0;
  let z = 300;
  let y = 55;
  for (let i = 0; i < CONFIG.ringCount; i++) {
    const a = rng() * Math.PI * 2;
    const step = 260 + rng() * 160;
    x = Math.max(-750, Math.min(750, x + Math.cos(a) * step));
    z = Math.max(-750, Math.min(750, z + Math.sin(a) * step));
    y = Math.min(230, 50 + i * 26 + rng() * 24);
    rings.push({ x, y, z });
  }
  return rings;
}

// Beacon field: eight glowing orbs scattered over the island at flyable heights.
export function beaconField(seed) {
  const rng = makeRng(seed + 77);
  const beacons = [];
  for (let i = 0; i < CONFIG.beaconCount; i++) {
    const a = (i / CONFIG.beaconCount) * Math.PI * 2 + rng() * 0.5;
    const r = 180 + rng() * 620;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const ground = heightAt(x, z, seed);
    beacons.push({ x, y: Math.max(60, ground + 55 + rng() * 60), z });
  }
  return beacons;
}

// Each ring is its own group (torus + halo) so the game can hide a passed
// ring whole, halo included.
function buildRings(scene, positions) {
  const group = new THREE.Group();
  const items = [];
  for (const p of positions) {
    const item = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(CONFIG.ringRadius, 1.6, 10, 40),
      new THREE.MeshBasicMaterial({ color: C.ring }),
    );
    item.add(ring);
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(CONFIG.ringRadius + 3, 0.7, 8, 40),
      new THREE.MeshBasicMaterial({ color: C.ring, transparent: true, opacity: 0.35 }),
    );
    item.add(halo);
    item.position.set(p.x, p.y, p.z);
    group.add(item);
    items.push(item);
  }
  scene.add(group);
  return { group, items };
}

// Each beacon is its own group (orb + shell) so a collected one vanishes whole.
function buildBeacons(scene, positions) {
  const group = new THREE.Group();
  const items = [];
  for (const p of positions) {
    const item = new THREE.Group();
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(6, 16, 12),
      new THREE.MeshBasicMaterial({ color: C.beacon }),
    );
    item.add(orb);
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(9, 12, 8),
      new THREE.MeshBasicMaterial({ color: C.beacon, transparent: true, opacity: 0.25 }),
    );
    item.add(shell);
    item.position.set(p.x, p.y, p.z);
    group.add(item);
    items.push(item);
  }
  scene.add(group);
  return { group, items };
}

// Build the whole world for a seed. Returns the handles the game loop needs.
export function createWorld(scene, seed) {
  buildTerrain(scene, seed);
  buildWater(scene);
  const sky = buildSky(scene);
  buildRunway(scene);
  const rings = ringCourse(seed);
  const beacons = beaconField(seed);
  const ringMeshes = buildRings(scene, rings);
  const beaconMeshes = buildBeacons(scene, beacons);
  return {
    seed,
    sky,
    rings,
    beacons,
    ringMeshes,
    beaconMeshes,
    heightAt: (x, z) => heightAt(x, z, seed),
  };
}
