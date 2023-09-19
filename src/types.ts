export type Package = {
  name: string;
  version: string;
  creationDate: Date;
};

export enum storageType {
  gcs,
}

export type StorageConfig = {
  type: storageType;
  bucket: string;
  pathPrefix?: string;
  assetBaseUrl: string;
};

export type ImdConfig = {
  url: string;
};

export type RuleConfig = {
  name: string;
  action: string;
  versionSelector?: string;
  olderThanAmount?: number;
  olderThanUnit?: string;
};

export type Configuration = {
  storage: StorageConfig;
  importMapDeployer: ImdConfig;
  defaultAction: string;
  rules: Array<RuleConfig>;
};
