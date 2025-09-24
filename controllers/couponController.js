const Coupon = require('../models/Coupon');

// @desc    Get and mark a coupon as issued based on Razorpay payment ID
// @route   GET /api/coupon/:paymentId
// @access  Public (called from frontend after payment success)
const getCouponByPaymentId = async (req, res) => {
  try {
    const { paymentId } = req.params;

    // 1. Find the coupon reserved for this payment ID and mark it as issued.
    const coupon = await Coupon.findOneAndUpdate(
      { payment_id: paymentId }, // Find the coupon for this payment
      { $set: { is_coupon_issued: true } }, // Mark it as issued
      { new: true } // Return the updated document
    );

    // 2. If no coupon is found, the payment ID is invalid or not yet processed by the webhook.
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found for this payment. Please contact support if the payment was successful."
      });
    }

    // 3. Success! Return the coupon code to the frontend.
    res.status(200).json({
      success: true,
      message: "Coupon issued successfully!",
      coupon: coupon.coupon_code
    });

  } catch (error) {
    console.error('❌ Error in getCouponByPaymentId:', error);
    res.status(500).json({
      success: false,
      message: "Internal server error while retrieving coupon."
    });
  }
};

module.exports = { getCouponByPaymentId };