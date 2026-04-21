import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node20",
  platform: "node",
  clean: true,
  minify: false,
  sourcemap: false,
  dts: false,
  splitting: false,
  shims: false,
  banner: {
    js: "#!/usr/bin/env node",
  },
  onSuccess: async () => {
    const { chmod } = await import("node:fs/promises");
    await chmod("dist/index.js", 0o755);
  },
});
