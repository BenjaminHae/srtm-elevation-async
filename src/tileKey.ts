import LatLng from './latLng';

const zeroPad = function(v: number, l: number) {
    let r = v.toString();
    while (r.length < l) {
        r = '0' + r;
    }
    return r;
};

export default function tileKey(latLng: LatLng): string {
  return `${latLng.lat < 0 ? 'S':'N'}${zeroPad(Math.abs(Math.floor(latLng.lat)),2)}${latLng.lng < 0 ? 'W':'E'}${zeroPad(Math.abs(Math.floor(latLng.lng)),3)}`
}
