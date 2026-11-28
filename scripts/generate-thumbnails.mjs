import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { deflateSync } from 'zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xedb88320 * (crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type);
  const crc = crc32(Buffer.concat([typeBuf, data]));
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createPlaceholderThumbnail(width, height, color) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  
  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 2;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdr = createChunk('IHDR', ihdrData);

  // IDAT - solid color
  const row = Buffer.alloc(width * 3 + 1);
  row[0] = 0;
  for (let x = 0; x < width; x++) {
    row[x * 3 + 1] = color[0];
    row[x * 3 + 2] = color[1];
    row[x * 3 + 3] = color[2];
  }
  const imageData = Buffer.alloc(row.length * height);
  for (let y = 0; y < height; y++) {
    row.copy(imageData, y * row.length);
  }
  const compressed = deflateSync(imageData);
  const idat = createChunk('IDAT', compressed);

  // IEND
  const iend = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

const vehicles = [
  { id: 'car-concept', color: [0x8b, 0x00, 0x00] },
  { id: 'kenney-sedan', color: [0x4a, 0x90, 0xd9] },
  { id: 'kenney-suv', color: [0x2e, 0x7d, 0x32] },
  { id: 'kenney-race', color: [0xff, 0x6b, 0x00] },
  { id: 'kenney-truck', color: [0x79, 0x55, 0x48] },
];

for (const vehicle of vehicles) {
  const png = createPlaceholderThumbnail(256, 256, vehicle.color);
  const thumbDir = join(__dirname, '..', 'public', 'vehicles', vehicle.id);
  if (!existsSync(thumbDir)) {
    mkdirSync(thumbDir, { recursive: true });
  }
  const thumbPath = join(thumbDir, 'thumbnail.png');
  writeFileSync(thumbPath, png);
  console.log(`Generated thumbnail: ${thumbPath}`);
}
console.log('Thumbnail generation complete.');