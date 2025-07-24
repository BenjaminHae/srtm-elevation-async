import StorageInterface from './storageInterface';
import LatLng from './latLng';

interface TileOptions {
  interpolation?: (row, col: number) => number;
}

interface TileOptionsInt {
  interpolation: (row, col: number) => number;
}

export default class Tile {
  options: TileOptionsInt;
  buffer?: DataView;
  swLatLng: LatLng;
  storage: StorageInterface;
  resolution: number;
  _size: number;

  constructor(storage: StorageInterface, options: TileOptions = {}) {
    this.options = Object.assign({}, {
        interpolation: (row, col) => this.bilinear(row,col)
    }, options);
    this.storage = storage;
  }

  async init(tileName: string, swLatLng: LatLng) {
    if (!(await this.storage.hasTile(tileName))) 
      return;

    const size = await this.storage.getTileSize(tileName);

    if (size === 12967201 * 2) {
        this.resolution = 1;
        this._size = 3601;
    } else if (size === 1442401 * 2) {
        this.resolution = 3;
        this._size = 1201;
    } else {
        throw new Error('Unknown tile format (1 arcsecond and 3 arcsecond supported).');
    }

    this.buffer = await this.storage.readTile(tileName);
    this.swLatLng = swLatLng;
  }

  nearestNeighbour(row, col) {
    return this.rowCol(Math.round(row), Math.round(col));
  }

  bilinear(row, col: number): number {
    const avg = function(v1, v2, f) {
            return v1 + (v2 - v1) * f;
        },
        rowLow = Math.floor(row),
        rowHi = rowLow + 1,
        rowFrac = row - rowLow,
        colLow = Math.floor(col),
        colHi = colLow + 1,
        colFrac = col - colLow,
        v00 = this.rowCol(rowLow, colLow),
        v10 = this.rowCol(rowLow, colHi),
        v11 = this.rowCol(rowHi, colHi),
        v01 = this.rowCol(rowHi, colLow),
        v1 = avg(v00, v10, colFrac),
        v2 = avg(v01, v11, colFrac);
    return avg(v1, v2, rowFrac);
  }

  destroy() {
    delete this.buffer;
  }

  getElevation(latLng: LatLng) {
    if(!this.swLatLng) return 0;

    const size = this._size - 1,
        row = (latLng.lat - this.swLatLng.lat) * size,
        col = (latLng.lng - this.swLatLng.lng) * size;

    if (row < 0 || col < 0 || row > size || col > size) {
        throw new Error('Latitude/longitude is outside tile bounds (row=' +
            row + ', col=' + col + '; size=' + size);
    }
    return this.options.interpolation(row, col);
  }

  rowCol(row, col: number): number {
    if(!this.buffer) return 0;
    const size = this._size,
        offset = ((size - row - 1) * size + col) * 2;

    return this.buffer.getUint16(offset, false/* big endian*/)
  }
}
