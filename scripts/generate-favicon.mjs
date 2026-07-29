import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const src = path.join(root, "public", "photos", "zenthralogo.jpg");
const size = 512;

const input = sharp(src).rotate();
const meta = await input.metadata();
const w = meta.width || size;
const h = meta.height || size;
const side = Math.min(w, h);
const left = Math.floor((w - side) / 2);
const top = Math.floor((h - side) / 2);

const circle = Buffer.from(
  `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`
);

const square = await sharp(src)
  .rotate()
  .extract({ left, top, width: side, height: side })
  .resize(size, size, { fit: "cover" })
  .png()
  .toBuffer();

// App Router file-based icons (clean circular PNG)
await sharp(square)
  .composite([{ input: circle, blend: "dest-in" }])
  .png()
  .toFile(path.join(root, "src", "app", "icon.png"));

await sharp(src)
  .rotate()
  .extract({ left, top, width: side, height: side })
  .resize(180, 180, { fit: "cover" })
  .png()
  .toFile(path.join(root, "src", "app", "apple-icon.png"));

// Public fallbacks referenced in metadata
await sharp(src)
  .rotate()
  .extract({ left, top, width: side, height: side })
  .resize(32, 32, { fit: "cover" })
  .png()
  .toFile(path.join(root, "public", "favicon-32.png"));

// Copy square cropped logo as public apple path used in metadata
await sharp(src)
  .rotate()
  .extract({ left, top, width: side, height: side })
  .resize(180, 180, { fit: "cover" })
  .png()
  .toFile(path.join(root, "public", "apple-icon.png"));

const ico = path.join(root, "src", "app", "favicon.ico");
if (fs.existsSync(ico)) fs.unlinkSync(ico);

console.log("Favicon assets generated from zenthralogo.jpg");
