import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { CONFIG } from '../config';
import { toon } from '../render/ToonMaterials';
import { outlineTree, refreshInstancedBounds } from '../render/Outline';
import { mergeStatic } from '../render/Merge';
import { TrackLayout } from './TrackLayout';
import { mulberry32 } from '../utils/random';

/**
 * The scrolling street. The player stays near z = 0 and the world moves toward +z:
 * something at track distance d is drawn at z = -(d - distance). This keeps every
 * coordinate small no matter how long the run lasts.
 *
 * Track chunks are pooled: a fixed set of road segments with placeholder terraces
 * on each side, re-dressed with new heights and colours whenever they are recycled.
 */

const ROAD_WIDTH = CONFIG.lanes.width * CONFIG.lanes.count + 1.4;
const PAVE_W = CONFIG.world.pavementWidth;

interface Chunk {
  group: THREE.Group;
  buildings: THREE.InstancedMesh;
  lamps: THREE.InstancedMesh;
}

export class World {
  readonly root = new THREE.Group();
  readonly layout: TrackLayout;
  private readonly chunks: Chunk[] = [];
  private readonly rng = mulberry32(1234);
  private readonly tmpMat = new THREE.Matrix4();
  private readonly tmpPos = new THREE.Vector3();
  private readonly tmpQuat = new THREE.Quaternion();
  private readonly tmpScale = new THREE.Vector3();
  private readonly tmpColor = new THREE.Color();

  constructor(scene: THREE.Scene) {
    const { chunkCount, chunkLength, recycleBehind } = CONFIG.world;
    this.layout = new TrackLayout(chunkCount, chunkLength, recycleBehind);

    // Shared geometry for every chunk.
    const L = chunkLength;
    const roadGeo = new THREE.PlaneGeometry(ROAD_WIDTH, L).rotateX(-Math.PI / 2).translate(0, 0, -L / 2);
    // Wide ground under everything so no sky peeks through gaps between buildings.
    const groundGeo = new THREE.PlaneGeometry(90, L + 0.05).rotateX(-Math.PI / 2).translate(0, -0.02, -L / 2);
    const paveGeo = new RoundedBoxGeometry(PAVE_W, 0.3, L + 0.02, 1, 0.08).translate(0, 0.15, -L / 2);
    const dashGeo = new THREE.PlaneGeometry(0.14, 1.8).rotateX(-Math.PI / 2);
    const edgeGeo = new THREE.PlaneGeometry(0.12, L).rotateX(-Math.PI / 2).translate(0, 0, -L / 2);
    const buildingGeo = new RoundedBoxGeometry(1, 1, 1, 2, 0.06).translate(0, 0.5, 0);
    const lampGeo = new THREE.CylinderGeometry(0.07, 0.09, 1, 6).translate(0, 0.5, 0);

    const roadMat = toon(CONFIG.colors.road);
    const paveMat = toon(CONFIG.colors.pavement);
    const markMat = toon(CONFIG.colors.roadMarking);
    const buildingMat = toon(0xffffff);
    const lampMat = toon(0x2f3a35);

    const dashesPerLine = Math.floor(L / 5);
    const dividers = CONFIG.lanes.count - 1;

    // Road, ground, pavements, kerb lines and lane dashes are identical in every chunk:
    // build them once and bake them into a single vertex-coloured mesh (1 draw call).
    const base = new THREE.Group();
    base.add(new THREE.Mesh(roadGeo, roadMat));
    base.add(new THREE.Mesh(groundGeo, toon(CONFIG.colors.kerb)));
    for (const side of [-1, 1]) {
      const pave = new THREE.Mesh(paveGeo, paveMat);
      pave.position.x = side * (ROAD_WIDTH / 2 + PAVE_W / 2);
      base.add(pave);
      const edge = new THREE.Mesh(edgeGeo, markMat);
      edge.position.set(side * (ROAD_WIDTH / 2 - 0.35), 0.012, 0);
      base.add(edge);
    }
    for (let d = 0; d < dividers; d++) {
      const x = (d - (dividers - 1) / 2) * CONFIG.lanes.width;
      for (let k = 0; k < dashesPerLine; k++) {
        const dash = new THREE.Mesh(dashGeo, markMat);
        dash.position.set(x, 0.01, -(k + 0.5) * (L / dashesPerLine));
        base.add(dash);
      }
    }
    mergeStatic(base);
    const baseMesh = base.children[0] as THREE.Mesh;
    baseMesh.geometry.computeBoundingSphere();

    for (let i = 0; i < chunkCount; i++) {
      const group = new THREE.Group();
      group.add(new THREE.Mesh(baseMesh.geometry, baseMesh.material));

      // Placeholder terraces: re-dressed on every recycle.
      const perSide = CONFIG.world.buildingsPerSide;
      const buildings = new THREE.InstancedMesh(buildingGeo, buildingMat, perSide * 2);
      buildings.setColorAt(0, this.tmpColor.set(0xffffff));
      outlineTree(buildings);
      group.add(buildings);

      const lamps = new THREE.InstancedMesh(lampGeo, lampMat, 4);
      group.add(lamps);

      this.chunks.push({ group, buildings, lamps });
      this.root.add(group);
    }

    scene.add(this.root);
    this.reset();
  }

  reset(): void {
    this.layout.reset();
    for (let i = 0; i < this.chunks.length; i++) this.dress(i);
    this.update(0);
  }

  update(distance: number): void {
    this.layout.update(distance, (i) => this.dress(i));
    for (let i = 0; i < this.chunks.length; i++) {
      this.chunks[i].group.position.z = -(this.layout.starts[i] - distance);
    }
  }

  /** Give a chunk a fresh row of terraces and lamp posts. Allocation-free. */
  private dress(i: number): void {
    const { buildings, lamps } = this.chunks[i];
    const L = CONFIG.world.chunkLength;
    const perSide = CONFIG.world.buildingsPerSide;
    const palette = CONFIG.colors.buildings;
    const slot = L / perSide;
    const baseX = ROAD_WIDTH / 2 + PAVE_W + 0.4;
    let n = 0;
    for (let s = 0; s < 2; s++) {
      const side = s === 0 ? -1 : 1;
      for (let k = 0; k < perSide; k++) {
        const r = this.rng;
        const width = slot - 0.3;
        const height = 4.5 + r() * 6.5;
        const depth = 6 + r() * 4;
        this.tmpPos.set(side * (baseX + depth / 2 + r() * 0.8), 0, -(k + 0.5) * slot);
        this.tmpScale.set(depth, height, width);
        this.tmpMat.compose(this.tmpPos, this.tmpQuat, this.tmpScale);
        buildings.setMatrixAt(n, this.tmpMat);
        buildings.setColorAt(n, this.tmpColor.setHex(palette[Math.floor(r() * palette.length)]));
        n++;
      }
    }
    buildings.instanceMatrix.needsUpdate = true;
    if (buildings.instanceColor) buildings.instanceColor.needsUpdate = true;
    refreshInstancedBounds(buildings);

    let m = 0;
    for (let s = 0; s < 2; s++) {
      const side = s === 0 ? -1 : 1;
      for (let k = 0; k < 2; k++) {
        this.tmpPos.set(side * (ROAD_WIDTH / 2 + 0.6), 0.3, -(k + 0.25) * (L / 2));
        this.tmpScale.set(1, 4.2, 1);
        this.tmpMat.compose(this.tmpPos, this.tmpQuat, this.tmpScale);
        lamps.setMatrixAt(m++, this.tmpMat);
      }
    }
    lamps.instanceMatrix.needsUpdate = true;
    lamps.computeBoundingSphere();
  }
}
