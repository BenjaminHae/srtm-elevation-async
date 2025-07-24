export default interface Storage {
  hasTile(tile): Promise<boolean>;
  getTileSize(tile): Promise<number>;
  readTile(tile): Promise<DataView>;
  writeTile(tile, data): Promise<void>;
  remove(tile): Promise<void>;
}
