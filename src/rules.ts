import { createImportMapDeployer } from "./import-map-deployer";
import { Configuration, DurationConfig, Package } from "./types";
import * as dayjs from "dayjs";

export enum Action {
  KEEP,
  DELETE,
}

export async function createEngine(config: Configuration): Promise<Engine> {
  const engine = new Engine(config);
  await engine.loadUsedPackages();
  engine.loadRules();
  return engine;
}

export class Rule {
  name: string;
  action: Action;
  versionSelector?: RegExp;
  olderThan?: dayjs.Dayjs;
  nextRule?: Rule;

  constructor(
    name: string,
    action: string,
    now: dayjs.Dayjs,
    versionSelector?: string,
    olderThan?: DurationConfig,
    nextRule?: Rule
  ) {
    this.name = name;
    this.action = action.toUpperCase() == "KEEP" ? Action.KEEP : Action.DELETE;
    if (versionSelector) {
      this.versionSelector = new RegExp(versionSelector);
    }
    if (olderThan) {
      this.olderThan = now.subtract(
        olderThan.amount,
        olderThan.unit as dayjs.ManipulateType
      );
    }
    this.nextRule = nextRule;
  }

  match(version: string): boolean {
    if (this.versionSelector) {
      return this.versionSelector.test(version);
    }

    return true;
  }

  apply(pack: Package): Action | void {
    if (this.match(pack.version)) {
      if (
        !this.olderThan ||
        dayjs.default(pack.creationDate).isBefore(this.olderThan)
      ) {
        return this.action;
      }
    }

    // The rule do not match : call next or return
    if (this.nextRule) {
      return this.nextRule.apply(pack);
    }

    return;
  }
}

export class Engine {
  private _configuration: Configuration;

  usedPackages: Set<string>;
  ruleChain?: Rule;

  constructor(config: Configuration) {
    this._configuration = config;
    this.usedPackages = new Set();
  }

  addUsedPackages(importUrl: string) {
    // Only url started with the assetBaseUrl are treated
    if (importUrl.startsWith(this._configuration.storage.assetBaseUrl)) {
      let importPath = importUrl.substring(
        this._configuration.storage.assetBaseUrl.length
      );

      if (this._configuration.storage.pathPrefix != undefined) {
        // path that do not start with the prefix are excluded
        if (!importPath.startsWith(this._configuration.storage.pathPrefix)) {
          return;
        }

        importPath = importPath.substring(
          this._configuration.storage.pathPrefix.length
        );
      }

      let dirs = importPath.split("/");
      if (dirs.length >= 2) {
        this.usedPackages.add(`${dirs[0]}/${dirs[1]}`);
      }
    }
  }

  async loadUsedPackages(): Promise<void> {
    const imd = createImportMapDeployer(this._configuration);
    const environments = (await imd.getEnvironments()).environments.map(
      (env) => env.name
    );

    Promise.all(
      environments.map(async (env) => {
        const importmap = await imd.getImportMap(env);

        Object.values(importmap.imports).forEach((importUrl) => {
          this.addUsedPackages(importUrl);
        });

        Object.values(importmap.scopes).forEach((scope) => {
          Object.values(scope).forEach((importUrl: any) => {
            this.addUsedPackages(importUrl);
          });
        });
      })
    );

    return Promise.resolve();
  }

  loadRules(): void {
    const now = dayjs.default();
    let previousRule: Rule | undefined = undefined;
    // reverse loop to build rule chain
    for (let i = this._configuration.rules.length - 1; i >= 0; i--) {
      const ruleConfig = this._configuration.rules[i];
      const rule: Rule = new Rule(
        ruleConfig.name,
        ruleConfig.action,
        now,
        ruleConfig.versionSelector,
        ruleConfig.olderThan,
        previousRule
      );
      previousRule = rule;
    }

    this.ruleChain = previousRule;
  }

  getAction(pack: Package): Action {
    if (this.usedPackages.has(`${pack.name}/${pack.version}`)) {
      return Action.KEEP;
    }

    if (this.ruleChain) {
      let ruleAction = this.ruleChain.apply(pack);
      if (ruleAction) {
        return ruleAction;
      }
    }

    return this._configuration.defaultAction.toUpperCase() == "KEEP"
      ? Action.KEEP
      : Action.DELETE;
  }
}
