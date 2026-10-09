/* The postcard: the current view, rendered offscreen at up to 1600×900,
   with a slim branded caption bar, as a JPEG.

   Rendered into its own targets with the same still-frame pipeline (and
   ambient occlusion where the tier has it), so taking a postcard never
   resizes or flashes the live canvas. */
import * as T from 'three';
import { Refiner } from './refine';
import type { BudgetMirror } from './mirror';

export type Caption = { title: string; area: string; hour: string | null; accent: string; night: string; paper: string };

export type PostcardInput = {
  renderer: T.WebGLRenderer;
  scene: T.Scene;
  camera: T.Camera;
  /** Physical pixels across the guest's view: the postcard is never sharper than what they see. */
  screenWidth: number;
  ao: boolean;
  background: T.Color;
  mirror: BudgetMirror | null;
  caption: Caption;
};

export async function renderPostcard(input: PostcardInput): Promise<Blob | null> {
  const width = Math.max(320, Math.min(1600, Math.round(input.screenWidth)));
  const height = Math.round(width * 9 / 16);
  const camera = postcardCamera(input.camera, width / height);
  const ao = input.ao && (camera as T.PerspectiveCamera).isPerspectiveCamera;
  const refiner = new Refiner(input.scene, camera, width, height, { samples: 4, ao });
  const out = new T.WebGLRenderTarget(width, height, { type: T.UnsignedByteType });
  const pixels = new Uint8Array(width * height * 4);
  try {
    const mirror = input.mirror;
    refiner.renderScene(input.renderer, camera, () => mirror?.force(), () => { if (mirror) { mirror.disarm(); mirror.stale = true; } });
    refiner.composite(input.renderer, 1, input.background, out);
    try {
      await input.renderer.readRenderTargetPixelsAsync(out, 0, 0, width, height, pixels);
    } catch {
      input.renderer.readRenderTargetPixels(out, 0, 0, width, height, pixels);
    }
  } finally {
    refiner.dispose();
    out.dispose();
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  // GL rows run bottom-up.
  const image = ctx.createImageData(width, height);
  const row = width * 4;
  for (let y = 0; y < height; y++) image.data.set(pixels.subarray((height - 1 - y) * row, (height - y) * row), y * row);
  ctx.putImageData(image, 0, 0);
  drawCaption(ctx, width, height, input.caption);
  return new Promise(resolve => canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.9));
}

/** Same eye and gaze, framed 16:9. A tall phone view would need a fish-eye width at the same vertical field, so that is capped. */
function postcardCamera(source: T.Camera, aspect: number): T.Camera {
  if ((source as T.PerspectiveCamera).isPerspectiveCamera) {
    const s = source as T.PerspectiveCamera;
    const camera = new T.PerspectiveCamera(s.fov, aspect, s.near, s.far);
    const maxVertical = 2 * Math.atan(Math.tan((92 * Math.PI / 180) / 2) / aspect) * 180 / Math.PI;
    camera.fov = Math.min(s.fov, maxVertical);
    camera.position.copy(s.position);
    camera.quaternion.copy(s.quaternion);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    return camera;
  }
  const s = source as T.OrthographicCamera;
  const half = (s.top - s.bottom) / 2 / s.zoom, cx = (s.left + s.right) / 2 / s.zoom, cy = (s.top + s.bottom) / 2 / s.zoom;
  const camera = new T.OrthographicCamera(cx - half * aspect, cx + half * aspect, cy + half, cy - half, s.near, s.far);
  camera.position.copy(s.position);
  camera.quaternion.copy(s.quaternion);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  return camera;
}

function drawCaption(ctx: CanvasRenderingContext2D, width: number, height: number, caption: Caption) {
  const bar = Math.round(Math.max(54, height * 0.085));
  const top = height - bar, pad = Math.round(bar * 0.42);
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = caption.night;
  ctx.fillRect(0, top, width, bar);
  ctx.globalAlpha = 1;
  ctx.fillStyle = caption.accent;
  ctx.fillRect(0, top, width, Math.max(2, Math.round(bar * 0.035)));

  const right = caption.hour ? caption.hour : '';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `500 ${Math.round(bar * 0.3)}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
  const rightWidth = right ? ctx.measureText(right).width : 0;
  if (right) {
    ctx.fillStyle = caption.paper;
    ctx.textAlign = 'right';
    ctx.fillText(right, width - pad, top + bar * 0.62);
  }

  ctx.textAlign = 'left';
  ctx.fillStyle = caption.paper;
  ctx.font = `600 ${Math.round(bar * 0.31)}px Georgia, 'Times New Roman', serif`;
  ctx.fillText(fit(ctx, caption.title, width - pad * 3 - rightWidth), pad, top + bar * 0.48);
  ctx.globalAlpha = 0.72;
  ctx.font = `500 ${Math.round(bar * 0.19)}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
  const meta = [caption.area, 'Cabana 3D tour'].filter(Boolean).join('  ·  ').toUpperCase();
  if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${Math.round(bar * 0.02)}px`;
  ctx.fillText(fit(ctx, meta, width - pad * 3 - rightWidth), pad, top + bar * 0.8);
  ctx.restore();
}

function fit(ctx: CanvasRenderingContext2D, text: string, max: number) {
  if (ctx.measureText(text).width <= max) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(s + '…').width > max) s = s.slice(0, -1);
  return s.trimEnd() + '…';
}
