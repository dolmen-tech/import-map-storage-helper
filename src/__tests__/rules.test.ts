import {
  ImportMapDeployer,
  createImportMapDeployer,
} from "../import-map-deployer";
import { Action, Engine, Rule } from "../rules";
import { Configuration, Package } from "../types";
import * as dayjs from "dayjs";

jest.mock("../import-map-deployer.ts");

let config: Configuration = require("./sample-config.json");

describe("Engine", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    config.storage.pathPrefix = "my-prefix/";
  });

  test("addUsedPackages filters packages on baseAssetUrl and pathPrefix", () => {
    const importUrls = [
      "https://whatever.domain.com/my-pack/pack.js",
      "https://assets.domain.com/wrong-prefix/a-pack/1.0.0/app.js",
      "https://assets.domain.com/my-prefix/b-pack/4.2.0/app.js",
      "https://assets.domain.com/my-prefix/b-pack/4.2.0/",
    ];

    const engine = new Engine(config);
    importUrls.forEach((url) => {
      engine.addUsedPackages(url);
    });

    expect(engine.usedPackages.size).toBe(1);
    expect(engine.usedPackages.has("b-pack/4.2.0")).toBe(true);
  });

  test("addUsedPackages filters packages only on baseAssetUrl when no pathPrefix", () => {
    const importUrls = [
      "https://whatever.domain.com/my-pack/pack.js",
      "https://assets.domain.com/a-pack/1.0.0/app.js",
      "https://assets.domain.com/b-pack/4.2.0/app.js",
      "https://assets.domain.com/b-pack/4.2.0/",
    ];

    config.storage.pathPrefix = undefined;

    const engine = new Engine(config);
    importUrls.forEach((url) => {
      engine.addUsedPackages(url);
    });

    expect(engine.usedPackages.size).toBe(2);
    expect(engine.usedPackages.has("b-pack/4.2.0")).toBe(true);
    expect(engine.usedPackages.has("a-pack/1.0.0")).toBe(true);
  });

  test("loadUsedPackages use importMap from ImportMapDeployer to get used packages", async () => {
    const engine = new Engine(config);
    const imd = new ImportMapDeployer("", "", "");

    jest.mocked(createImportMapDeployer).mockReturnValue(imd);

    jest.spyOn(imd, "getEnvironments").mockImplementation(() => {
      return Promise.resolve({
        environments: [
          {
            name: "my-env",
            aliases: [],
            isDefault: false,
          },
        ],
      });
    });

    jest.spyOn(imd, "getImportMap").mockImplementation(() => {
      return Promise.resolve({
        imports: {
          "@my-app": "https://assets.domain.com/my-prefix/my-app/2.0.0/app.js",
        },
        scopes: {
          "/scope": {
            "@b-app": "https://assets.domain.com/my-prefix/b-app/3.0.0/app.js",
          },
        },
      });
    });

    await engine.loadUsedPackages();

    expect(engine.usedPackages.size).toBe(2);
    expect(engine.usedPackages.has("my-app/2.0.0")).toBe(true);
    expect(engine.usedPackages.has("b-app/3.0.0")).toBe(true);
  });

  test("loadRules creates rules chain from configuration", () => {
    const engine = new Engine(config);
    engine.loadRules();

    expect(engine.ruleChain).toBeDefined();
    expect(engine.ruleChain?.name).toBe("my-rule");
    expect(engine.ruleChain?.nextRule?.name).toBe("my-rule2");
    expect(engine.ruleChain?.nextRule?.nextRule?.name).toBe("my-rule3");
  });

  test("getAction keep package when it is used in importMap", () => {
    const engine = new Engine(config);
    engine.usedPackages.add("my-app/1.0.0");
    engine.ruleChain = new Rule(
      "delete-everything",
      "delete",
      dayjs.default("2023-09-18T14:11:00.000Z")
    );

    const pack: Package = {
      name: "my-app",
      version: "1.0.0",
      creationDate: new Date("2023-09-11T15:25:11.227Z"),
    };

    expect(engine.getAction(pack)).toBe(Action.KEEP);
  });

  test("getAction return default Action when no rules configured", () => {
    let engine = new Engine(config);
    const pack: Package = {
      name: "my-app",
      version: "1.0.0",
      creationDate: new Date("2023-09-11T15:25:11.227Z"),
    };

    expect(engine.getAction(pack)).toBe(Action.KEEP);

    config.defaultAction = "delete";
    engine = new Engine(config);
    expect(engine.getAction(pack)).toBe(Action.DELETE);
  });

  test("getAction return rule's Action when rule match", () => {
    const engine = new Engine(config);
    engine.usedPackages.add("my-app/1.0.0");
    engine.ruleChain = new Rule(
      "delete-everything",
      "delete",
      dayjs.default("2023-09-18T14:11:00.000Z")
    );

    const pack: Package = {
      name: "a-app",
      version: "3.0.0",
      creationDate: new Date("2023-09-11T15:25:11.227Z"),
    };

    expect(engine.getAction(pack)).toBe(Action.DELETE);
  });
});

describe("Rule", () => {
  test("rule without selectors allways return its Action", () => {
    const rule = new Rule(
      "keep-everything",
      "keep",
      dayjs.default("2023-09-18T14:11:00.000Z")
    );

    const pack: Package = {
      name: "app",
      version: "1.0.0",
      creationDate: new Date("2023-09-11T15:25:11.227Z"),
    };

    expect(rule.apply(pack)).toBe(Action.KEEP);
    rule.action = Action.DELETE;
    expect(rule.apply(pack)).toBe(Action.DELETE);
  });

  test("rule with version selector return its Action only when version match", () => {
    const rule = new Rule(
      "delete-release-candidate",
      "delete",
      dayjs.default("2023-09-18T14:11:00.000Z"),
      // eslint-disable-next-line prettier/prettier
      "^\\d*.\\d*.\\d*-rc.\\d*"
    );

    const releaseCandidate: Package = {
      name: "app",
      version: "1.0.0-rc.6",
      creationDate: new Date("2023-09-11T15:25:11.227Z"),
    };
    const release: Package = {
      name: "app",
      version: "1.0.0",
      creationDate: new Date("2023-09-11T15:25:11.227Z"),
    };

    expect(rule.apply(releaseCandidate)).toBe(Action.DELETE);
    expect(rule.apply(release)).toBeUndefined();
  });

  test("rule with temporal selector return its Action only when selector match", () => {
    const rule = new Rule(
      "delete-14day-old",
      "delete",
      dayjs.default("2023-09-18T14:11:00.000Z"),
      undefined,
      { amount: 14, unit: "day" }
    );

    const recentVersion: Package = {
      name: "app",
      version: "2.0.0",
      creationDate: new Date("2023-09-15T15:25:11.227Z"),
    };
    const oldVersion: Package = {
      name: "app",
      version: "1.0.0",
      creationDate: new Date("2023-08-01T15:25:11.227Z"),
    };

    expect(rule.apply(recentVersion)).toBeUndefined();
    expect(rule.apply(oldVersion)).toBe(Action.DELETE);
  });

  test("rule with version and temporal selector return its Action only when both selector match", () => {
    const rule = new Rule(
      "delete-rc-2week-old",
      "delete",
      dayjs.default("2023-09-18T14:11:00.000Z"),
      // eslint-disable-next-line prettier/prettier
      "^\\d*.\\d*.\\d*-rc.\\d*",
      { amount: 2, unit: "week" }
    );

    const recentRelaseVersion: Package = {
      name: "app",
      version: "2.0.0",
      creationDate: new Date("2023-09-15T15:25:11.227Z"),
    };
    const oldReleaseVersion: Package = {
      name: "app",
      version: "1.0.0",
      creationDate: new Date("2023-08-01T15:25:11.227Z"),
    };
    const recentRcVersion: Package = {
      name: "app",
      version: "2.0.0-rc.2",
      creationDate: new Date("2023-09-15T15:25:11.227Z"),
    };
    const oldRcVersion: Package = {
      name: "app",
      version: "1.0.0-rc.16",
      creationDate: new Date("2023-08-01T15:25:11.227Z"),
    };

    expect(rule.apply(recentRelaseVersion)).toBeUndefined();
    expect(rule.apply(oldReleaseVersion)).toBeUndefined();
    expect(rule.apply(recentRcVersion)).toBeUndefined();
    expect(rule.apply(oldRcVersion)).toBe(Action.DELETE);
  });

  test("chained rules are call in the configured order", () => {
    const rule2 = new Rule(
      "delete-2week-old",
      "delete",
      dayjs.default("2023-09-18T14:11:00.000Z"),
      undefined,
      { amount: 2, unit: "week" }
    );
    const rule1 = new Rule(
      "delete-rc",
      "delete",
      dayjs.default("2023-09-18T14:11:00.000Z"),
      // eslint-disable-next-line prettier/prettier
      "^\\d*.\\d*.\\d*-rc.\\d*",
      undefined,
      rule2
    );

    const recentRelaseVersion: Package = {
      name: "app",
      version: "2.0.0",
      creationDate: new Date("2023-09-15T15:25:11.227Z"),
    };
    const oldReleaseVersion: Package = {
      name: "app",
      version: "1.0.0",
      creationDate: new Date("2023-08-01T15:25:11.227Z"),
    };
    const recentRcVersion: Package = {
      name: "app",
      version: "2.0.0-rc.2",
      creationDate: new Date("2023-09-15T15:25:11.227Z"),
    };
    const oldRcVersion: Package = {
      name: "app",
      version: "1.0.0-rc.16",
      creationDate: new Date("2023-08-01T15:25:11.227Z"),
    };

    expect(rule1.apply(recentRelaseVersion)).toBeUndefined();
    expect(rule1.apply(oldReleaseVersion)).toBe(Action.DELETE);
    expect(rule1.apply(recentRcVersion)).toBe(Action.DELETE);
    expect(rule1.apply(oldRcVersion)).toBe(Action.DELETE);
  });
});
