const express = require('express');
const { getCouponByPaymentId } = require('../controllers/couponController');
const router = express.Router();

// @desc    Get coupon by Razorpay payment ID
// @route   GET /api/coupon/:paymentId
// @access  Public
router.get('/:paymentId', getCouponByPaymentId);

module.exports = router;