import { File, Storage } from "@google-cloud/storage";
import { StorageClient } from ".";
import { Package } from "../types";

export async function map(
  file: File,
  prefix?: string
): Promise<Package | void> {
  let filename = file.name;

  if (prefix) {
    filename = filename.substring(prefix.length);
  }

  const dirs = filename.split("/");
  if (dirs.length < 2) return;

  const [metadata] = await file.getMetadata();

  if (!metadata.timeCreated) {
    console.error("No creation time for %s", file.name);
    return;
  }

  const timeCreated = new Date(metadata.timeCreated);

  return {
    name: dirs[0],
    version: dirs[1],
    creationDate: timeCreated,
  };
}

export class GoogleCloudStorage implements StorageClient {
  storage: Storage;
  private _bucket: string;
  private _pathPrefix?: string;

  constructor(bucket: string, pathPrefix?: string) {
    this.storage = new Storage();
    this._bucket = bucket;
    this._pathPrefix = pathPrefix;
  }

  async getPackages(): Promise<Set<Package>> {
    const [files] = await this.storage.bucket(this._bucket).getFiles({
      prefix: this._pathPrefix,
    });

    const packages = new Set<Package>();
    let previousPack: Package | undefined;

    for (const file of files) {
      const pack = await map(file, this._pathPrefix);
      // manage not a package file
      if (pack) {
        // package with multiple files don't have the same created time
        // here is the file filtering
        if (
          previousPack == undefined ||
          !(
            pack.name == previousPack.name &&
            pack.version == previousPack.version
          )
        ) {
          packages.add(pack);
          previousPack = pack;
        }
      }
    }

    return packages;
  }

  deletePackage(pack: Package): Promise<void> {
    return this.storage.bucket(this._bucket).deleteFiles({
      prefix:
        this._pathPrefix == undefined
          ? `${pack.name}/${pack.version}/`
          : `${this._pathPrefix}${pack.name}/${pack.version}/`,
    });
  }
}
