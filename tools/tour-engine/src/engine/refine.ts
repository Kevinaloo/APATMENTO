/* Refined still frames: ambient occlusion, computed once per stillness.

   Moving frames go straight to the canvas. Once the view has been still
   for a moment the engine draws the scene once into a linear HDR target,
   runs GTAO over it once, and then only re-composites: the fade-in of the
   occlusion is a few cheap full-screen passes, not a few full renders as
   it would be through an EffectComposer chain. That keeps the GPU queue
   short, so the first moving frame after a pause is never stuck behind
   post-processing work.

   The composite does what OutputPass does (exposure, tone mapping, sRGB)
   and lays the scene over the background colour by alpha: the canvas path
   clears to the raw sRGB background, which tone mapping must not touch, or
   the backdrop would shift colour every time the view settles. */
import * as T from 'three';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

const vertexShader = /* glsl */`
precision highp float;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
attribute vec3 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const fragmentShader = /* glsl */`
precision highp float;
uniform sampler2D tScene;
uniform sampler2D tAO;
uniform float intensity;
uniform vec3 background;
varying vec2 vUv;
#include <tonemapping_pars_fragment>
#include <colorspace_pars_fragment>
void main() {
  vec4 scene = texture2D(tScene, vUv);
  vec3 ao = texture2D(tAO, vUv).rgb;
  vec4 color = vec4(scene.rgb * mix(vec3(1.0), ao, intensity), 1.0);
  #ifdef ACES_FILMIC_TONE_MAPPING
    color.rgb = ACESFilmicToneMapping(color.rgb);
  #elif defined(NEUTRAL_TONE_MAPPING)
    color.rgb = NeutralToneMapping(color.rgb);
  #elif defined(AGX_TONE_MAPPING)
    color.rgb = AgXToneMapping(color.rgb);
  #elif defined(LINEAR_TONE_MAPPING)
    color.rgb = LinearToneMapping(color.rgb);
  #endif
  color = sRGBTransferOETF(color);
  gl_FragColor = vec4(mix(background, color.rgb, clamp(scene.a, 0.0, 1.0)), 1.0);
}`;

export type RefineOptions = { samples: number; ao: boolean };

export class Refiner {
  readonly target: T.WebGLRenderTarget;
  private gtao: GTAOPass | null = null;
  private readonly quad: FullScreenQuad;
  private readonly material: T.RawShaderMaterial;
  private readonly white: T.DataTexture;
  private readonly bg = new T.Color();

  constructor(private readonly scene: T.Scene, camera: T.Camera, width: number, height: number, options: RefineOptions) {
    this.target = new T.WebGLRenderTarget(width, height, { type: T.HalfFloatType, samples: options.samples });
    this.white = new T.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    this.white.needsUpdate = true;
    if (options.ao) {
      this.gtao = new GTAOPass(scene, camera, width, height);
      // Interior scale: furniture-sized contact shadows, not room-sized murk.
      this.gtao.updateGtaoMaterial({ radius: 0.22, distanceExponent: 1.4, thickness: 0.5, scale: 1 });
      this.gtao.output = GTAOPass.OUTPUT.Off;
    }
    this.material = new T.RawShaderMaterial({
      name: 'TourComposite',
      uniforms: {
        tScene: { value: this.target.texture },
        tAO: { value: this.gtao ? this.gtao.gtaoMap : this.white },
        intensity: { value: 0 },
        background: { value: new T.Vector3() },
        toneMappingExposure: { value: 1 },
      },
      vertexShader, fragmentShader,
      depthTest: false, depthWrite: false,
    });
    this.quad = new FullScreenQuad(this.material);
  }

  get hasAO() { return this.gtao !== null; }

  setSize(width: number, height: number) {
    this.target.setSize(width, height);
    if (this.gtao) this.gtao.setSize(width, height);
  }

  /** Draw the scene into the HDR target and, with AO, compute the occlusion buffer. `before`/`after` arm the mirror. */
  renderScene(renderer: T.WebGLRenderer, camera: T.Camera, before: () => void, after: () => void) {
    renderer.setRenderTarget(this.target);
    renderer.setClearColor(0x000000, 0);
    before();
    renderer.render(this.scene, camera);
    after();
    if (this.gtao) {
      this.gtao.camera = camera;
      this.gtao.render(renderer, this.target, this.target, 0, false);
    }
    renderer.setRenderTarget(null);
  }

  /** Tone-mapped output of the last renderScene with `intensity` of the occlusion, to the canvas or a target. */
  composite(renderer: T.WebGLRenderer, intensity: number, background: T.Color, out: T.WebGLRenderTarget | null) {
    const u = this.material.uniforms;
    u.intensity.value = this.gtao ? intensity : 0;
    this.bg.copy(background).convertLinearToSRGB();
    (u.background.value as T.Vector3).set(this.bg.r, this.bg.g, this.bg.b);
    u.toneMappingExposure.value = renderer.toneMappingExposure;
    this.syncDefines(renderer);
    renderer.setRenderTarget(out);
    this.quad.render(renderer);
    renderer.setRenderTarget(null);
  }

  private toneMapping: T.ToneMapping | -1 = -1;
  private syncDefines(renderer: T.WebGLRenderer) {
    if (this.toneMapping === renderer.toneMapping) return;
    this.toneMapping = renderer.toneMapping;
    const defines: Record<string, string> = {};
    if (renderer.toneMapping === T.ACESFilmicToneMapping) defines.ACES_FILMIC_TONE_MAPPING = '';
    else if (renderer.toneMapping === T.NeutralToneMapping) defines.NEUTRAL_TONE_MAPPING = '';
    else if (renderer.toneMapping === T.AgXToneMapping) defines.AGX_TONE_MAPPING = '';
    else if (renderer.toneMapping === T.LinearToneMapping) defines.LINEAR_TONE_MAPPING = '';
    this.material.defines = defines;
    this.material.needsUpdate = true;
  }

  dispose() {
    this.target.dispose();
    this.gtao?.dispose();
    this.quad.dispose();
    this.material.dispose();
    this.white.dispose();
  }
}
