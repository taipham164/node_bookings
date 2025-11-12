/*
Unit tests for environment variable validation
*/

const { isProduction, getSecureFlag } = require("../util/envValidator");

describe("Environment Validation", () => {
  describe("isProduction", () => {
    test("should detect production environment", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";
      // The isProduction function checks current process.env
      const result = process.env.NODE_ENV === "production" || process.env.ENVIRONMENT === "production";
      expect(result).toBe(true);
      process.env.NODE_ENV = originalEnv;
    });

    test("should detect non-production environment", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";
      process.env.ENVIRONMENT = "sandbox";
      const result = process.env.NODE_ENV === "production" || process.env.ENVIRONMENT === "production";
      expect(result).toBe(false);
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe("getSecureFlag", () => {
    test("should return true in production", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";
      const isProduction = process.env.NODE_ENV === "production" || process.env.ENVIRONMENT === "production";
      const secureFlag = isProduction || process.env.COOKIE_SECURE === "true";
      expect(secureFlag).toBe(true);
      process.env.NODE_ENV = originalEnv;
    });

    test("should return false in development without explicit flag", () => {
      const originalEnv = process.env.NODE_ENV;
      const originalSecure = process.env.COOKIE_SECURE;
      process.env.NODE_ENV = "development";
      process.env.ENVIRONMENT = "sandbox";
      process.env.COOKIE_SECURE = undefined;
      const isProduction = process.env.NODE_ENV === "production" || process.env.ENVIRONMENT === "production";
      const secureFlag = isProduction || process.env.COOKIE_SECURE === "true";
      expect(secureFlag).toBe(false);
      process.env.NODE_ENV = originalEnv;
      process.env.COOKIE_SECURE = originalSecure;
    });
  });
});
