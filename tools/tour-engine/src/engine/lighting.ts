/* Live Light: the real sun over the property, and what it does indoors.

   The rig never changes shape (1 hemisphere, 1 ambient, 1 shadow-casting
   directional sun, 3 lamp proxies), so moving through the day only changes
   uniforms: no shader ever recompiles while the hour slider moves.

   Above the horizon the sun's colour follows its elevation (amber when low,
   neutral white high) and its strength ramps from nothing at −2° to full by
   20°; furniture throws long raking shadows when it is low. Below the
   horizon the sun is off, the sky turns blue, and the lamps and glowing
   shades take over. Live weather dims the direct sun with cloud and cools
   everything a touch in rain. */
import * as T from 'three';
import type { TourDefinition, TourModel, Weather } from '../contract';
import { LampProxies } from './lamps';
import { kelvinToRGB, type SunPosition } from './sun';
import { lerp, smoothstep } from './util';

const RAD = Math.PI / 180;

export class LightRig {
  readonly hemi: T.HemisphereLight;
  readonly ambient: T.AmbientLight;
  readonly sun: T.DirectionalLight;
  readonly lamps: LampProxies;
  /** Background colour for the current hour (linear, like every T.Color). */
  readonly background = new T.Color();

  private readonly base: { hemi: number; ambient: number; sun: number; exposure: number; env: number; glow: number };
  private readonly glow: T.MeshStandardMaterial | null;
  private readonly box: T.Box3;
  private readonly centre = new T.Vector3();
  private readonly dir = new T.Vector3();
  private readonly lastDir = new T.Vector3(0, -1, 0);
  private readonly corner = new T.Vector3();
  private readonly rgb = { r: 1, g: 1, b: 1 };
  private ambientNow = 0;
  private lampLevel = 1;

  private readonly c = {
    daySky: new T.Color('#f5f9ff'), goldSky: new T.Color('#ffd9b3'), nightSky: new T.Color('#3a5182'),
    overcast: new T.Color('#dde2e8'), rainSky: new T.Color('#c3cfdc'),
    dayGround: new T.Color('#b3a695'), nightGround: new T.Color('#25252b'),
    dayAmbient: new T.Color('#fff6e9'), goldAmbient: new T.Color('#ffd2a1'), nightAmbient: new T.Color('#ffe3c2'),
    lampDay: new T.Color('#fff1d8'), lampNight: new T.Color('#ffcf94'),
    cool: new T.Color('#c9d4e2'),
    dayBg: new T.Color(), duskBg: new T.Color('#c9a68c'), nightBg: new T.Color(),
    lamp: new T.Color(),
  };

  constructor(scene: T.Scene, def: TourDefinition, model: TourModel, box: T.Box3) {
    const l = def.lights;
    // The full-day sun is not in the contract; the three original viewers used ~1.72 × their hemisphere strength.
    const hemi = l.hemi ?? 1;
    this.base = {
      hemi, ambient: l.ambient ?? 0.5, sun: (l as { sun?: number }).sun ?? hemi * 1.72,
      exposure: l.exposure ?? 1, env: 0.26, glow: 0,
    };
    this.hemi = new T.HemisphereLight(this.c.daySky, this.c.dayGround, hemi);
    this.ambient = new T.AmbientLight(this.c.dayAmbient, this.base.ambient);
    this.sun = new T.DirectionalLight('#fff3d9', this.base.sun);
    this.sun.castShadow = true;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.024;
    this.sun.shadow.autoUpdate = true;
    scene.add(this.hemi, this.ambient, this.sun, this.sun.target);
    this.lamps = new LampProxies(def.lights.lamps, scene);

    const glow = model.materials.glow as T.MeshStandardMaterial | undefined;
    this.glow = glow && (glow as T.MeshStandardMaterial).isMeshStandardMaterial ? glow : null;
    if (this.glow) this.base.glow = this.glow.emissiveIntensity;

    this.c.dayBg.set(l.background);
    this.c.nightBg.set(def.theme.night).lerp(new T.Color('#1b2633'), 0.5);
    this.box = box.clone();
    this.box.getCenter(this.centre);
  }

  setShadowSize(size: number) {
    const shadow = this.sun.shadow;
    if (shadow.mapSize.x === size) return;
    shadow.mapSize.set(size, size);
    // The map is reallocated at the new size on the next shadow render.
    if (shadow.map) { shadow.map.dispose(); shadow.map = null as unknown as T.WebGLRenderTarget; }
  }

  /**
   * Set every light for this sun and weather.
   * @returns true when the sun moved enough that the shadow map is out of date
   */
  apply(sun: SunPosition, weather: Weather | null, northDeg: number, renderer: T.WebGLRenderer, scene: T.Scene): boolean {
    const e = sun.elevationDeg;
    const direct = smoothstep(-2, 20, e);
    const sky = smoothstep(-9, 4, e);
    const night = 1 - sky;
    const golden = smoothstep(-3, 3, e) * (1 - smoothstep(6, 22, e));
    const cloud = weather ? weather.cloud : 0;
    const rain = !!(weather && weather.rain);
    const c = this.c;

    const kelvin = e < 20 ? lerp(1800, 3600, smoothstep(-1, 20, e)) : lerp(3600, 5600, smoothstep(20, 50, e));
    kelvinToRGB(kelvin, this.rgb);
    this.sun.color.setRGB(this.rgb.r, this.rgb.g, this.rgb.b, T.SRGBColorSpace);
    if (rain) this.sun.color.lerp(c.cool, 0.35);
    // Spec ramp (nothing at −2°, full by 20°) eased so a low sun keeps enough strength to rake gold across the floor.
    this.sun.intensity = this.base.sun * Math.sqrt(direct) * (1 - 0.8 * cloud) * (rain ? 0.75 : 1);

    this.hemi.color.copy(c.daySky).lerp(c.goldSky, golden * 0.85).lerp(c.nightSky, night);
    if (cloud) this.hemi.color.lerp(c.overcast, 0.55 * cloud * sky);
    if (rain) this.hemi.color.lerp(c.rainSky, 0.5 * sky);
    this.hemi.groundColor.copy(c.dayGround).lerp(c.nightGround, night);
    // At golden hour the sky fill steps back so the low amber sun carries the room.
    this.hemi.intensity = this.base.hemi * lerp(0.18, 1, sky) * (1 - 0.32 * golden) * (1 + 0.15 * cloud * sky);

    this.ambient.color.copy(c.dayAmbient).lerp(c.goldAmbient, golden * 0.55).lerp(c.nightAmbient, night);
    // After dark the even fill drops further than the lamps rise, so the room reads as lamp-lit
    // (pools of warm light, quieter corners) rather than as the afternoon in a warmer colour.
    this.ambientNow = this.base.ambient * lerp(0.4, 1, sky) * (1 - 0.15 * golden) * (1 + 0.1 * cloud * sky);
    this.ambient.intensity = this.ambientNow;

    // Lamps are on all day as fill (the photographs show them on); after dark they carry the room.
    this.lampLevel = lerp(1, 1.65, night) + 0.25 * cloud * sky;
    this.lamps.setLevel(this.lampLevel);
    this.lamps.setColor(c.lamp.copy(c.lampDay).lerp(c.lampNight, night));
    if (this.glow) this.glow.emissiveIntensity = this.base.glow * lerp(1, 1.5, night);

    scene.environmentIntensity = this.base.env * lerp(0.25, 1, sky) * (1 - 0.25 * cloud);
    renderer.toneMappingExposure = this.base.exposure * lerp(1, 1.07, night) * (rain ? 0.97 : 1);
    this.background.copy(c.dayBg).lerp(c.duskBg, golden * 0.6).lerp(c.nightBg, night);

    // Direction: compass bearing → world, where world −Z faces `northDeg`. Below a few degrees the
    // sun is dark anyway; holding the direction there keeps the shadow frustum well-formed.
    const el = Math.max(e, 3) * RAD, bearing = (sun.azimuthDeg - northDeg) * RAD;
    this.dir.set(Math.sin(bearing) * Math.cos(el), Math.sin(el), -Math.cos(bearing) * Math.cos(el));
    this.sun.position.copy(this.centre).addScaledVector(this.dir, 20);
    this.sun.target.position.copy(this.centre);
    this.sun.updateMatrixWorld();
    this.sun.target.updateMatrixWorld();
    if (this.dir.angleTo(this.lastDir) < 0.002) return false;
    this.lastDir.copy(this.dir);
    this.fitShadow();
    return true;
  }

  /** In dollhouse and plan only three lamps light a whole flat: lift the ambient by the share of lamp light that is missing. */
  compensate(coverage: number, overview: boolean) {
    this.ambient.intensity = this.ambientNow + (overview ? this.base.ambient * 0.3 * (1 - coverage) * this.lampLevel : 0);
  }

  /** Tight orthographic shadow frustum around the flat as seen from the sun: every texel lands on the apartment. */
  private fitShadow() {
    const cam = this.sun.shadow.camera;
    cam.position.copy(this.sun.position);
    cam.lookAt(this.centre);
    cam.updateMatrixWorld();
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
    const b = this.box;
    for (let i = 0; i < 8; i++) {
      this.corner.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).applyMatrix4(cam.matrixWorldInverse);
      minX = Math.min(minX, this.corner.x); maxX = Math.max(maxX, this.corner.x);
      minY = Math.min(minY, this.corner.y); maxY = Math.max(maxY, this.corner.y);
      minZ = Math.min(minZ, this.corner.z); maxZ = Math.max(maxZ, this.corner.z);
    }
    const pad = 0.25;
    cam.left = minX - pad; cam.right = maxX + pad;
    cam.bottom = minY - pad; cam.top = maxY + pad;
    cam.near = Math.max(0.05, -maxZ - pad); cam.far = -minZ + pad;
    cam.updateProjectionMatrix();
  }
}
