module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "ci",
        "chore",
        "docs",
        "refactor",
        "perf",
        "test",
        "revert",
        "build",
      ],
    ],
  },
};
