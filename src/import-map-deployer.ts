import { Configuration } from "./types";
import axios from "axios";

export type ImdEnvironmentResponse = {
  environments: Array<ImdEnvironment>;
};

export type ImdEnvironment = {
  name: string;
  aliases: Array<string>;
  isDefault: boolean;
};

export type ImportMap = {
  imports: Object;
  scopes: Object;
};

export function createImportMapDeployer(
  config: Configuration
): ImportMapDeployer {
  if (!process.env.IMD_USERNAME) {
    throw new Error("IMD_USERNAME env variable is not defined");
  }

  if (!process.env.IMD_PASSWORD) {
    throw new Error("IMD_PASSWORD env variable is not defined");
  }

  return new ImportMapDeployer(
    config.importMapDeployer.url,
    process.env.IMD_USERNAME,
    process.env.IMD_PASSWORD
  );
}

export class ImportMapDeployer {
  private _url: string;
  private _username: string;
  private _password: string;

  constructor(url: string, username: string, password: string) {
    this._url = url;
    this._username = username;
    this._password = password;
  }

  async getEnvironments(): Promise<ImdEnvironmentResponse> {
    const response = await axios.get<ImdEnvironmentResponse>(
      `${this._url}/environments`,
      {
        auth: { username: this._username, password: this._password },
      }
    );

    return response.data;
  }

  async getImportMap(environment: string): Promise<ImportMap> {
    const response = await axios.get<ImportMap>(
      `${this._url}/import-map.json`,
      {
        params: { env: environment },
        auth: { username: this._username, password: this._password },
      }
    );

    return response.data;
  }
}
