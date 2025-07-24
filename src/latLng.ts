export default class LatLng {
  lat: number;
  lng: number;
  static fromLatLng(ll: Array<number> | LatLng): LatLng {
    if (isLatLng(ll)) {
      return ll;
    }
    return new LatLng(ll[0], ll[1]);
  }

  constructor(lat, lng: number) {
    this.lat = lat;
    this.lng = lng;
  }

  toString(): string {
    return `lat=${this.lat}, lng=${this.lng}`
  }
}

function isLatLng(ll: Array<number> | LatLng): ll is LatLng {
  return (ll as LatLng).lat !== undefined &&
         (ll as LatLng).lng !== undefined;
}
