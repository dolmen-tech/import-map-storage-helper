import { Package } from "../types";

export interface StorageClient {
  getPackages(): Promise<Set<Package>>;
  deletePackage(pack: Package): Promise<void>;
}
