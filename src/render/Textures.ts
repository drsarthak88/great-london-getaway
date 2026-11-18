import * as THREE from 'three';

/**
 * Small procedural canvas textures (stripes, checks, signs). Generated once and cached,
 * so there are no image downloads and everything stays original.
 */

const cache = new Map<string, THREE.Texture>();

function canvasTexture(key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, repeat = true): THREE.Texture {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
  }
  tex.anisotropy = 4;
  cache.set(key, tex);
  return tex;
}

const hex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

/** Horizontal bands (along the texture's v axis), e.g. a burglar's striped jumper. */
export function stripeTexture(a: number, b: number, bands: number): THREE.Texture {
  return canvasTexture(`stripe-${a}-${b}-${bands}`, 8, bands * 16, (ctx) => {
    for (let i = 0; i < bands; i++) {
      ctx.fillStyle = hex(i % 2 === 0 ? a : b);
      ctx.fillRect(0, i * 16, 8, 16);
    }
  });
}

/** A tweedy check: base colour with two crossing sets of translucent bands. */
export function checkTexture(base: number, line1: number, line2: number, cells = 6): THREE.Texture {
  return canvasTexture(`check-${base}-${line1}-${line2}-${cells}`, 128, 128, (ctx) => {
    ctx.fillStyle = hex(base);
    ctx.fillRect(0, 0, 128, 128);
    const step = 128 / cells;
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = hex(line1);
    for (let i = 0; i < cells; i++) {
      ctx.fillRect(i * step, 0, step * 0.35, 128);
      ctx.fillRect(0, i * step, 128, step * 0.35);
    }
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = hex(line2);
    for (let i = 0; i < cells; i++) {
      ctx.fillRect(i * step + step * 0.62, 0, 2, 128);
      ctx.fillRect(0, i * step + step * 0.62, 128, 2);
    }
    ctx.globalAlpha = 1;
  });
}

/** A flat sign: bold centred text lines on a coloured panel. */
export function signTexture(lines: string[], bg: number, fg: number, w = 256, h = 64): THREE.Texture {
  return canvasTexture(
    `sign-${lines.join('|')}-${bg}-${fg}-${w}x${h}`,
    w,
    h,
    (ctx) => {
      ctx.fillStyle = hex(bg);
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = hex(fg);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const lh = h / lines.length;
      lines.forEach((line, i) => {
        ctx.font = `bold ${Math.floor(lh * 0.72)}px Georgia, 'Times New Roman', serif`;
        ctx.fillText(line, w / 2, lh * (i + 0.5), w * 0.92);
      });
    },
    false,
  );
}
