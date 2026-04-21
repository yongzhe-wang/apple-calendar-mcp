import { chmod } from "node:fs/promises";
import path from "node:path";
import { defineConfig } from "tsdown";

const env = {
  NODE_ENV: "production",
};

export default defineConfig({
  entry: { index: "src/index.ts" },
  outDir: "dist",
  format: ["esm"],
  platform: "node",
  target: "node22",
  clean: true,
  sourcemap: false,
  dts: false,
  fixedExtension: false,
  env,
  outputOptions: {
    banner: "#!/usr/bin/env node",
  },
  hooks: {
    "build:done": async (ctx) => {
      const output = path.join(ctx.options.outDir, "index.js");
      await chmod(output, 0o755);
    },
  },
});
