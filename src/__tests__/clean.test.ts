import { clean } from "../clean";
import { Configuration, Package } from "../types";
import { Engine, Action } from "../rules";
import { Mode } from "../modes";
import { StorageClient } from "../storage-clients";

const config: Configuration = require("./sample-config.json");

jest.mock("../rules");
jest.mock("../modes");

const packageList = [
  {
    name: "app",
    version: "1.0.0",
    creationDate: new Date(),
  },
  {
    name: "app",
    version: "2.0.0",
    creationDate: new Date(),
  },
  {
    name: "another-app",
    version: "1.1.0",
    creationDate: new Date(),
  },
  {
    name: "awesome-app",
    version: "5.2.1",
    creationDate: new Date(),
  },
];

describe("clean", () => {
  const client: StorageClient = {
    getPackages: jest.fn(),
    deletePackage: jest.fn(),
  };

  const mode = new Mode(client);
  const engine = new Engine(config);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("apply engine Action for existing packages", async () => {
    let packages = new Set<Package>(packageList);
    jest.mocked(mode.getPackages).mockResolvedValueOnce(packages);
    jest
      .mocked(engine.getAction)
      .mockReturnValueOnce(Action.DELETE)
      .mockReturnValueOnce(Action.KEEP)
      .mockReturnValueOnce(Action.DELETE)
      .mockReturnValueOnce(Action.DELETE);

    await clean(mode, engine);

    expect(mode.getPackages).toBeCalledTimes(1);
    expect(engine.getAction).toBeCalledTimes(packages.size);
    expect(jest.mocked(mode.keepPackage).mock.calls[0]).toStrictEqual([
      packageList[1],
    ]);
    expect(jest.mocked(mode.deletePackage).mock.calls).toStrictEqual([
      [packageList[0]],
      [packageList[2]],
      [packageList[3]],
    ]);
  });

  test("apply no Action when no package on storage", async () => {
    jest.mocked(mode.getPackages).mockResolvedValueOnce(new Set<Package>());
    await clean(mode, engine);
    expect(mode.getPackages).toBeCalledTimes(1);
    expect(engine.getAction).not.toBeCalled();
    expect(mode.keepPackage).not.toBeCalled();
    expect(mode.deletePackage).not.toBeCalled();
  });
});
