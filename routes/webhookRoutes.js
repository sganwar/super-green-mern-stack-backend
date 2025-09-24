const express = require('express');
const { handleWebhook } = require('../controllers/webhookContoller');
const verifyWebhook = require('../middlewares/verifyWebhook');
const router = express.Router();

// @desc    Razorpay Webhook Endpoint
// @route   POST /api/webhook
// @access  Public (Razorpay will call this endpoint)
router.post('/', verifyWebhook, handleWebhook);

module.exports = router;