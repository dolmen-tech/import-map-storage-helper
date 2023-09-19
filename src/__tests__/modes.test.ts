import { Default, DryRun } from "../modes";
import { StorageClient } from "../storage-clients";

const client: StorageClient = {
  getPackages: jest.fn(),
  deletePackage: jest.fn(),
};

describe("DryRun", () => {
  const mode = new DryRun(client);

  beforeAll(() => {
    jest.spyOn(global.console, "log").mockImplementation();
    jest.spyOn(global.console, "info").mockImplementation();
    jest.spyOn(global.console, "debug").mockImplementation();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("package list retrieve from storage client", async () => {
    await mode.getPackages();
    expect(client.getPackages).toBeCalled();
  });

  test("don't delete package on storage", async () => {
    await mode.deletePackage({
      name: "app",
      version: "1.0.0",
      creationDate: new Date(),
    });
    expect(client.deletePackage).not.toBeCalled();
  });
});

describe("Default", () => {
  const mode = new Default(client);

  beforeAll(() => {
    jest.spyOn(global.console, "log").mockImplementation();
    jest.spyOn(global.console, "info").mockImplementation();
    jest.spyOn(global.console, "debug").mockImplementation();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("package list retrieve from storage client", async () => {
    await mode.getPackages();
    expect(client.getPackages).toBeCalled();
  });

  test("call storage client to delete package", async () => {
    await mode.deletePackage({
      name: "app",
      version: "1.0.0",
      creationDate: new Date(),
    });
    expect(client.deletePackage).toBeCalled();
  });
});
