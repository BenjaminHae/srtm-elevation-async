import SyncTileSet from './syncTileSet';
import LatLng from './latLng';
import SrtmStorage from './srtmStorage';

async function main() {
  // From Madrid to Paris [ latitude, longitude ]
  let locations = [
      [ 40.396764305572056, -3.7408447265625004  ],
      [ 44.465151013519645,  2.2467041015625004  ],
      [ 43.23319741022136 , -2.9278564453125     ],
      [ 43.337164854911094, -1.4337158203125     ],
      [ 44.84418558537004 , -0.6207275390625001  ],
      [ 46.5739667965278  ,  0.36254882812500006 ],
      [ 47.87214396888731 ,  1.9006347656250002  ],
      [ 48.850258199721495,  2.3291015625000004  ]
  ];
  
  // Calculate min and max lats/lngs
  const lats = locations.map(l => l[0]);
  const lngs = locations.map(l => l[1]);
  const minLat = Math.min.apply(null, lats);
  const maxLat = Math.max.apply(null, lats);
  const minLng = Math.min.apply(null, lngs);
  const maxLng = Math.max.apply(null, lngs);
  let timestampBegin = process.hrtime();
  let timestampEnd;
  
  const storage = new SrtmStorage('./data/');
  const tileset = new SyncTileSet(storage, new LatLng(minLat, minLng), new LatLng(maxLat, maxLng));
  await tileset.init();
  
  timestampEnd = process.hrtime();
  process.stdout.write('\nRetrieve tiles from provider: ' + (timestampEnd[0] - timestampBegin[0]) + 's ' + (Math.abs(timestampEnd[1] - timestampBegin[1]) / 1000000) + 'ms\n');
  
  timestampBegin = process.hrtime();
  
  // All tiles are loaded (or downloaded, if they were not already on disk)
  // and queries can be made synchronous.
  locations.forEach(l => {
       console.log(tileset.getElevation(new LatLng(l[0], l[1])));
  });
 
  timestampEnd = process.hrtime();
  process.stdout.write('\nElevation calculation time: ' + (timestampEnd[0] - timestampBegin[0]) + 's ' + (Math.abs(timestampEnd[1] - timestampBegin[1]) / 1000000) + 'ms\n');
}
main();
