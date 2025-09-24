const Coupon = require('../models/Coupon');
const mongoose = require('mongoose');
const Sentry = require("@sentry/node");

// Assuming you have imported connectDB from its file
const connectDB = require('./../config/database.config');

const handlePaymentAuthorized = async (webhookData) => {
  // 1. Declare variables for `session` and `paymentId` outside the try block.
  // This ensures they are accessible in the `catch` and `finally` blocks,
  // even if an error occurs before they are assigned a value.
  let session = null;
  let paymentId;
  
  try {
    // 2. Critical: Ensure database connection is ready, especially in serverless environments.
    // If the state is not '1' (connected), it means we are in a cold start and need to connect.
    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }
    
    // 3. Start of protected transaction block.
    // The entire atomic operation, including session creation, must be inside `try`.
    session = await mongoose.startSession();
    session.startTransaction();

    const { payload } = webhookData;
    paymentId = payload.payment.entity.id;

    // 4. Find and update the coupon atomically.
    const assignedCoupon = await Coupon.findOneAndUpdate(
      { payment_id: null, is_coupon_issued: false }, 
      { $set: { payment_id: paymentId } },
      { 
        new: true,
        session: session,
        sort: { _id: 1 }
      }
    );

    if (!assignedCoupon) {
      // Throw an error if no coupon was found, which will be caught below.
      throw new Error(`CRITICAL: Payment ${paymentId} authorized, but no available coupons found.`);
    }

    console.log(`✅ Assigned coupon ${assignedCoupon.coupon_code} to payment ${paymentId}`);

    // 5. Commit the transaction to save changes.
    await session.commitTransaction();
    console.log('Transaction committed.');

  } catch (error) {
    // 6. If an error occurred after the session was created, abort the transaction.
    if (session) {
      await session.abortTransaction();
    }
    
    // 7. Manually send the error to Sentry for monitoring.
    Sentry.captureException(error); 

    // 8. Log specific errors for quick debugging.
    if (error.code === 11000) {
      console.warn(`⚠️  Race condition handled for payment ${paymentId}.`);
    } else {
      console.error('❌ Error in handlePaymentAuthorized:', error);
    }
    
    // 9. IMPORTANT: Re-throw the error so it can be handled by the calling function.
    // This allows your webhook controller to see that a failure occurred.
    throw error;
  } finally {
    // 10. Always end the session to free up resources, regardless of success or failure.
    if (session) {
      session.endSession();
    }
  }
};

module.exports = handlePaymentAuthorized;