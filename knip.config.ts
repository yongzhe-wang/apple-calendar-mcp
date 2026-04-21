const config = {
  project: ["src/**/*.ts!", "test/**/*.ts!", "*.config.ts!"],
  vitest: {
    config: ["vitest.config.ts"],
    entry: ["test/**/*.test.ts"],
  },
  // markdownlint-cli2 runs via .pre-commit-config.yaml and GitHub Actions.
  // tsx is used for ad-hoc debugging of src/*.ts without building.
  ignoreDependencies: ["markdownlint-cli2", "tsx"],
} as const;

export default config;
