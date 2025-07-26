export default interface Storage {
  hasTile(tile: string): Promise<boolean>;
  getTileSize(tile: string): Promise<number>;
  readTile(tile: string): Promise<DataView>;
  writeTile(tile: string, data): Promise<void>;
  remove(tile: string): Promise<void>;
}
