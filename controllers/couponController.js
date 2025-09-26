const Coupon = require("../models/Coupon");
const Sentry = require("@sentry/node");
const Razorpay = require("razorpay");
const mongoose = require("mongoose");
const connectDB = require("./../config/database.config");

// Create Razorpay client with secret keys (server side only)
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

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
        message:
          "Coupon not found for this payment. Please contact support if the payment was successful.",
      });
    }

    // 3. Success! Return the coupon code to the frontend.
    res.status(200).json({
      success: true,
      message: "Coupon issued successfully!",
      coupon: coupon.coupon_code,
    });
  } catch (error) {
    console.error("❌ Error in getCouponByPaymentId:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while retrieving coupon.",
    });
  }
};

// Assign coupon immediately if not yet reserved by webhook
// @desc    Instantly verify payment and assign a coupon
// @route   GET /api/coupon/instant/:paymentId
// @access  Public (called after successful Razorpay payment)
const assignCouponInstant = async (req, res) => {
  const { paymentId } = req.params;
  let session = null;
let payment;
  // ✅ 1. Verify payment with Razorpay
  try {
    payment = await razorpay.payments.fetch(paymentId);
    // gives error if paymentid not valid
  } catch (err) {
    console.error("❌ Razorpay fetch error:", err);
    return res.status(400).json({
      success: false,
      message: "Invalid or incomplete payment.",
    });
  }

  // continue only if fetch succeeded
  if (!payment || !["authorized", "captured"].includes(payment.status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid or incomplete payment.",
    });
  }

  try {
    // ✅ 2. Ensure DB connection (important for serverless environments)
    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }

    // ✅ 3. Check if a coupon is already linked to this payment
    const existing = await Coupon.findOne({ payment_id: paymentId }).lean();
    if (existing) {
      if (!existing.is_coupon_issued) {
        await Coupon.updateOne(
          { _id: existing._id },
          { $set: { is_coupon_issued: true } }
        );
      }
      return res.status(200).json({
        success: true,
        message: "Coupon already assigned.",
        coupon: existing.coupon_code,
      });
    }

    // ✅ 4. No coupon yet → reserve one atomically
    session = await mongoose.startSession();
    session.startTransaction();

    const reserved = await Coupon.findOneAndUpdate(
      { payment_id: null, is_coupon_issued: false },
      { $set: { payment_id: paymentId } },
      {
        new: true,
        session,
        sort: { _id: 1 }, // pick oldest available
      }
    );

    if (!reserved) {
      throw new Error(
        `Fill the Coupons. No available coupons while assigning to payment ${paymentId}`
      );
    }

    await session.commitTransaction();
    session.endSession();
    session = null;

    // ✅ 5. Mark coupon as issued
    await Coupon.updateOne(
      { _id: reserved._id },
      { $set: { is_coupon_issued: true } }
    );

    return res.status(200).json({
      success: true,
      message: "Coupon assigned instantly!",
      coupon: reserved.coupon_code,
    });
  } catch (err) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    Sentry.captureException(err);
    console.error("❌ assignCouponInstant error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to assign coupon. Please try again later.",
    });
  }
};
module.exports = { getCouponByPaymentId, assignCouponInstant };
