#! /usr/bin/env node

import { Command } from "commander";
import figlet from "figlet";
import { clean } from "./clean";
import { createEngine } from "./rules";
import { createMode } from "./modes";
import path from "path";
import fs from "fs";
import { Configuration } from "./types";
import { version } from "../package.json";

const program = new Command();

let standard = fs.readFileSync(path.join(__dirname, "Standard.flf"), "utf8");
figlet.parseFont("Standard", standard);
console.info(figlet.textSync("Storage Helper"));
console.info("");

program.version(version).description("ImportMap Storage Helper");

program
  .command("clean")
  .description("clean storage following the rules provided")
  .allowUnknownOption(true)
  .option("-d, --dry-run", "Do not delete file, only print Action")
  .option(
    "-c, --config <configfile>",
    "configuration file path (relative to the current directory)"
  )
  .action(async (options) => {
    let config = {};
    if (options.config) {
      if (path.isAbsolute(options.config)) {
        config = require(options.config);
      } else {
        config = require(path.join(process.cwd(), options.config));
      }
    } else {
      //see if the default config.json exists
      if (fs.existsSync(path.resolve(__dirname, "../config.json"))) {
        config = require("../config.json");
      }
    }

    const mode = createMode(config as Configuration, options);
    const engine = await createEngine(config as Configuration);
    clean(mode, engine);
  });

program.parse(process.argv);
