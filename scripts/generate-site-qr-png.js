/**
 * Viona site QR — düz kare modüller; yalnızca 3 köşe bulucu (finder) hafif yuvarlak dış,
 * iç siyah modüller daire. Logo yok.
 * Çalıştır: npm run qr:png
 */
const fs = require("fs");
const path = require("path");
const { createCanvas } = require("canvas");
const QRCode = require("qrcode/lib/core/qrcode");

const TARGET = "https://viona.eleythra.com/";
const NAVY = "#1a2744";
const WHITE = "#ffffff";

const CANVAS_SIZE = 1200;
const OUTER_PAD = 52;
const QUIET = 4;

function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.lineTo(x + rr, y + h);
  ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.lineTo(x, y + rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
}

function inFinderRegion(row, col, n) {
  if (row < 7 && col < 7) return true;
  if (row < 7 && col >= n - 7) return true;
  if (row >= n - 7 && col < 7) return true;
  return false;
}

function main() {
  const qr = QRCode.create(TARGET, { errorCorrectionLevel: "H" });
  const matrix = qr.modules;
  const n = matrix.size;

  const outDir = path.join(__dirname, "..", "assets", "qr");
  const outFile = path.join(outDir, "viona-site-qr.png");

  const totalCells = n + 2 * QUIET;
  const qrArea = CANVAS_SIZE - 2 * OUTER_PAD;
  const cellSize = qrArea / totalCells;

  const qrLeft = OUTER_PAD;
  const qrTop = OUTER_PAD;

  const canvas = createCanvas(CANVAS_SIZE, CANVAS_SIZE);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = WHITE;
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  function cellOrigin(row, col) {
    return {
      x: qrLeft + QUIET * cellSize + col * cellSize,
      y: qrTop + QUIET * cellSize + row * cellSize,
    };
  }

  ctx.fillStyle = NAVY;
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      if (!matrix.get(row, col)) continue;
      if (inFinderRegion(row, col, n)) continue;
      const { x, y } = cellOrigin(row, col);
      ctx.fillRect(x, y, cellSize, cellSize);
    }
  }

  const finders = [
    [0, 0],
    [0, n - 7],
    [n - 7, 0],
  ];
  const outerR = cellSize * 0.55;
  const innerHoleR = cellSize * 0.45;

  finders.forEach(function (pair) {
    const sr = pair[0];
    const sc = pair[1];
    const x0 = cellOrigin(sr, sc).x;
    const y0 = cellOrigin(sr, sc).y;

    ctx.fillStyle = NAVY;
    ctx.beginPath();
    roundRectPath(ctx, x0, y0, 7 * cellSize, 7 * cellSize, outerR);
    roundRectPath(ctx, x0 + cellSize, y0 + cellSize, 5 * cellSize, 5 * cellSize, innerHoleR);
    ctx.fill("evenodd");

    ctx.fillStyle = NAVY;
    for (let r = 1; r <= 5; r++) {
      for (let c = 1; c <= 5; c++) {
        const row = sr + r;
        const col = sc + c;
        if (!matrix.get(row, col)) continue;
        const cx = x0 + c * cellSize + cellSize / 2;
        const cy = y0 + r * cellSize + cellSize / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, cellSize * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, canvas.toBuffer("image/png"));
  console.log("Yazıldı:", outFile, "(modül:", n + "x" + n + ")");
}

main();
