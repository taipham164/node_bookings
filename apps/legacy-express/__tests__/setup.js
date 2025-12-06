/*
Jest setup file - runs before all tests
*/

// Mock environment variables for testing
process.env.NODE_ENV = "test";
process.env.ENVIRONMENT = "sandbox";
process.env.SQ_ACCESS_TOKEN = "test-token";
process.env.SQ_LOCATION_ID = "test-location";
process.env.SQ_APPLICATION_ID = "test-app-id";
process.env.SESSION_SECRET = "test-session-secret-32-chars-minimum";
process.env.FIREBASE_API_KEY = "test-api-key";
process.env.FIREBASE_AUTH_DOMAIN = "test.firebaseapp.com";
process.env.FIREBASE_PROJECT_ID = "test-project";
process.env.FIREBASE_STORAGE_BUCKET = "test.appspot.com";
process.env.FIREBASE_MESSAGING_SENDER_ID = "12345";
process.env.FIREBASE_APP_ID = "test-app-id";

// Suppress console logs during testing
global.console.log = jest.fn();
global.console.warn = jest.fn();
global.console.error = jest.fn();
