import StorageInterface from './storageInterface';
import srtmDb from './srtm-db';
import LatLng from './latLng';
import {
  BlobReader,
  TextReader,
  TextWriter,
  ZipReader
} from '@zip.js/zip.js';

interface SRTMDownloaderOptions {
  provider?: string;
  username?: string;
  password?: string;
  _cookie?: string;
}

export default class SRTMDownloader {
  options: SRTMDownloaderOptions;
  timeout: number;
  downloads: {[index: string]: Promise<any>}; // todo type
  storage: StorageInterface;
  constructor(storage: StorageInterface, options: SRTMDownloaderOptions = {}) {
    this.options = Object.assign({
        provider: 'https://srtm.fasma.org/{lat}{lng}.SRTMGL3S.hgt.zip',
        username: null, // Earthdata username
        password: null, // Earthdata password
    }, options);
    this.timeout = 30000; // Global fetch timeout
    //this._httpsAgent = new https.Agent({ rejectUnauthorized: false }); // Ignore SSL certificates
    this.storage = storage;
    this.downloads = {};
  }

  async init(tileKey: string): Promise<void> {
    var url = this.getUrl(tileKey);

    if(url === null) {
        throw new Error("Missing url");
    }

    if(this.options.provider.indexOf("usgs.gov") !== -1 && this.options.username && this.options.password && !this.options._cookie) {
        const auth = "Basic " + Buffer.from(this.options.username + ":" + this.options.password).toString("base64");
        let res = await fetch(url, {
                timeout: this._timeout,
                redirect: 'manual'
            });
    
        const authorizeUrl = res.headers.raw()['location'];
        if(!authorizeUrl) {
            throw new Error("Missing authorization url");
        }
        res = await fetch(authorizeUrl[0], {
            headers : {
                "Authorization": auth
            },
            timeout: this._timeout,
            redirect: 'manual'
        });

        const oauthUrl = res.headers.raw()['location'];
        if(!oauthUrl) {
            throw new Error("Missing oauth url");
        }
        res = await fetch(oauthUrl[0], {
            timeout: this._timeout,
            redirect: 'manual'
        });

        const cookie = res.headers.raw()['set-cookie'];
        if(!cookie) {
            throw new Error("Missing cookie");
        }
        this.options._cookie = cookie[0];
    }
  }

  // for calls with the same tileKey, only the first one blocks, all other resolve immediately
  // do we need latLng?
  async download(tileKey: string, latLng: LatLng): Promise<void>{
    const cleanup = () => {
        delete this._downloads[tileKey];
    }

    const url = this.getUrl(tileKey);

    if(url === null) {
        return;
    }

    // todo: do we need to return this?
    const download = this._downloads[tileKey];

    if (!download) {
      try {
        const zipfile = url.substring(url.lastIndexOf('/') + 1);
        this._downloads[tileKey] = this._download(url);
        const zipped = await this._downloads[tileKey];
        const data = await this.unzip(zipped)
        await this.storage.writeTile(tileKey, data);
      } finally {
        cleanup();
      }
    }
  }

  getUrl(tileKey: string): string {
    let url = null;
    if(srtmDb.includes(tileKey)) {
      const lat = tileKey.substr(0, 3);
      const lng = tileKey.substr(3, 4);
      url = this.options.provider.replace(/{lat}/g, lat).replace(/{lng}/g, lng);
    }
    return url;
  }

  async _download(url: string):Promise<Blob> { // todo
    let _options = {};
    _options.timeout = this._timeout;
    _options.headers = {};
    if(this.options._cookie) {
        _options.headers['Cookie'] = this.options._cookie;
    }
    try {
        const response = await fetch(url, _options);
        if(response.status === 200) {
            return await response.blob();
        } else {
            throw new Error("Error downloading file");
        }
    } catch(err) {
        throw new Error(err || response.headers['www-authenticate'] || response);
    }
  }

  async unzip(zipFileBlog: Blob): Promise<> {
    const zipFileReader = new BlobReader(zipFileBlob);
    // Creates a TextWriter object where the content of the first entry in the zip
    // will be written.
    // maybe use https://gildas-lormeau.github.io/zip.js/api/classes/Reader.html
    // or https://gildas-lormeau.github.io/zip.js/api/classes/Uint8ArrayReader.html
    const tileWriter = new TextWriter();
    
    // Creates a ZipReader object reading the zip content via `zipFileReader`,
    // retrieves metadata (name, dates, etc.) of the first entry, retrieves its
    // content via `helloWorldWriter`, and closes the reader.
    const zipReader = new ZipReader(zipFileReader);
    const firstEntry = (await zipReader.getEntries()).shift();
    const data = await firstEntry.getData(tileWriter);
    await zipReader.close();
    return data;
  }
}
