/*
Unit tests for validators utility
*/

const {
  normalizePhoneNumber,
  isValidPhoneNumber,
  isValidEmail,
  isValidName,
  isValidPostalCode,
  validateCustomerData,
  validateBookingData
} = require("../util/validators");

describe("Phone Number Validation", () => {
  describe("normalizePhoneNumber", () => {
    test("should normalize 10-digit US phone number", () => {
      expect(normalizePhoneNumber("5551234567")).toBe("+15551234567");
    });

    test("should normalize 11-digit US phone number starting with 1", () => {
      expect(normalizePhoneNumber("15551234567")).toBe("+15551234567");
    });

    test("should normalize formatted phone numbers", () => {
      expect(normalizePhoneNumber("(555) 123-4567")).toBe("+15551234567");
    });

    test("should handle international numbers", () => {
      expect(normalizePhoneNumber("447911123456")).toMatch(/^\+447911123456$/);
    });

    test("should return null for invalid input", () => {
      expect(normalizePhoneNumber("")).toBeNull();
      expect(normalizePhoneNumber(null)).toBeNull();
      expect(normalizePhoneNumber("abc")).toBeNull();
    });
  });

  describe("isValidPhoneNumber", () => {
    test("should validate correct phone numbers", () => {
      expect(isValidPhoneNumber("5551234567")).toBe(true);
      expect(isValidPhoneNumber("15551234567")).toBe(true);
      expect(isValidPhoneNumber("+15551234567")).toBe(true);
    });

    test("should reject invalid phone numbers", () => {
      expect(isValidPhoneNumber("123")).toBe(false);
      expect(isValidPhoneNumber("")).toBe(false);
      expect(isValidPhoneNumber(null)).toBe(false);
    });
  });
});

describe("Email Validation", () => {
  test("should validate correct email addresses", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidEmail("test.user@domain.co.uk")).toBe(true);
  });

  test("should reject invalid email addresses", () => {
    expect(isValidEmail("invalid-email")).toBe(false);
    expect(isValidEmail("@example.com")).toBe(false);
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail(null)).toBe(false);
  });
});

describe("Name Validation", () => {
  test("should validate correct names", () => {
    expect(isValidName("John")).toBe(true);
    expect(isValidName("Mary-Jane")).toBe(true);
    expect(isValidName("Jean O'Brien")).toBe(true);
  });

  test("should reject invalid names", () => {
    expect(isValidName("J0hn")).toBe(false);
    expect(isValidName("")).toBe(false);
    expect(isValidName(null)).toBe(false);
  });
});

describe("Postal Code Validation", () => {
  test("should validate correct postal codes", () => {
    expect(isValidPostalCode("12345")).toBe(true);
    expect(isValidPostalCode("123456")).toBe(true);
    expect(isValidPostalCode("90210")).toBe(true);
  });

  test("should reject invalid postal codes", () => {
    expect(isValidPostalCode("123")).toBe(false);
    expect(isValidPostalCode("")).toBe(false);
    expect(isValidPostalCode(null)).toBe(false);
  });
});

describe("Customer Data Validation", () => {
  test("should validate correct customer data", () => {
    const data = {
      givenName: "John",
      familyName: "Doe",
      emailAddress: "john@example.com",
      phoneNumber: "15551234567"
    };
    const result = validateCustomerData(data);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("should reject missing required fields", () => {
    const data = {
      givenName: "John",
      emailAddress: "john@example.com"
    };
    const result = validateCustomerData(data);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test("should reject invalid email", () => {
    const data = {
      givenName: "John",
      familyName: "Doe",
      emailAddress: "invalid-email",
      phoneNumber: "15551234567"
    };
    const result = validateCustomerData(data);
    expect(result.valid).toBe(false);
  });
});

describe("Booking Data Validation", () => {
  test("should validate correct booking data", () => {
    const data = {
      serviceId: "550e8400-e29b-41d4-a716-446655440000",
      staffId: "550e8400-e29b-41d4-a716-446655440001",
      startAt: "2024-12-25T10:00:00Z",
      phoneNumber: "15551234567"
    };
    const result = validateBookingData(data);
    expect(result.valid).toBe(true);
  });

  test("should reject missing required fields", () => {
    const data = {
      serviceId: "550e8400-e29b-41d4-a716-446655440000"
    };
    const result = validateBookingData(data);
    expect(result.valid).toBe(false);
  });

  test("should reject invalid UUID format", () => {
    const data = {
      serviceId: "invalid-uuid",
      staffId: "550e8400-e29b-41d4-a716-446655440001",
      startAt: "2024-12-25T10:00:00Z",
      phoneNumber: "15551234567"
    };
    const result = validateBookingData(data);
    expect(result.valid).toBe(false);
  });
});
