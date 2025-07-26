import path from 'path';
//import { open, unlink, access } from 'node:fs/promises';
import { open, unlink, access } from 'fs.promises';
import StorageInterface from './storageInterface';

function arrayBufferToBuffer(arrayBuffer: ArrayBuffer): Buffer {
  const buffer = Buffer.alloc(arrayBuffer.byteLength);
  const view = new Uint8Array(arrayBuffer);
  for (let i = 0; i < buffer.length; ++i) {
    buffer[i] = view[i];
  }
  return buffer;
}

export default class srtmStorage implements StorageInterface {
  dirPath: string;
  constructor(dirPath: string) {
    this.dirPath = dirPath;
  }

  getPath(tile: string): string {
    return path.join(this.dirPath, tile);
  }
  // existsSync
  // src/load-tile.js
  // src/srtm.js
  // src/sync-tile-set.js
  async hasTile(tile: string): Promise<boolean> {
    try {
      await access(this.getPath(tile))
      return true;
    } catch {
      return false;
    }
  }

  // statSync
  // src/hgt.js
  async getTileSize(tile: string): Promise<number> {
    const fd = await open(this.getPath(tile), 'r');
    try {
      const stat = await fd.stat();
      return stat.size;
    } finally {
        await fd.close();
    }
  }

  // readFileSync
  // src/hgt.js
  // returns DataView
  // lesen des arrays mit getUint16(position, false/* big endian*/) 
  async readTile(tile: string): Promise<DataView> {
    const fd = await open(this.getPath(tile), 'r');
    try {
      const buf = await fd.readFile();
      return new DataView(buf.buffer);
    } finally {
      await fd.close();
    }
  }

  async writeTile(tile: string, data: ArrayBuffer): Promise<void> {
    const fd = await open(this.getPath(tile), 'w');
    try {
      const buf = await fd.writeFile(arrayBufferToBuffer(data));
    } finally {
      await fd.close();
    }
  }

  // src/srtm.js
  async remove(tile: string): Promise<void> {
    return await unlink(this.getPath(tile));
  }
}
