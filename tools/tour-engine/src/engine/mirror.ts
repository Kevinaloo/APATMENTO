/* The budgeted mirror.

   A Reflector re-renders the whole scene from the mirrored camera every
   time it is drawn: one mirror doubles the cost of a frame. Here it only
   re-renders when it is worth it: the engine arms it before a main-scene
   render when the mirror is within 6 m (three's frustum culling already
   skips it when it is out of view), and while moving only every third
   frame. In between it shows its last reflection, which at walking speed
   nobody notices. With the live mirror off (battery tier) a polished-metal
   stand-in reflects the room environment instead, at no cost. */
import * as T from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import type { TourDefinition } from '../contract';

const RANGE = 6;

export class BudgetMirror {
  readonly group = new T.Group();
  private readonly reflector: Reflector;
  private readonly fallback: T.Mesh;
  private readonly geometry: T.BufferGeometry;
  private readonly fallbackMaterial: T.MeshStandardMaterial;
  private readonly position = new T.Vector3();
  private armed = false;
  private live = true;
  /** Draws since the reflection was last refreshed: a fresh one is due as soon as it is in range. */
  stale = true;

  constructor(spec: NonNullable<TourDefinition['mirror']>, resolution: number) {
    const [w, h] = spec.size;
    // Circle: size is the diameter across and down; an oval is a circle scaled in y.
    this.geometry = spec.shape === 'circle' ? new T.CircleGeometry(w / 2, 48) : new T.PlaneGeometry(w, h);
    const sy = (spec.shape === 'circle' ? h / w : 1) * (spec.scaleY ?? 1);
    const tint = spec.tint ?? 0xc9d0c8;
    this.reflector = new Reflector(this.geometry, {
      textureWidth: Math.max(1, resolution), textureHeight: Math.max(1, resolution),
      color: tint, clipBias: 0.003, multisample: 0,
    });
    this.reflector.name = 'mirror';
    this.fallbackMaterial = new T.MeshStandardMaterial({ color: tint, metalness: 1, roughness: 0.08 });
    this.fallback = new T.Mesh(this.geometry, this.fallbackMaterial);
    this.fallback.name = 'mirror-fallback';
    this.group.add(this.reflector, this.fallback);
    this.group.position.set(spec.position[0], spec.position[1], spec.position[2]);
    this.group.rotation.y = spec.rotationY;
    this.group.scale.y = sy;
    this.group.updateMatrixWorld(true);
    this.position.copy(this.group.position);

    // Gate the Reflector's own render: it runs only when armed, and disarms itself after one go,
    // so the ambient-occlusion normal pass (which draws the scene again) never re-renders it.
    const render = this.reflector.onBeforeRender;
    this.reflector.onBeforeRender = (renderer, scene, camera, geometry, material, group) => {
      if (!this.armed) return;
      this.armed = false;
      this.stale = false;
      render.call(this.reflector, renderer, scene, camera, geometry, material, group);
    };
    this.setResolution(resolution);
  }

  setResolution(size: number) {
    this.live = size > 0;
    this.reflector.visible = this.live;
    this.fallback.visible = !this.live;
    if (this.live) this.reflector.getRenderTarget().setSize(size, size);
    this.stale = true;
  }

  setVisible(visible: boolean) { this.group.visible = visible; }

  /** Show both meshes for the startup warm-up so both programs compile before the first step. */
  warmup(on: boolean) {
    this.reflector.visible = on || this.live;
    this.fallback.visible = on || !this.live;
  }

  /** Call right before a main-scene render. */
  arm(camera: T.Camera, moving: boolean, frame: number) {
    const near = camera.position.distanceTo(this.position) < RANGE;
    if (!near) this.stale = true;
    this.armed = this.live && this.group.visible && near && (!moving || this.stale || frame % 3 === 0);
  }

  /** Force a refresh for the next render regardless of distance (postcards). */
  force() { this.armed = this.live && this.group.visible; }

  /** After the render: still armed means it was culled, so its reflection is out of date. */
  disarm() {
    if (this.armed) this.stale = true;
    this.armed = false;
  }

  dispose() {
    this.reflector.dispose();
    this.geometry.dispose();
    this.fallbackMaterial.dispose();
  }
}
