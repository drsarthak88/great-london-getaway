import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { CONFIG } from '../config';
import { toon, toonMap, toonVertexColors } from '../render/ToonMaterials';
import { outlineTree } from '../render/Outline';
import { mergeStatic } from '../render/Merge';
import { TrackLayout } from './TrackLayout';
import { mulberry32 } from '../utils/random';
import { ZONES, type ZoneDef } from '../data/zones';
import { clearance, riverAt, zoneIndexAt } from './Zones';

/**
 * The scrolling street. The player stays near z = 0 and the world moves toward +z:
 * something at track distance d is drawn at z = -(d - distance).
 *
 * Street chunks are pooled. When a chunk is recycled it is re-dressed for the zone it
 * now sits in: road/pavement/ground colours, bright terraces with windows, doors and
 * chimneys (or park trees), the river, gas lamps and market stalls. Everything per
 * chunk is instanced, so a chunk costs a fixed handful of draw calls.
 */

const ROAD_WIDTH = CONFIG.lanes.width * CONFIG.lanes.count + 1.4;
const PAVE_W = CONFIG.world.pavementWidth;
export const ROAD_HALF = ROAD_WIDTH / 2;
/** Distance from the road centre to the far edge of the pavement. */
export const STREET_EDGE = ROAD_HALF + PAVE_W;

const WINDOW_COLS = 3;
const WINDOW_ROWS = 4;

type Part = 'road' | 'mark' | 'pave' | 'ground';

interface Chunk {
  group: THREE.Group;
  base: THREE.Mesh;
  water: [THREE.Mesh, THREE.Mesh];
}

/** Per-chunk instance capacity of each shared instanced mesh. */
const CAP = {
  buildings: CONFIG.world.buildingsPerSide * 2,
  windows: CONFIG.world.buildingsPerSide * 2 * WINDOW_COLS * WINDOW_ROWS,
  doors: CONFIG.world.buildingsPerSide * 2,
  chimneys: CONFIG.world.buildingsPerSide * 2,
  trees: CONFIG.world.buildingsPerSide * 2,
  stalls: 6,
  lamps: 4,
};

export class World {
  readonly root = new THREE.Group();
  readonly layout: TrackLayout;
  /** Shared lantern material, brightened in fog. */
  readonly lanternMat: THREE.MeshToonMaterial;
  private readonly waterTex: THREE.Texture;
  private readonly chunks: Chunk[] = [];
  /**
   * Street furniture shared by all chunks: one instanced mesh per kind, each chunk
   * owning a fixed slice of instances. Everything lives in track space inside `root`,
   * which slides toward the camera as the run advances, so only re-dressed chunks
   * ever rewrite their instances.
   */
  private buildings!: THREE.InstancedMesh;
  private windows!: THREE.InstancedMesh;
  private doors!: THREE.InstancedMesh;
  private chimneys!: THREE.InstancedMesh;
  private trunks!: THREE.InstancedMesh;
  private canopies!: THREE.InstancedMesh;
  private stalls!: THREE.InstancedMesh;
  private lamps!: THREE.InstancedMesh;
  private lanterns!: THREE.InstancedMesh;
  private readonly zero = new THREE.Matrix4().makeScale(0, 0, 0);
  private readonly rng = mulberry32(1234);
  private readonly tmpMat = new THREE.Matrix4();
  private readonly tmpPos = new THREE.Vector3();
  private readonly tmpQuat = new THREE.Quaternion();
  private readonly tmpScale = new THREE.Vector3();
  private readonly tmpColor = new THREE.Color();
  private readonly yAxis = new THREE.Vector3(0, 1, 0);
  /** Which part (road, marking, pavement, ground) each base vertex belongs to. */
  private readonly partOf: Part[] = [];
  private time = 0;

  constructor(scene: THREE.Scene) {
    const { chunkCount, chunkLength, recycleBehind } = CONFIG.world;
    this.layout = new TrackLayout(chunkCount, chunkLength, recycleBehind);
    const L = chunkLength;

    const baseGeo = this.buildBaseGeometry(L);
    const buildingGeo = new RoundedBoxGeometry(1, 1, 1, 2, 0.04).translate(0, 0.5, 0);
    const windowGeo = new THREE.PlaneGeometry(1, 1);
    const chimneyGeo = new RoundedBoxGeometry(1, 1, 1, 1, 0.08).translate(0, 0.5, 0);
    const trunkGeo = new THREE.CylinderGeometry(0.22, 0.3, 1, 8).translate(0, 0.5, 0);
    const canopyGeo = new THREE.SphereGeometry(1, 14, 10);
    const stallGeo = buildStallGeometry();
    const lampGeo = new THREE.CylinderGeometry(0.08, 0.1, 1, 6).translate(0, 0.5, 0);
    const lanternGeo = new RoundedBoxGeometry(0.42, 0.55, 0.42, 1, 0.08);
    const waterGeo = new THREE.PlaneGeometry(40, L + 0.05).rotateX(-Math.PI / 2).translate(0, 0.02, -L / 2);

    const buildingMat = toon(0xffffff);
    const windowMat = toonMap(windowTexture());
    const doorMat = toonMap(doorTexture());
    this.lanternMat = toon(0xffe58a, { emissive: 0xffc23a, emissiveIntensity: 0.7 });
    this.waterTex = waterTexture();
    const waterMat = toonMap(this.waterTex, { emissive: 0x0f8fc0, emissiveIntensity: 0.25 });

    const n = chunkCount;
    const shared = (geo: THREE.BufferGeometry, mat: THREE.Material, cap: number, colours: boolean, outline: boolean): THREE.InstancedMesh => {
      const im = new THREE.InstancedMesh(geo, mat, cap * n);
      if (colours) im.setColorAt(0, this.tmpColor.set(0xffffff));
      for (let k = 0; k < cap * n; k++) im.setMatrixAt(k, this.zero);
      im.frustumCulled = false;
      if (outline) {
        outlineTree(im);
        (im.children[0] as THREE.InstancedMesh).frustumCulled = false;
      }
      this.root.add(im);
      return im;
    };
    this.buildings = shared(buildingGeo, buildingMat, CAP.buildings, true, true);
    this.windows = shared(windowGeo, windowMat, CAP.windows, false, false);
    this.doors = shared(windowGeo, doorMat, CAP.doors, true, false);
    this.chimneys = shared(chimneyGeo, buildingMat, CAP.chimneys, true, true);
    this.trunks = shared(trunkGeo, toon(0x9a5b2e), CAP.trees, false, false);
    this.canopies = shared(canopyGeo, buildingMat, CAP.trees, true, true);
    this.stalls = shared(stallGeo, toonVertexColors(), CAP.stalls, false, true);
    this.lamps = shared(lampGeo, toon(0x24324a), CAP.lamps, false, false);
    this.lanterns = shared(lanternGeo, this.lanternMat, CAP.lamps, false, false);

    for (let i = 0; i < chunkCount; i++) {
      const group = new THREE.Group();

      // Base shares positions/normals with every chunk but has its own colours.
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', baseGeo.attributes.position);
      geo.setAttribute('normal', baseGeo.attributes.normal);
      geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(baseGeo.attributes.position.count * 3), 3));
      geo.boundingSphere = baseGeo.boundingSphere;
      const base = new THREE.Mesh(geo, toonVertexColors());
      group.add(base);

      const water: [THREE.Mesh, THREE.Mesh] = [new THREE.Mesh(waterGeo, waterMat), new THREE.Mesh(waterGeo, waterMat)];
      water[0].position.x = -(STREET_EDGE + 20);
      water[1].position.x = STREET_EDGE + 20;
      group.add(water[0], water[1]);

      this.chunks.push({ group, base, water });
      this.root.add(group);
    }

    scene.add(this.root);
    this.reset();
  }

  reset(): void {
    this.layout.reset();
    for (let i = 0; i < this.chunks.length; i++) this.dress(i);
    this.update(0, 0);
  }

  update(distance: number, dt = 0): void {
    this.time += dt;
    this.layout.update(distance, (i) => this.dress(i));
    // Everything is laid out in track space; slide the whole street toward the camera.
    this.root.position.z = distance;
    // Ripple the river.
    this.waterTex.offset.set(this.time * 0.03, this.time * 0.05);
  }

  /** Build the road/markings/pavement/ground base once, remembering which part each vertex is. */
  private buildBaseGeometry(L: number): THREE.BufferGeometry {
    const parts: [THREE.BufferGeometry, Part, number, number, number][] = [];
    parts.push([new THREE.PlaneGeometry(ROAD_WIDTH, L).rotateX(-Math.PI / 2).translate(0, 0, -L / 2), 'road', 0, 0, 0]);
    parts.push([new THREE.PlaneGeometry(90, L + 0.05).rotateX(-Math.PI / 2).translate(0, -0.03, -L / 2), 'ground', 0, 0, 0]);
    const paveGeo = new RoundedBoxGeometry(PAVE_W, 0.3, L + 0.02, 1, 0.08).translate(0, 0.15, -L / 2);
    const edgeGeo = new THREE.PlaneGeometry(0.14, L).rotateX(-Math.PI / 2).translate(0, 0, -L / 2);
    for (const side of [-1, 1]) {
      parts.push([paveGeo.clone(), 'pave', side * (ROAD_HALF + PAVE_W / 2), 0, 0]);
      parts.push([edgeGeo.clone(), 'mark', side * (ROAD_HALF - 0.35), 0.012, 0]);
    }
    const dashGeo = new THREE.PlaneGeometry(0.16, 1.8).rotateX(-Math.PI / 2);
    const dashes = Math.floor(L / 5);
    for (let dv = 0; dv < CONFIG.lanes.count - 1; dv++) {
      const x = (dv - (CONFIG.lanes.count - 2) / 2) * CONFIG.lanes.width;
      for (let k = 0; k < dashes; k++) parts.push([dashGeo.clone(), 'mark', x, 0.012, -(k + 0.5) * (L / dashes)]);
    }
    const g = new THREE.Group();
    const meshes: THREE.Mesh[] = [];
    for (const [geo, part, x, y, z] of parts) {
      const m = new THREE.Mesh(geo.index ? geo.toNonIndexed() : geo, toon(0xffffff));
      m.position.set(x, y, z);
      m.userData.part = part;
      g.add(m);
      meshes.push(m);
    }
    // Record vertex ranges per part in merge order, then merge.
    for (const m of meshes) {
      const n = m.geometry.attributes.position.count;
      for (let k = 0; k < n; k++) this.partOf.push(m.userData.part as Part);
    }
    mergeStatic(g);
    const merged = (g.children[0] as THREE.Mesh).geometry;
    merged.computeBoundingSphere();
    return merged;
  }

  private colorBase(c: Chunk, z: ZoneDef): void {
    const attr = c.base.geometry.attributes.color as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const road = new THREE.Color(z.road);
    const pave = new THREE.Color(z.pavement);
    const ground = new THREE.Color(z.ground);
    const mark = new THREE.Color(0xfffaf0);
    for (let v = 0; v < this.partOf.length; v++) {
      const p = this.partOf[v];
      const col = p === 'road' ? road : p === 'pave' ? pave : p === 'ground' ? ground : mark;
      arr[v * 3] = col.r;
      arr[v * 3 + 1] = col.g;
      arr[v * 3 + 2] = col.b;
    }
    attr.needsUpdate = true;
  }

  /** Dress a chunk for the zone it now sits in. Runs only when a chunk is recycled. */
  private dress(i: number): void {
    const c = this.chunks[i];
    const L = CONFIG.world.chunkLength;
    const d0 = this.layout.starts[i];
    const mid = d0 + L / 2;
    const zone = ZONES[zoneIndexAt(mid)];
    c.group.position.z = -d0;
    this.colorBase(c, zone);
    // Each chunk owns slots [i * cap, (i + 1) * cap) of every shared instanced mesh.
    const ob = i * CAP.buildings;
    const ow = i * CAP.windows;
    const ot = i * CAP.trees;
    const os = i * CAP.stalls;
    const ol = i * CAP.lamps;
    const zBase = -d0;

    const rivers = [riverAt(-1, mid), riverAt(1, mid)];
    c.water[0].visible = rivers[0];
    c.water[1].visible = rivers[1];

    const perSide = CONFIG.world.buildingsPerSide;
    const slot = L / perSide;
    const baseX = STREET_EDGE + 0.4;
    const r = this.rng;
    let nb = 0;
    let nw = 0;
    let nd = 0;
    let nt = 0;
    for (let s = 0; s < 2; s++) {
      const side = s === 0 ? -1 : 1;
      for (let k = 0; k < perSide; k++) {
        const z = zBase - (k + 0.5) * slot;
        const dCentre = d0 + (k + 0.5) * slot;
        const hidden = rivers[s] || clearance(side as -1 | 1, dCentre - slot / 2, dCentre + slot / 2);
        if (hidden) continue;
        if (zone.trees) {
          // Park: lollipop trees on the grass.
          const h = 2.2 + r() * 1.2;
          this.tmpPos.set(side * (baseX + 1.5 + r() * 2), 0, z + (r() - 0.5) * 2);
          this.place(this.trunks, ot + nt, this.tmpPos, 1, h, 1);
          this.tmpPos.y = h + 1.1;
          const sz = 1.7 + r() * 0.8;
          this.place(this.canopies, ot + nt, this.tmpPos, sz, sz * 0.95, sz);
          this.canopies.setColorAt(ot + nt, this.tmpColor.setHex(r() < 0.5 ? 0x4cc95a : r() < 0.5 ? 0x7ed957 : 0x2fb34a));
          nt++;
          continue;
        }
        const width = slot - 0.35;
        const height = 5.5 + r() * 5.5;
        const depth = 6 + r() * 3;
        const x = side * (baseX + depth / 2);
        this.tmpPos.set(x, 0, z);
        this.place(this.buildings, ob + nb, this.tmpPos, depth, height, width);
        this.buildings.setColorAt(ob + nb, this.tmpColor.setHex(zone.buildings[Math.floor(r() * zone.buildings.length)]));
        // Chimney stack on the roof.
        this.tmpPos.set(x + side * (r() - 0.5) * 2, height, z + (r() - 0.5) * (width - 1.5));
        this.place(this.chimneys, ob + nb, this.tmpPos, 0.8, 0.9 + r() * 0.6, 1.2);
        this.chimneys.setColorAt(ob + nb, this.tmpColor.setHex(r() < 0.5 ? 0xd9542f : 0xffc93c));
        nb++;
        // Windows on the road-facing facade, and a bright front door.
        const faceX = side * (baseX - 0.03);
        const rot = -side * (Math.PI / 2);
        const floors = Math.min(WINDOW_ROWS, Math.floor((height - 2.4) / 1.9) + 1);
        for (let row = 0; row < floors; row++) {
          for (let col = 0; col < WINDOW_COLS; col++) {
            if (row === 0 && col === 1) continue; // door goes here
            this.tmpPos.set(faceX, 1.5 + row * 1.9, z + (col - 1) * (width / 3.2));
            this.placeRot(this.windows, ow + nw++, this.tmpPos, rot, 0.95, 1.25);
          }
        }
        this.tmpPos.set(faceX, 1.0, z);
        this.placeRot(this.doors, ob + nd, this.tmpPos, rot, 1.0, 2.0);
        this.doors.setColorAt(ob + nd++, this.tmpColor.setHex(zone.doors[Math.floor(r() * zone.doors.length)]));
      }
    }
    this.finishSlice(this.buildings, ob, nb, CAP.buildings);
    this.finishSlice(this.chimneys, ob, nb, CAP.chimneys);
    this.finishSlice(this.windows, ow, nw, CAP.windows);
    this.finishSlice(this.doors, ob, nd, CAP.doors);
    this.finishSlice(this.trunks, ot, nt, CAP.trees);
    this.finishSlice(this.canopies, ot, nt, CAP.trees);

    // Market stalls along the pavement (Camden).
    let ns = 0;
    if (zone.stalls) {
      const off0 = (d0 % CONFIG.zones.length + CONFIG.zones.length) % CONFIG.zones.length;
      for (let k = 0; k < 3; k++) {
        const off = off0 + (k + 0.5) * (L / 3);
        if (off < zone.stalls[0] || off > zone.stalls[1]) continue;
        for (let s = 0; s < 2; s++) {
          const side = s === 0 ? -1 : 1;
          if (rivers[s]) continue;
          this.tmpPos.set(side * (ROAD_HALF + PAVE_W * 0.55), 0.3, zBase - (k + 0.5) * (L / 3));
          this.placeRot(this.stalls, os + ns++, this.tmpPos, -side * (Math.PI / 2), 1, 1);
        }
      }
    }
    this.finishSlice(this.stalls, os, ns, CAP.stalls);

    // Lamp posts with glowing lanterns (Victorian gas lamps on Baker Street are taller).
    let m = 0;
    const lampH = zone.gasLamps ? 3.6 : 4.2;
    for (let s = 0; s < 2; s++) {
      const side = s === 0 ? -1 : 1;
      for (let k = 0; k < 2; k++) {
        const z = zBase - (k + 0.25) * (L / 2);
        this.tmpPos.set(side * (ROAD_HALF + 0.6), 0.3, z);
        this.place(this.lamps, ol + m, this.tmpPos, 1, lampH, 1);
        this.tmpPos.y = 0.3 + lampH + 0.25;
        const ls = zone.gasLamps ? 1.25 : 0.9;
        this.place(this.lanterns, ol + m, this.tmpPos, ls, ls, ls);
        m++;
      }
    }
    this.finishSlice(this.lamps, ol, m, CAP.lamps);
    this.finishSlice(this.lanterns, ol, m, CAP.lamps);
  }

  private place(im: THREE.InstancedMesh, i: number, pos: THREE.Vector3, sx: number, sy: number, sz: number): void {
    this.tmpQuat.identity();
    this.tmpScale.set(sx, sy, sz);
    this.tmpMat.compose(pos, this.tmpQuat, this.tmpScale);
    im.setMatrixAt(i, this.tmpMat);
  }

  private placeRot(im: THREE.InstancedMesh, i: number, pos: THREE.Vector3, rotY: number, sx: number, sy: number): void {
    this.tmpQuat.setFromAxisAngle(this.yAxis, rotY);
    this.tmpScale.set(sx, sy, 1);
    this.tmpMat.compose(pos, this.tmpQuat, this.tmpScale);
    im.setMatrixAt(i, this.tmpMat);
  }

  /** Hide this chunk's unused slots and flag the buffers for upload. */
  private finishSlice(im: THREE.InstancedMesh, offset: number, used: number, cap: number): void {
    for (let k = used; k < cap; k++) im.setMatrixAt(offset + k, this.zero);
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
  }

}

// ---------- procedural textures and shapes ----------

function canvas(w: number, h: number, draw: (x: CanvasRenderingContext2D) => void): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** A sash window: white frame, sky-blue panes with a shine, and a window box of flowers. */
function windowTexture(): THREE.Texture {
  return canvas(64, 80, (x) => {
    x.fillStyle = '#ffffff';
    x.fillRect(0, 0, 64, 80);
    x.fillStyle = '#7fd3ff';
    x.fillRect(7, 6, 23, 26);
    x.fillRect(34, 6, 23, 26);
    x.fillRect(7, 36, 23, 26);
    x.fillRect(34, 36, 23, 26);
    x.fillStyle = 'rgba(255,255,255,0.7)';
    x.fillRect(10, 9, 6, 14);
    x.fillRect(37, 9, 6, 14);
    x.fillStyle = '#4cc95a';
    x.fillRect(2, 66, 60, 12);
    for (let i = 0; i < 6; i++) {
      x.fillStyle = ['#ff4d6d', '#ffc93c', '#ff8fb1'][i % 3];
      x.beginPath();
      x.arc(8 + i * 10, 67, 4.5, 0, Math.PI * 2);
      x.fill();
    }
  });
}

/** A panelled front door (tinted per instance), with a fanlight and brass knob. */
function doorTexture(): THREE.Texture {
  return canvas(64, 128, (x) => {
    x.fillStyle = '#ffffff';
    x.fillRect(0, 0, 64, 128);
    x.fillStyle = '#ffe9a8';
    x.beginPath();
    x.arc(32, 22, 22, Math.PI, 0);
    x.fill();
    x.strokeStyle = 'rgba(0,0,0,0.25)';
    x.lineWidth = 3;
    x.strokeRect(10, 30, 19, 40);
    x.strokeRect(35, 30, 19, 40);
    x.strokeRect(10, 78, 19, 40);
    x.strokeRect(35, 78, 19, 40);
    x.fillStyle = '#ffc21a';
    x.beginPath();
    x.arc(48, 76, 4, 0, Math.PI * 2);
    x.fill();
  });
}

/** Bright turquoise water with lighter ripples. */
function waterTexture(): THREE.Texture {
  const t = canvas(128, 128, (x) => {
    x.fillStyle = '#2ec4f0';
    x.fillRect(0, 0, 128, 128);
    x.strokeStyle = 'rgba(255,255,255,0.55)';
    x.lineWidth = 3;
    for (let i = 0; i < 9; i++) {
      const y = (i * 37) % 128;
      const xx = (i * 53) % 128;
      x.beginPath();
      x.arc(xx, y, 10, Math.PI * 0.15, Math.PI * 0.85);
      x.stroke();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(6, 6);
  return t;
}

/** A market stall: posts, a counter of goods and a bright striped awning (vertex-coloured). */
function buildStallGeometry(): THREE.BufferGeometry {
  const g = new THREE.Group();
  const add = (geo: THREE.BufferGeometry, col: number, x: number, y: number, z: number, rx = 0) => {
    const m = new THREE.Mesh(geo, toon(col));
    m.position.set(x, y, z);
    m.rotation.x = rx;
    g.add(m);
  };
  for (const x of [-1.1, 1.1]) for (const z of [-0.5, 0.5]) add(new THREE.BoxGeometry(0.1, 2.2, 0.1), 0xffffff, x, 1.1, z);
  add(new THREE.BoxGeometry(2.4, 0.8, 1.1), 0x9a5b2e, 0, 0.4, 0);
  const goods = [0xff4d6d, 0xffc93c, 0x7ed957, 0x46b5ff, 0xff8a3d];
  for (let i = 0; i < 5; i++) add(new THREE.SphereGeometry(0.2, 8, 6), goods[i], -0.9 + i * 0.45, 0.95, 0);
  const stripes = [0xff4d6d, 0xffffff, 0x2ec4b6, 0xffffff, 0xffc93c, 0xffffff];
  stripes.forEach((col, i) => add(new THREE.BoxGeometry(2.6 / stripes.length, 0.08, 1.6), col, -1.3 + (i + 0.5) * (2.6 / stripes.length), 2.3, 0.1, -0.25));
  mergeStatic(g);
  return (g.children[0] as THREE.Mesh).geometry;
}
