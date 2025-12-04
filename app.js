/*
Copyright 2021 Square Inc.
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

const express = require("express");
const morganLogger = require("morgan");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

// Validate environment variables early
const { validateEnv, isProduction, getSecureFlag } = require("./util/envValidator");
const { logger, requestLogger } = require("./util/logger");

let env;
try {
  env = validateEnv();
} catch (error) {
  logger.error(error.message);
  process.exit(1);
}

const app = express();

const routes = require("./routes/index");
const adminRoutes = require("./routes/admin");
const firebaseAdminAuthRoutes = require("./routes/firebase-admin-auth");
const { locationsApi } = require("./util/square-client");
const {
  errorHandler,
  notFoundHandler,
  AsyncError
} = require("./middleware/errorHandler");
const { generateCsrfToken } = require("./middleware/authMiddleware");
const { attachUserToLocals, attachAdminUtils } = require("./middleware/adminMiddleware");
const { validateContentType } = require("./middleware/validation");

// Get location information and store it in app.locals so it is accessible in all pages.
locationsApi.retrieveLocation(process.env["SQ_LOCATION_ID"])
  .then((response) => {
    app.locals.location = response.result.location;
    logger.info("Location information loaded successfully");
  })
  .catch((error) => {
    if (error.statusCode === 401) {
      logger.error("Configuration failed. Verify `.env` file is correct.");
    } else {
      logger.error("Failed to retrieve location information", { error: error.message });
    }
    process.exit(1);
  });

// Set the view engine to ejs
app.set("view engine", "ejs");

// Configure trusted proxy for secure cookies behind reverse proxy
app.set("trust proxy", 1);

// Logging middleware
app.use(morganLogger(isProduction() ? "combined" : "dev"));
app.use(requestLogger());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"]
}));

// Security: Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests, please try again later",
  standardHeaders: true,
  legacyHeaders: false
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // stricter for API endpoints
  skipSuccessfulRequests: true
});

app.use(limiter);
app.use("/auth", apiLimiter);
app.use("/booking", apiLimiter);
app.use("/payment", apiLimiter);

// Static files
app.use(express.static(__dirname + "/public"));
app.use("/web", express.static(__dirname + "/public/web"));

// Request parsing with size limits
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({
  extended: false,
  limit: "10kb"
}));
app.use(validateContentType);

app.use(cookieParser());

// Session configuration with security best practices
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: getSecureFlag(), // true only in production with HTTPS
    httpOnly: true, // Prevent XSS attacks
    maxAge: 24 * 60 * 60 * 1000, // 1 day in milliseconds
    sameSite: "lax", // CSRF protection
    domain: process.env.COOKIE_DOMAIN || undefined
  },
  name: "bookingSessionId" // Custom session name for security
}));

// CSRF token generation middleware
app.use(generateCsrfToken);

// Admin utilities middleware
app.use(attachUserToLocals);
app.use(attachAdminUtils);

// Initialize Firebase Admin (for admin authentication)
const { firebaseAdminManager } = require("./util/firebase-admin");
firebaseAdminManager.initializeDefaultAdmin().catch((error) => {
  logger.warn("Failed to initialize default admin:", { error: error.message });
  // Don't exit - let the app start anyway
});

// Routes
app.use("/", routes);
app.use("/auth/admin", firebaseAdminAuthRoutes);
app.use("/admin", adminRoutes);

// 404 handler
app.use(notFoundHandler);

// Unified error handler (must be last)
app.use(errorHandler);

module.exports = app;
