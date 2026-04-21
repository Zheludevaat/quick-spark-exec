/**
 * Venus chapter tile + palette pack.
 *
 * Bakes a single Venus tile-strip CanvasTexture and exposes the palette
 * family used by the rest of the Venus art modules. All tiles are
 * authored 16x16 pixel grids painted with Palette4 entries from
 * VENUS_PAL. The resulting "venus_tiles" texture is frame-indexed so
 * room builders can stamp tiles via `scene.add.image(x,y,"venus_tiles",frame)`.
 *
 * Visual thesis: opulent beauty under moral pressure — wine-velvet
 * shadows, rose-copper midtones, pearl-ivory highlights. Tiles read at
 * 160x144 first, decoration second.
 */
import * as Phaser from "phaser";
import { addGridFrames, makeTex, paintGrid, type Palette4 } from "../../gbcArt";

/**
 * Venus palette family. Each entry is a 4-color Palette4
 * (transparent/dark/mid/light typically mapped 0..3 in tile rows).
 */
export const VENUS_PAL = {
  room: ["#120a16", "#2a1830", "#6a3a4e", "#f2d8d8"] as Palette4,
  mirror: ["#0c0a14", "#2a2440", "#8a7aa0", "#f6eef8"] as Palette4,
  gold: ["#120a16", "#4a3020", "#b07a48", "#f0d8a0"] as Palette4,
  rose: ["#120a16", "#4a2030", "#a85a78", "#f0b8c8"] as Palette4,
  velvet: ["#120a16", "#281018", "#5a2038", "#a87890"] as Palette4,
  paper: ["#120a16", "#504840", "#b8a890", "#f8f0d8"] as Palette4,
} as const;

/**
 * Logical tile ids. Order MUST match the bake order below.
 */
export const VENUS_TILE = {
  FLOOR_CHECKER: 0,
  FLOOR_INLAY: 1,
  FLOOR_REFLECT: 2,
  WALL_PANEL: 3,
  WALL_DRAPE: 4,
  ARCH_TRIM: 5,
  MIRROR_BAY: 6,
  MEDALLION: 7,
  BENCH: 8,
  TABLE: 9,
  LADDER_RUNG: 10,
  LADDER_POST: 11,
} as const;

const TILE_W = 16;
const TILE_H = 16;
const TILE_COLS = 6;
const TILE_ROWS = 2;

// ---------------------------------------------------------------------
// Tile pixel rows. Digits 0..3 reference the active Palette4. '.' = clear.
// Authored to read at native GBC scale, with one motif per tile.
// ---------------------------------------------------------------------

const FLOOR_CHECKER = [
  "1111122211111222",
  "1112233322112233",
  "1122333332223333",
  "1122323322223233",
  "1222222222222222",
  "2222111122221111",
  "2221122222211222",
  "2211222222112222",
  "2112222221122222",
  "1122222211222222",
  "1222222122222221",
  "2222221122222211",
  "2222211222222112",
  "1222211122221112",
  "1112233311122333",
  "1111122211111222",
];

const FLOOR_INLAY = [
  "1111111111111111",
  "1112222222222111",
  "1122223333222211",
  "1122233333322211",
  "1122333322333221",
  "1223332112333322",
  "1223322112233322",
  "1223322112233322",
  "1223322112233322",
  "1223322112233322",
  "1223332112333322",
  "1122333322333221",
  "1122233333322211",
  "1122223333222211",
  "1112222222222111",
  "1111111111111111",
];

const FLOOR_REFLECT = [
  "1111111111111111",
  "1222222222222221",
  "1233333333333321",
  "1233333333333321",
  "1222222222222221",
  "2333333333333332",
  "1222222222222221",
  "1222222222222221",
  "2333333333333332",
  "1222222222222221",
  "1233333333333321",
  "1222222222222221",
  "2333333333333332",
  "1222222222222221",
  "1222222222222221",
  "1111111111111111",
];

const WALL_PANEL = [
  "1111111111111111",
  "1222222222222221",
  "1233333333333321",
  "1232112332112321",
  "1232112332112321",
  "1232112332112321",
  "1232112332112321",
  "1232112332112321",
  "1232112332112321",
  "1232112332112321",
  "1232112332112321",
  "1232112332112321",
  "1232112332112321",
  "1233333333333321",
  "1222222222222221",
  "1111111111111111",
];

const WALL_DRAPE = [
  "1212121212121212",
  "2121212121212121",
  "1212121212121212",
  "2121212121212121",
  "1212323212322121",
  "2123233232333212",
  "1232333323333321",
  "2323332333333232",
  "1323333333333231",
  "2233333333333322",
  "1233333333333321",
  "1123333333333211",
  "1112333333332111",
  "1111233333321111",
  "1111122333211111",
  "1111111223111111",
];

const ARCH_TRIM = [
  "1111111111111111",
  "1112222222222111",
  "1123333333333211",
  "1233333333333321",
  "2333222222223332",
  "3322111111112233",
  "3211111111111123",
  "2111111111111112",
  "2111111111111112",
  "3211111111111123",
  "3322111111112233",
  "2333222222223332",
  "1233333333333321",
  "1123333333333211",
  "1112222222222111",
  "1111111111111111",
];

const MIRROR_BAY = [
  "1111111111111111",
  "1233333333333321",
  "1322222222222231",
  "1322222222222231",
  "1322233222233231",
  "1322333322333231",
  "1322333222333231",
  "1322333322333231",
  "1322233322233231",
  "1322222222222231",
  "1322222222222231",
  "1322222222222231",
  "1322333333333231",
  "1322222222222231",
  "1233333333333321",
  "1111111111111111",
];

const MEDALLION = [
  "................",
  ".....111111.....",
  "....12222221....",
  "...1233333321...",
  "..123332333321..",
  ".12333322333321.",
  ".1233233233321..",
  ".12332333332321.",
  ".12333222333321.",
  ".12333232333321.",
  ".12333323332321.",
  ".12333322333321.",
  "..123322233321..",
  "...1233332321...",
  "....12222221....",
  ".....111111.....",
];

const BENCH = [
  "................",
  "................",
  "................",
  "................",
  "1111111111111111",
  "1222222222222221",
  "1233333333333321",
  "1233333333333321",
  "1222222222222221",
  "1111111111111111",
  ".1.111....111.1.",
  ".1.121....121.1.",
  ".1.121....121.1.",
  ".1.121....121.1.",
  ".1.121....121.1.",
  ".1.111....111.1.",
];

const TABLE = [
  "................",
  "................",
  "1111111111111111",
  "1222222222222221",
  "1233333333333321",
  "1233333333333321",
  "1222222222222221",
  "1111111111111111",
  "..1.1......1.1..",
  "..1.1......1.1..",
  "..1.1......1.1..",
  "..1.1......1.1..",
  "..1.1......1.1..",
  "..1.1......1.1..",
  "..1.1......1.1..",
  "..111......111..",
];

const LADDER_RUNG = [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "1111111111111111",
  "1222222222222221",
  "1233333333333321",
  "1222222222222221",
  "1111111111111111",
  "................",
  "................",
  "................",
  "................",
  "................",
];

const LADDER_POST = [
  ".......11.......",
  "......1221......",
  "......1331......",
  "......1221......",
  "......1221......",
  "......1331......",
  "......1221......",
  "......1221......",
  "......1331......",
  "......1221......",
  "......1221......",
  "......1331......",
  "......1221......",
  "......1221......",
  "......1331......",
  "......1221......",
];

// Tile-id => (rows, palette) mapping, in frame-index order.
const TILE_DEFS: Array<{ rows: string[]; palette: Palette4 }> = [
  { rows: FLOOR_CHECKER, palette: VENUS_PAL.rose },
  { rows: FLOOR_INLAY, palette: VENUS_PAL.gold },
  { rows: FLOOR_REFLECT, palette: VENUS_PAL.mirror },
  { rows: WALL_PANEL, palette: VENUS_PAL.velvet },
  { rows: WALL_DRAPE, palette: VENUS_PAL.velvet },
  { rows: ARCH_TRIM, palette: VENUS_PAL.gold },
  { rows: MIRROR_BAY, palette: VENUS_PAL.mirror },
  { rows: MEDALLION, palette: VENUS_PAL.gold },
  { rows: BENCH, palette: VENUS_PAL.velvet },
  { rows: TABLE, palette: VENUS_PAL.paper },
  { rows: LADDER_RUNG, palette: VENUS_PAL.rose },
  { rows: LADDER_POST, palette: VENUS_PAL.gold },
];

/**
 * Bake the Venus tile-strip texture once. Subsequent calls are no-ops
 * if the texture already exists. Returns the texture key.
 */
export function bakeVenusTiles(scene: Phaser.Scene, key = "venus_tiles") {
  if (scene.textures.exists(key)) return key;
  const { tex, ctx } = makeTex(scene, key, TILE_W * TILE_COLS, TILE_H * TILE_ROWS);
  ctx.imageSmoothingEnabled = false;
  TILE_DEFS.forEach((def, i) => {
    const c = i % TILE_COLS;
    const r = Math.floor(i / TILE_COLS);
    paintGrid(ctx, def.rows, def.palette, c * TILE_W, r * TILE_H);
  });
  addGridFrames(tex, TILE_W, TILE_H, TILE_COLS, TILE_ROWS);
  tex.refresh();
  return key;
}
