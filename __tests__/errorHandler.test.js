/*
Unit tests for error handler middleware
*/

const {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  handleSquareError
} = require("../middleware/errorHandler");

describe("Custom Error Classes", () => {
  describe("AppError", () => {
    test("should create an AppError with message and status code", () => {
      const error = new AppError("Something went wrong", 500);
      expect(error.message).toBe("Something went wrong");
      expect(error.statusCode).toBe(500);
      expect(error instanceof AppError).toBe(true);
    });

    test("should have default status code of 500", () => {
      const error = new AppError("Test error");
      expect(error.statusCode).toBe(500);
    });

    test("should include context data", () => {
      const context = { userId: "123" };
      const error = new AppError("Test", 400, context);
      expect(error.context).toEqual(context);
    });
  });

  describe("ValidationError", () => {
    test("should create a ValidationError with 400 status code", () => {
      const error = new ValidationError("Invalid input", ["field required"]);
      expect(error.statusCode).toBe(400);
      expect(error.errors).toEqual(["field required"]);
    });
  });

  describe("AuthenticationError", () => {
    test("should create an AuthenticationError with 401 status code", () => {
      const error = new AuthenticationError("Login required");
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe("Login required");
    });

    test("should have default message", () => {
      const error = new AuthenticationError();
      expect(error.message).toBe("Authentication required");
    });
  });

  describe("AuthorizationError", () => {
    test("should create an AuthorizationError with 403 status code", () => {
      const error = new AuthorizationError("Forbidden");
      expect(error.statusCode).toBe(403);
    });
  });

  describe("NotFoundError", () => {
    test("should create a NotFoundError with 404 status code", () => {
      const error = new NotFoundError("User not found");
      expect(error.statusCode).toBe(404);
    });
  });
});

describe("Square Error Handling", () => {
  test("should handle time slot not available error", () => {
    const error = {
      statusCode: 400,
      errors: [{ detail: "That time slot is no longer available" }]
    };
    const result = handleSquareError(error);
    expect(result.statusCode).toBe(400);
    expect(result.message).toContain("no longer available");
  });

  test("should handle stale version error", () => {
    const error = {
      statusCode: 400,
      errors: [{ detail: "Stale version" }]
    };
    const result = handleSquareError(error);
    expect(result.message).toContain("updated");
  });

  test("should handle cancellation period error", () => {
    const error = {
      statusCode: 400,
      errors: [{ detail: "cannot cancel past cancellation period end" }]
    };
    const result = handleSquareError(error);
    expect(result.message).toContain("cancellation period");
  });

  test("should handle invalid email error", () => {
    const error = {
      statusCode: 400,
      errors: [{ code: "INVALID_VALUE", field: "email" }]
    };
    const result = handleSquareError(error);
    expect(result.message).toContain("email");
  });

  test("should return default error message for unknown errors", () => {
    const error = {
      statusCode: 500,
      errors: [{ detail: "Unknown error" }]
    };
    const result = handleSquareError(error);
    expect(result.statusCode).toBe(500);
    expect(result.message).toContain("booking service");
  });
});
