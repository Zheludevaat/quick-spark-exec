/**
 * Tiny canvas-pixel helpers used to bake Mercury textures. Every
 * function expects integer coordinates and operates on a non-smoothed
 * 2D context so output stays crisp at the 160x144 GBC scale.
 */

export function px(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

export function lineH(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  color: string,
) {
  px(ctx, x, y, w, 1, color);
}

export function lineV(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  h: number,
  color: string,
) {
  px(ctx, x, y, 1, h, color);
}

export function border(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  outer: string,
  inner?: string,
) {
  lineH(ctx, x, y, w, outer);
  lineH(ctx, x, y + h - 1, w, outer);
  lineV(ctx, x, y, h, outer);
  lineV(ctx, x + w - 1, y, h, outer);
  if (inner && w > 2 && h > 2) {
    lineH(ctx, x + 1, y + 1, w - 2, inner);
    lineH(ctx, x + 1, y + h - 2, w - 2, inner);
    lineV(ctx, x + 1, y + 1, h - 2, inner);
    lineV(ctx, x + w - 2, y + 1, h - 2, inner);
  }
}

export function checker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  a: string,
  b: string,
  step = 2,
) {
  for (let yy = 0; yy < h; yy += step) {
    for (let xx = 0; xx < w; xx += step) {
      px(ctx, x + xx, y + yy, step, step, ((xx + yy) / step) % 2 === 0 ? a : b);
    }
  }
}

export function dither25(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
) {
  ctx.fillStyle = color;
  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < w; xx++) {
      if ((xx + yy) % 4 === 0) ctx.fillRect(x + xx, y + yy, 1, 1);
    }
  }
}

export function runeDiamond(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
) {
  px(ctx, x + 2, y, 1, 1, color);
  px(ctx, x + 1, y + 1, 3, 1, color);
  px(ctx, x, y + 2, 5, 1, color);
  px(ctx, x + 1, y + 3, 3, 1, color);
  px(ctx, x + 2, y + 4, 1, 1, color);
}
