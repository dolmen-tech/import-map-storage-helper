import { StorageClient } from "./storage-clients";
import { GoogleCloudStorage } from "./storage-clients/google-cloud-storage";
import { Configuration, Package } from "./types";

type ModeOptions = {
  dryRun: boolean;
  interactive: boolean;
};

export function createMode(config: Configuration, options: ModeOptions): Mode {
  const client = new GoogleCloudStorage(
    config.storage.bucket,
    config.storage.pathPrefix
  );

  if (options.dryRun) {
    console.info("Running in dry-run mode");
    return new DryRun(client);
  }

  console.info("Running in default mode");
  return new Default(client);
}

export class Mode {
  protected _client: StorageClient;

  constructor(client: StorageClient) {
    this._client = client;
  }

  getPackages(): Promise<Set<Package>> {
    return this._client.getPackages();
  }
  keepPackage(pack: Package): Promise<void> {
    throw new Error("Method not implemented.");
  }
  deletePackage(pack: Package): Promise<void> {
    throw new Error("Method not implemented.");
  }
}

export class Default extends Mode {
  keepPackage(pack: Package): Promise<void> {
    return Promise.resolve();
  }

  deletePackage(pack: Package): Promise<void> {
    console.info("delete package %s - %s", pack.name, pack.version);
    return this._client.deletePackage(pack);
  }
}

export class DryRun extends Mode {
  keepPackage(pack: Package): Promise<void> {
    console.debug("keep package %s - %s", pack.name, pack.version);
    return Promise.resolve();
  }
  deletePackage(pack: Package): Promise<void> {
    console.info("delete package %s - %s", pack.name, pack.version);
    return Promise.resolve();
  }
}
