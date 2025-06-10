const express = require("express");
const router = express.Router();
const { getCancellationPolicy, getPolicyTerms } = require("../util/cancellation-policy");

/**
 * GET /test-policy
 * Test endpoint to verify cancellation policy API integration
 */
router.get("/", async (req, res) => {
  try {
    console.log('Testing cancellation policy API integration...');
    
    // Fetch policy from Square API
    const cancellationPolicy = await getCancellationPolicy();
    const policyTerms = getPolicyTerms(cancellationPolicy);
    
    // Return JSON response for testing
    res.json({
      success: true,
      message: 'Cancellation policy successfully retrieved from Square API',
      policy: cancellationPolicy,
      terms: policyTerms,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error testing cancellation policy:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to retrieve cancellation policy from Square API',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
