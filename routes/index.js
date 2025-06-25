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
const router = express.Router();
const availabilityRoute = require("./availability");
const bookingRoute = require("./booking");
const contactRoute = require("./contact");
const servicesRoute = require("./services");
const staffRoute = require("./staff");
const authRoute = require("./auth"); // Add the new auth route
const customerRoute = require("./customer"); // Add the new customer route
const testPolicyRoute = require("./test-policy"); // Add the test policy route
const paymentRoute = require("./payment"); // Add the payment route
const testBookingPolicyRoute = require("./test-booking-policy"); // Add booking policy test route
const debugBookingRoute = require("./debug-booking"); // Add debug booking route

router.use("/availability", availabilityRoute);
router.use("/contact", contactRoute);
router.use("/services", servicesRoute);
router.use("/staff", staffRoute);
router.use("/booking", bookingRoute);
router.use("/auth", authRoute); // Add auth routes
router.use("/customer", customerRoute); // Add customer routes
router.use("/test-policy", testPolicyRoute); // Add test policy route
router.use("/payment", paymentRoute); // Add payment routes
router.use("/test-booking-policy", testBookingPolicyRoute); // Add booking policy test route
router.use("/debug", debugBookingRoute); // Add debug booking route

// Debug route for Square payment form
router.get("/square-debug", function(req, res, next) {
  res.render("pages/square-debug", {
    title: "Square Payment Debug"
  });
});

// Minimal debug route for Square payment form
router.get("/square-debug-minimal", function(req, res, next) {
  res.render("pages/square-debug-minimal", {
    title: "Square Debug Minimal"
  });
});

// Sandbox test route for Square payment form
router.get("/square-sandbox-test", function(req, res, next) {
  res.render("pages/square-sandbox-test", {
    title: "Square Sandbox Test"
  });
});

// Test route for availability layout
router.get('/test-availability', (req, res) => {
  res.render('pages/availability-test', {
    location: { businessName: 'Test Business' }
  });
});

// Test route for Square payment form
router.get("/square-test", function(req, res, next) {
  res.render("pages/square-test", {
    title: "Square Payment Test"
  });
});

/**
 * GET /
 *
 * Entry point for the app. Redirects directly to service selection.
 */
router.get("/", async (req, res, next) => {
  res.redirect("/services");
});

/**
 * GET /home
 *
 * Alternative route that also redirects to service selection.
 */
router.get("/home", async (req, res, next) => {
  res.redirect("/services");
});

module.exports = router;