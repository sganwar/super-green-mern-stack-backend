const Coupon = require('../models/Coupon');
const mongoose = require('mongoose');

const handlePaymentAuthorized = async (webhookData) => {
  // Start a session for atomicity (optional but good practice)
  const session = await mongoose.startSession();
  session.startTransaction();

  let paymentId;
  try {
    const { payload } = webhookData;
    paymentId = payload.payment.entity.id;

    // 1. Find the oldest available coupon and assign the payment ID to it ATOMICALLY.
    const assignedCoupon = await Coupon.findOneAndUpdate(
      { payment_id: null, is_coupon_issued: false }, // Filter
      { $set: { payment_id: paymentId } },            // Update
      { 
        new: true,          // Return the updated document
        session: session,   // Do this as part of our transaction
        sort: { _id: 1 }    // 🔥 IMPORTANT: Get the oldest coupon first (FIFO)
      }
    );

    if (!assignedCoupon) {
      // CRITICAL: No coupons left! This requires an immediate alert.
      throw new Error(`CRITICAL: Payment ${paymentId} authorized, but no available coupons found.`);
    }

    console.log(`✅ Assigned coupon ${assignedCoupon.coupon_code} to payment ${paymentId}`);

    // 2. (Here you would update an Orders collection if you had one)
    // await Order.updateOne({ payment_id: paymentId }, { status: 'completed' }, { session });

    // 3. Commit the transaction
    await session.commitTransaction();
    console.log('Transaction committed.');

  } catch (error) {
    // Abort the transaction on any error
    await session.abortTransaction();

    // Check if the error is a duplicate key error (code 11000)
    // This means the race condition happened, but the database saved us!
    if (error.code === 11000) {
      console.warn(`⚠️  Race condition handled for payment ${paymentId}. This payment was already assigned a coupon by another process.`);
      // This is not a failure. The payment succeeded and a coupon was assigned.
    } else {
      // It's some other error (e.g., no coupons, network issue). Log it severely.
      console.error('❌ Error in handlePaymentAuthorized:', error);
      // Here you would send this error to a monitoring service like Sentry.
    }
  } finally {
    // End the session whether there was an error or not
    session.endSession();
  }
};

module.exports = handlePaymentAuthorized;