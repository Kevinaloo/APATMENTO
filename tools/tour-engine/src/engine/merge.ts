/* Merge the scene by room.

   A hand-modelled apartment is thousands of small meshes; drawn one by one
   that is thousands of draw calls. Merging everything into one mesh per
   material (what the old viewers did) fixes the draw calls but defeats
   frustum culling: the whole flat is drawn even when you face a wall.

   So meshes are bucketed by (container group, room, material, shadow flags)
   where the room comes from the tour's roomAt() at the mesh's world-space
   bounding-box centre. Each bucket becomes one mesh with its own bounding
   sphere, so three culls per room. Geometry is baked into the container's
   local space: the tour's root keeps its own transform (several tours
   mirror X), and the container's world matrix still applies it. */
import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const KEEP_ATTRIBUTES = new Set(['position', 'normal', 'uv']);

type Bucket = { material: T.Material; cast: boolean; receive: boolean; room: string; parts: T.BufferGeometry[] };

export type MergeStats = { meshesBefore: number; meshesAfter: number };

function mergeable(object: T.Object3D, container: T.Object3D): object is T.Mesh {
  const mesh = object as T.Mesh;
  if (!mesh.isMesh || (mesh as T.InstancedMesh).isInstancedMesh || (mesh as T.SkinnedMesh).isSkinnedMesh) return false;
  if (Array.isArray(mesh.material) || mesh.renderOrder !== 0) return false;
  if (mesh.geometry.morphAttributes.position || !mesh.geometry.attributes.position) return false;
  // Kept meshes, and anything under a kept or hidden parent, stay exactly as authored.
  for (let o: T.Object3D | null = object; o && o !== container; o = o.parent) {
    if (o.userData.keep || !o.visible) return false;
  }
  return true;
}

/** A standalone, indexed copy with only position/normal/uv, in the container's space. */
function prepare(mesh: T.Mesh, toContainer: T.Matrix4): T.BufferGeometry {
  const source = mesh.geometry;
  const g = new T.BufferGeometry();
  for (const name of Object.keys(source.attributes)) {
    if (!KEEP_ATTRIBUTES.has(name)) continue;
    const attribute = source.attributes[name];
    const size = attribute.itemSize, length = attribute.count * size;
    // Always a private Float32 copy, so the merge never aliases another mesh's data. Plain arrays copy
    // in one go (a hand-modelled flat has thousands of parts); interleaved or packed ones element by element.
    const data = new Float32Array(length);
    if (!(attribute as T.InterleavedBufferAttribute).isInterleavedBufferAttribute && !attribute.normalized && attribute.array.length >= length) {
      data.set(attribute.array.subarray(0, length));
    } else {
      for (let i = 0; i < attribute.count; i++) for (let c = 0; c < size; c++) data[i * size + c] = attribute.getComponent(i, c);
    }
    g.setAttribute(name, new T.BufferAttribute(data, size));
  }
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) g.setAttribute('uv', new T.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  const count = g.attributes.position.count;
  const length = source.index ? source.index.count : count;
  const index = count > 65535 ? new Uint32Array(length) : new Uint16Array(length);
  if (source.index) index.set(source.index.array.subarray(0, length));
  else for (let i = 0; i < length; i++) index[i] = i;
  // A mirrored part (negative determinant) would turn inside out once baked: flip its winding.
  if (toContainer.determinant() < 0) {
    for (let i = 0; i + 2 < index.length; i += 3) { const a = index[i + 1]; index[i + 1] = index[i + 2]; index[i + 2] = a; }
  }
  g.setIndex(new T.BufferAttribute(index, 1));
  g.applyMatrix4(toContainer);
  return g;
}

export function mergeByRoom(containers: T.Object3D[], roomAt: (x: number, z: number) => string): MergeStats {
  const box = new T.Box3(), centre = new T.Vector3(), toContainer = new T.Matrix4(), inverse = new T.Matrix4();
  let meshesBefore = 0, meshesAfter = 0;

  for (const container of containers) {
    container.updateWorldMatrix(true, true);
    inverse.copy(container.matrixWorld).invert();
    const buckets = new Map<string, Bucket>();
    const consumed: T.Mesh[] = [];
    const keptGeometries = new Set<T.BufferGeometry>();

    container.traverse(object => {
      if ((object as T.Mesh).isMesh) meshesBefore++;
      if (!mergeable(object, container)) {
        if ((object as T.Mesh).isMesh) keptGeometries.add((object as T.Mesh).geometry);
        return;
      }
      const mesh = object;
      const material = mesh.material as T.Material;
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      box.copy(mesh.geometry.boundingBox!).applyMatrix4(mesh.matrixWorld).getCenter(centre);
      const room = roomAt(centre.x, centre.z) || 'hall';
      const key = room + '|' + material.uuid + '|' + mesh.castShadow + '|' + mesh.receiveShadow;
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = { material, cast: mesh.castShadow, receive: mesh.receiveShadow, room, parts: [] };
        buckets.set(key, bucket);
      }
      toContainer.multiplyMatrices(inverse, mesh.matrixWorld);
      bucket.parts.push(prepare(mesh, toContainer));
      consumed.push(mesh);
    });

    const disposable = new Set<T.BufferGeometry>();
    for (const mesh of consumed) {
      mesh.removeFromParent();
      if (!keptGeometries.has(mesh.geometry)) disposable.add(mesh.geometry);
    }
    disposable.forEach(g => g.dispose());

    for (const bucket of buckets.values()) {
      const geometry = bucket.parts.length === 1 ? bucket.parts[0] : mergeGeometries(bucket.parts, false);
      if (bucket.parts.length > 1) bucket.parts.forEach(g => g.dispose());
      if (!geometry) continue;
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      const merged = new T.Mesh(geometry, bucket.material);
      merged.name = bucket.room + ':' + (bucket.material.name || bucket.material.type);
      merged.userData.room = bucket.room;
      merged.castShadow = bucket.cast;
      merged.receiveShadow = bucket.receive;
      merged.matrixAutoUpdate = false;
      container.add(merged);
    }

    pruneEmpty(container);
    container.traverse(o => { if ((o as T.Mesh).isMesh) meshesAfter++; });
  }
  return { meshesBefore, meshesAfter };
}

/** Furniture groups emptied by the merge would still be walked every frame by updateMatrixWorld. */
function pruneEmpty(object: T.Object3D) {
  for (let i = object.children.length - 1; i >= 0; i--) {
    const child = object.children[i];
    pruneEmpty(child);
    if (child.children.length === 0 && (child.type === 'Group' || child.type === 'Object3D') && !child.userData.keep) {
      object.remove(child);
    }
  }
}
