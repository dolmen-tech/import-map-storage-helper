import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import terser from "@rollup/plugin-terser";
import copy from "rollup-plugin-copy";
import shebang from "rollup-plugin-preserve-shebang";

export default {
  input: "src/index.ts",
  output: {
    file: "dist/index.js",
    format: "cjs",
  },
  plugins: [
    typescript(),
    json(),
    nodeResolve(),
    commonjs(),
    terser(),
    copy({
      targets: [
        { src: "node_modules/figlet/fonts/Standard.flf", dest: "dist" },
      ],
    }),
    shebang(),
  ],
};
