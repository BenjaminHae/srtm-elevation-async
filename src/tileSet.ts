import { LRUCache as LRU } from 'lru-cache';
import loadTile from './loadTile';
import LatLng from './latLng';
import tileKey from './tileKey';
import StorageInterface from './storageInterface';
import Tile from './Tile';
import SRTMDownloader from './srtmDownloader';


//todo Tile = HGT

interface TileSetOptions {
  downloader?: SRTMDownloader
}

export default class TileSet {
  options: TileSetOptions;
  storage: StorageInterface;
  tileCache?: LRU<string, Tile>;
  loadingTiles: {[index: string]:Array<((tile: Tile)=>void)>};

  constructor(storage: StorageInterface, options: TileSetOptions) {
    this.options = Object.assign({}, {
        loadTile: loadTile
    }, options);
    this.storage = storage;
    this.tileCache = new LRU<string, Tile>({// todo typing?!
        max: 1000,
        dispose: function (n: Tile) {
            if(n) {
                n.destroy();
            }
        }
    });
    this.loadingTiles = {};
  }
  destroy() {
    this.tileCache?.clear();
    delete this.tileCache;
  }
  async getElevation(latLng: LatLng): Promise<number> {
    const key = tileKey(latLng);
    let tile = this.tileCache?.get(key);
    if (!tile) {
      tile = await this.loadTile(key, latLng);
    }
    return await tile.getElevation(latLng);
  }
  async loadTile(tileKey: string, latLng: LatLng): Promise<Tile> {
    return new Promise(async (resolve: (tile: Tile)=> void, reject) => {
      let loadQueue = this.loadingTiles[tileKey];
      if (!loadQueue) {
        loadQueue = [];
        this.loadingTiles[tileKey] = loadQueue;
        const tile = await loadTile(this.storage, latLng);
        this.tileCache?.set(tileKey, tile);
        const q = this.loadingTiles[tileKey];
        q.forEach((cb) => {
          cb(tile);
        });
        delete this.loadingTiles[tileKey];
        resolve(tile);
      }
      else {
        // the first one is not added to the queue, as resolve is directly called above
        loadQueue.push(resolve);//ggf. auch reject??
      }
    })
  }
}
