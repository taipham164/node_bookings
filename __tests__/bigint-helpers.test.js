/*
Unit tests for BigInt helpers
*/

const {
  safeNumberConversion,
  safeJSONStringify,
  convertPriceAmount,
  convertMsToMins,
  convertVersion,
  hasSquareError
} = require("../util/bigint-helpers");

describe("BigInt Helpers", () => {
  describe("safeNumberConversion", () => {
    test("should convert BigInt to number", () => {
      const bigInt = BigInt("12345");
      expect(safeNumberConversion(bigInt)).toBe(12345);
    });

    test("should handle string numbers", () => {
      expect(safeNumberConversion("12345")).toBe(12345);
    });

    test("should handle regular numbers", () => {
      expect(safeNumberConversion(12345)).toBe(12345);
    });

    test("should return 0 for invalid input", () => {
      expect(safeNumberConversion("abc")).toBe(0);
      expect(safeNumberConversion(null)).toBe(0);
      expect(safeNumberConversion(undefined)).toBe(0);
    });

    test("should handle Infinity", () => {
      const result = safeNumberConversion(BigInt("9".repeat(20)));
      expect(result).toBe(0); // Too large to convert
    });
  });

  describe("safeJSONStringify", () => {
    test("should stringify object with BigInt", () => {
      const obj = { amount: BigInt("1000"), name: "test" };
      const result = safeJSONStringify(obj);
      expect(result).toContain('"1000"');
      expect(result).toContain('"name"');
    });

    test("should preserve regular properties", () => {
      const obj = { name: "test", value: 123 };
      const result = safeJSONStringify(obj);
      expect(JSON.parse(result)).toEqual(obj);
    });
  });

  describe("convertPriceAmount", () => {
    test("should convert cents to dollars", () => {
      const result = convertPriceAmount(BigInt("5000"));
      expect(result.amount).toBe(5000);
      expect(result.displayAmount).toBe("50.00");
      expect(result.currency).toBe("USD");
    });

    test("should handle different currencies", () => {
      const result = convertPriceAmount(1000, "GBP");
      expect(result.currency).toBe("GBP");
      expect(result.displayAmount).toBe("10.00");
    });
  });

  describe("convertMsToMins", () => {
    test("should convert milliseconds to minutes", () => {
      expect(convertMsToMins(BigInt("3600000"))).toBe(60); // 1 hour
      expect(convertMsToMins(BigInt("1800000"))).toBe(30); // 30 mins
      expect(convertMsToMins(BigInt("900000"))).toBe(15); // 15 mins
    });

    test("should handle non-BigInt values", () => {
      expect(convertMsToMins(3600000)).toBe(60);
      expect(convertMsToMins("3600000")).toBe(60);
    });
  });

  describe("convertVersion", () => {
    test("should convert version to number", () => {
      expect(convertVersion(BigInt("123"))).toBe(123);
      expect(convertVersion("456")).toBe(456);
      expect(convertVersion(789)).toBe(789);
    });
  });

  describe("hasSquareError", () => {
    test("should detect error by code", () => {
      const error = {
        errors: [{ code: "INVALID_VALUE", field: "email" }]
      };
      expect(hasSquareError(error, "INVALID_VALUE")).toBe(true);
      expect(hasSquareError(error, "OTHER_CODE")).toBe(false);
    });

    test("should detect error by code and field", () => {
      const error = {
        errors: [{ code: "INVALID_VALUE", field: "email" }]
      };
      expect(hasSquareError(error, "INVALID_VALUE", "email")).toBe(true);
      expect(hasSquareError(error, "INVALID_VALUE", "phone")).toBe(false);
    });

    test("should return false for invalid error object", () => {
      expect(hasSquareError(null, "INVALID_VALUE")).toBe(false);
      expect(hasSquareError({ errors: null }, "INVALID_VALUE")).toBe(false);
      expect(hasSquareError({ errors: "not-array" }, "INVALID_VALUE")).toBe(false);
    });
  });
});
