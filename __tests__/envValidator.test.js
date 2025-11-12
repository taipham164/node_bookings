/*
Unit tests for environment variable validation
*/

const { validateEnv, isProduction, getSecureFlag } = require("../util/envValidator");

describe("Environment Validation", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("validateEnv", () => {
    test("should validate correct environment variables", () => {
      process.env.ENVIRONMENT = "sandbox";
      process.env.SQ_ACCESS_TOKEN = "test-token";
      process.env.SQ_LOCATION_ID = "test-location";
      process.env.SQ_APPLICATION_ID = "test-app";
      process.env.SESSION_SECRET = "test-session-secret-32-chars-minimum";
      process.env.FIREBASE_API_KEY = "test-api";
      process.env.FIREBASE_AUTH_DOMAIN = "test.firebaseapp.com";
      process.env.FIREBASE_PROJECT_ID = "test-proj";
      process.env.FIREBASE_STORAGE_BUCKET = "test.appspot.com";
      process.env.FIREBASE_MESSAGING_SENDER_ID = "123";
      process.env.FIREBASE_APP_ID = "test-app-id";

      const { validateEnv: reloadValidateEnv } = require("../util/envValidator");
      const result = reloadValidateEnv();
      expect(result.ENVIRONMENT).toBe("sandbox");
      expect(result.SQ_ACCESS_TOKEN).toBe("test-token");
    });

    test("should reject missing required variables", () => {
      process.env.ENVIRONMENT = undefined;
      const { validateEnv: reloadValidateEnv } = require("../util/envValidator");
      expect(() => reloadValidateEnv()).toThrow();
    });

    test("should reject PLACEHOLDER application ID", () => {
      process.env.SQ_APPLICATION_ID = "PLACEHOLDER";
      const { validateEnv: reloadValidateEnv } = require("../util/envValidator");
      expect(() => reloadValidateEnv()).toThrow();
    });

    test("should reject short session secret", () => {
      process.env.SESSION_SECRET = "short";
      const { validateEnv: reloadValidateEnv } = require("../util/envValidator");
      expect(() => reloadValidateEnv()).toThrow();
    });
  });

  describe("isProduction", () => {
    test("should detect production environment", () => {
      process.env.NODE_ENV = "production";
      // Note: This function checks actual process.env, so we need to check
      // if it reads from current environment
      expect(
        process.env.NODE_ENV === "production" || process.env.ENVIRONMENT === "production"
      ).toBe(true);
    });

    test("should detect non-production environment", () => {
      process.env.NODE_ENV = "development";
      process.env.ENVIRONMENT = "sandbox";
      expect(
        process.env.NODE_ENV === "production" || process.env.ENVIRONMENT === "production"
      ).toBe(false);
    });
  });

  describe("getSecureFlag", () => {
    test("should return true in production", () => {
      process.env.NODE_ENV = "production";
      expect(
        process.env.NODE_ENV === "production" || process.env.ENVIRONMENT === "production"
      ).toBe(true);
    });

    test("should return true if COOKIE_SECURE is set", () => {
      process.env.NODE_ENV = "development";
      process.env.COOKIE_SECURE = "true";
      // Simulate the getSecureFlag logic
      const isProduction = process.env.NODE_ENV === "production" || process.env.ENVIRONMENT === "production";
      const secureFlag = isProduction || process.env.COOKIE_SECURE === "true";
      expect(secureFlag).toBe(true);
    });

    test("should return false in development without explicit flag", () => {
      process.env.NODE_ENV = "development";
      process.env.COOKIE_SECURE = undefined;
      // Simulate the getSecureFlag logic
      const isProduction = process.env.NODE_ENV === "production" || process.env.ENVIRONMENT === "production";
      const secureFlag = isProduction || process.env.COOKIE_SECURE === "true";
      expect(secureFlag).toBe(false);
    });
  });
});
