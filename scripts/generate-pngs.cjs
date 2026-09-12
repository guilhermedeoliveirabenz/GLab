const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 table
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c >>> 0;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, 8 + len);
  const crc = crc32(typeAndData);
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

function generatePng(width, height, isMaskable = false) {
  // Generate RGBA buffer
  // Row filter byte = 0
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // No filter

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      // Coordinate normalized -1 to 1
      const nx = (x / width) * 2 - 1;
      const ny = (y / height) * 2 - 1;
      const distCenter = Math.sqrt(nx * nx + ny * ny);

      // Background color: royal blue (#2563eb to #4f46e5)
      const gradT = (x + y) / (width + height);
      let r = Math.round(37 + (79 - 37) * gradT);
      let g = Math.round(99 + (70 - 99) * gradT);
      let b = Math.round(235 + (229 - 235) * gradT);
      let a = 255;

      // Safe zone for maskable icon vs squircle for standard
      if (!isMaskable) {
        // Rounded corner check (radius ~ 22%)
        const cornerR = 0.22;
        const qx = Math.max(0, Math.abs(nx) - (1 - cornerR));
        const qy = Math.max(0, Math.abs(ny) - (1 - cornerR));
        const cornerDist = Math.sqrt(qx * qx + qy * qy);
        if (cornerDist > cornerR) {
          a = 0; // transparent outside rounded rect
        }
      }

      // Draw stylized laptop screen in center
      // Laptop bounds
      const lx1 = width * 0.22;
      const lx2 = width * 0.78;
      const ly1 = height * 0.26;
      const ly2 = height * 0.64;

      // Laptop base bounds
      const bx1 = width * 0.16;
      const bx2 = width * 0.84;
      const by1 = height * 0.64;
      const by2 = height * 0.72;

      if (a > 0) {
        if (x >= lx1 && x <= lx2 && y >= ly1 && y <= ly2) {
          // Screen border vs display
          const borderWidth = width * 0.03;
          if (
            x < lx1 + borderWidth ||
            x > lx2 - borderWidth ||
            y < ly1 + borderWidth ||
            y > ly2 - borderWidth
          ) {
            r = 241; g = 245; b = 249; // light slate frame
          } else {
            // Dark screen
            r = 15; g = 23; b = 42;
            // Screen elements: code lines / calendar dots
            const cx = (x - lx1) / (lx2 - lx1);
            const cy = (y - ly1) / (ly2 - ly1);
            if (cy > 0.25 && cy < 0.35 && cx > 0.15 && cx < 0.75) {
              r = 56; g = 189; b = 248; // cyan accent line
            } else if (cy > 0.45 && cy < 0.55 && cx > 0.15 && cx < 0.60) {
              r = 148; g = 163; b = 184; // slate line
            } else if (cy > 0.65 && cy < 0.75 && cx > 0.15 && cx < 0.45) {
              r = 16; g = 185; b = 129; // emerald line
            }
          }
        } else if (x >= bx1 && x <= bx2 && y >= by1 && y <= by2) {
          // Laptop base
          r = 226; g = 232; b = 240;
          // Trackpad
          if (x >= width * 0.43 && x <= width * 0.57 && y >= height * 0.66 && y <= height * 0.70) {
            r = 148; g = 163; b = 184;
          }
        }
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  // Compress IDAT
  const compressed = zlib.deflateSync(rawData);

  // Build PNG chunks
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth
  ihdrData[9] = 6; // Color type: RGBA
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace

  const ihdrChunk = makeChunk('IHDR', ihdrData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. pwa-192x192.png
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), generatePng(192, 192, false));
console.log('Created pwa-192x192.png');

// 2. pwa-512x512.png
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), generatePng(512, 512, false));
console.log('Created pwa-512x512.png');

// 3. pwa-maskable-512x512.png (full bleed safe zone)
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), generatePng(512, 512, true));
console.log('Created pwa-maskable-512x512.png');

// 4. apple-touch-icon.png (180x180)
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), generatePng(180, 180, true));
console.log('Created apple-touch-icon.png');

// 5. favicon.ico (fallback 32x32 or 192)
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), generatePng(48, 48, false));
console.log('Created favicon.ico');
