import { Bucket, File, Storage } from "@google-cloud/storage";
import { GoogleCloudStorage, map } from "../google-cloud-storage";

jest.mock("@google-cloud/storage");

const file = new File(new Bucket(new Storage(), "name"), "name");

describe("map function", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("map with pathPrefix remove prefix", async () => {
    file.name = "prefix/my-app/2.51.3/filename.js";
    const timeCreated = "2023-09-11T15:25:11.227Z";
    jest.spyOn(file, "getMetadata").mockImplementation(() => {
      let metadata = {
        timeCreated: timeCreated,
      };
      return Promise.resolve([metadata, {}]);
    });

    const pack = await map(file, "prefix/");

    if (!pack) {
      fail();
    }
    expect(pack.name).toBe("my-app");
    expect(pack.version).toBe("2.51.3");
    expect(pack.creationDate.toISOString()).toBe(timeCreated);
  });

  test("map without prefix", async () => {
    file.name = "anApp/4.0.23-rc.1/dist/dir/filename.js";
    const timeCreated = "2023-09-11T15:25:11.227Z";
    jest.spyOn(file, "getMetadata").mockImplementation(() => {
      let metadata = {
        timeCreated: timeCreated,
      };
      return Promise.resolve([metadata, {}]);
    });

    const pack = await map(file, undefined);

    if (!pack) {
      fail();
    }
    expect(pack.name).toBe("anApp");
    expect(pack.version).toBe("4.0.23-rc.1");
    expect(pack.creationDate.toISOString()).toBe(timeCreated);
  });
});

describe("getPackages", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("filter duplicated packages", async () => {
    const storage = new Storage();
    const bucket = new Bucket(storage, "my-bucket");
    const client = new GoogleCloudStorage("my-bucket");
    client.storage = storage;

    jest.mocked(storage.bucket).mockImplementation(() => {
      return bucket;
    });

    const file1 = new File(bucket, "name");
    file1.name = "my-app/2.51.3/filename.js";
    const file2 = new File(bucket, "name");
    file2.name = "my-app/2.51.3/filename-other.js";
    const file3 = new File(bucket, "name");
    file3.name = "my-app/2.50.0/filename.js";
    const file4 = new File(bucket, "name");
    file4.name = "a-app/1.0.0/filename.js";

    const files: Array<File> = [file1, file2, file3, file4];

    const getFileSpy = jest.mocked(bucket.getFiles).mockImplementation(() => {
      return Promise.resolve([files, {}, {}]);
    });

    const timeCreated = "2023-09-11T15:25:11.227Z";
    const getMetadataSpy = jest
      .spyOn(file, "getMetadata")
      .mockImplementation(() => {
        let metadata = {
          timeCreated: timeCreated,
        };
        return Promise.resolve([metadata, {}]);
      });

    const packages = await client.getPackages();

    expect(getFileSpy).toBeCalledTimes(1);
    expect(getMetadataSpy).toBeCalledTimes(files.length);

    expect(packages.size).toBe(3);
  });
});
