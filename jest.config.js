module.exports = {
  displayName: "bookings-api",
  testEnvironment: "node",
  coverageDirectory: "./coverage",
  collectCoverageFrom: [
    "**/*.js",
    "!node_modules/**",
    "!coverage/**",
    "!jest.config.js",
    "!bin/**"
  ],
  testMatch: [
    "**/__tests__/**/*.js",
    "**/?(*.)+(spec|test).js"
  ],
  testTimeout: 10000,
  verbose: true,
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },
  setupFilesAfterEnv: ["<rootDir>/__tests__/setup.js"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1"
  }
};
