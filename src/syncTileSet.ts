import SRTMDownloader, {SRTMDownloaderOptions} from './srtmDownloader';
import loadTile from './loadTile';
import LatLng from './latLng';
import tileKey from './tileKey';
import Tile from './Tile';
import StorageInterface from './storageInterface';

function range(start, end: number): Array<number> {
  const a = Array.apply(0, new Array(end - start + 1));
  a.forEach(function(e, i) { a[i] = start + i; });
  return a;
}

interface SyncTileSetOptions extends SRTMDownloaderOptions {
  loadTile?: (storage: StorageInterface, latLng: LatLng, downloader?: any) => Promise<Tile>;
  downloader?: SRTMDownloader;
  pad?: number;
}

interface SyncTileSetOptionsInternal {
  loadTile: (storage: StorageInterface, latLng: LatLng, downloader?: any) => Promise<Tile>;
  downloader: SRTMDownloader;
  pad: number;
}

export default class SyncTileSet{
  options: SyncTileSetOptionsInternal;
  tiles: Array<Array<Tile>>;
  storage: StorageInterface;
  south: number;
  north: number;
  west: number; 
  east: number;
  missingTiles: number;
  

  constructor(storage: StorageInterface, sw, ne: LatLng, options?: SyncTileSetOptions) {
    this.options = Object.assign({}, {
        loadTile: loadTile,
        downloader: new SRTMDownloader(storage, options),
        pad: 0
    }, options);
    const pad = this.options.pad;
    this.storage = storage;
    this.south = Math.floor(sw.lat) - pad;
    this.north = Math.floor(ne.lat) + 1 + pad;
    this.west = Math.floor(sw.lng) - pad;
    this.east = Math.floor(ne.lng) + 1 + pad;
    this.tiles = new Array(this.north - this.south);
  }

  async init(): Promise<void> {
    const rangeSN = range(this.south, this.north - 1);
    const rangeWE = range(this.west, this.east - 1);

    const allTilesCached = await this.countMissingTilesForRanges(rangeSN, rangeWE) == 0;
    
    if(!allTilesCached) {
        await this.options.downloader.init();
    } 

    const tasks: Array<Promise<void>> = rangeSN.map( (lat, i) => {
        this.tiles[i] = new Array(this.east - this.west);
        return rangeWE.map( (lng, j) => {
          return (async () => {
            this.tiles[i][j] = await loadTile(this.storage, new LatLng(lat, lng), this.options.downloader);
            })()
          });
        }).flat();

     // hier ist dieses Promise.all
     await Promise.all(tasks);
  }

  async countMissingTilesForArea(sw, ne: LatLng): Promise<number> {
    const south = Math.floor(sw.lat) - this.options.pad;
    const north = Math.floor(ne.lat) + 1 + this.options.pad;
    const west = Math.floor(sw.lng) - this.options.pad;
    const east = Math.floor(ne.lng) + 1 + this.options.pad;
    const rangeSN = range(south, north - 1);
    const rangeWE = range(west, east - 1);
    return await this.countMissingTilesForRanges(rangeSN, rangeWE);
  }

  async countMissingTilesForRanges(rangeSN, rangeWE): Promise<number> {
    let missingTiles = 0;
    for(let i = 0; i < rangeSN.length; i++) {
        for(let j = 0; j < rangeWE.length; j++) {
            const latLng = new LatLng(Math.floor(rangeSN[i]), Math.floor(rangeWE[j]));
            const key = tileKey(latLng);
            if(!this.options.downloader.getUrl(key)) 
              continue;
            const tileFile = key + '.hgt';
            if(!(await this.storage.hasTile(tileFile))) {
              missingTiles++;
            }
        }
    }
    return missingTiles;
  }

  getElevation(ll:LatLng): number {
    const tileLat = Math.floor(ll.lat),
        tileLng = Math.floor(ll.lng);

    if (tileLat < this.south || tileLat >= this.north ||
        tileLng < this.west || tileLng >= this.east) {
        throw new Error('Coordinate is outside tileset\'s bounds: ' + ll + `bounds: [${this.south}, ${this.west}],[${this.north}, ${this.east}]`);
    }

    return this.tiles[tileLat - this.south][tileLng - this.west].getElevation(ll);
  }
  destroy() {
    this.tiles.forEach((arr) => {
        arr.forEach((t) => {
            t.destroy();
        });
    });
  }
}
