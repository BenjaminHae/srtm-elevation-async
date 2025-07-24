import tileKey from './tileKey';
import Tile from './Tile';
import LatLng from './latLng';
import StorageInterface from './storageInterface';

export default async function loadTile(storage: StorageInterface, latLng: LatLng, downloader?: any): Promise<Tile> { // todo type downloader
  const ll = new LatLng(Math.floor(latLng.lat), Math.floor(latLng.lng));
  const key = tileKey(ll);
  const tileFile = key + '.hgt'

  const exists = await storage.hasTile(tileFile);
  if (!exists) {
    if (downloader) {
      await downloader.download(key, latLng);
    }
    else {
      throw new Error('Tile does not exist: ' + tileFile);
    }
  }
  try {
    const tile = new Tile(storage)
    await tile.init(tileFile, ll);
    return tile;
  } catch(e) {
    throw new Error( 'Unable to load tile "' + tileFile + '": ' + e);
  }
}
