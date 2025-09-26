const express = require('express');
const { getCouponByPaymentId, assignCouponInstant } = require('../controllers/couponController');
const router = express.Router();

// @desc    Get coupon by Razorpay payment ID (only works if webhook prevously assigned incoming payment id to data base with free coupons)
// @route   GET /api/coupon/:paymentId
// @access  Public
router.get('/:paymentId', getCouponByPaymentId);

// Assign coupon immediately if not yet reserved by webhook
// @desc    Instantly verify payment and assign a coupon
// @route   GET /api/coupon/instant/:paymentId
// @access  Public (called after successful Razorpay payment)
router.get('/instant/:paymentId', assignCouponInstant);

module.exports = router;