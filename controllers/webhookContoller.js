const handlePaymentCaptured = require("../handlers/handlePaymentCaptured");
const handlePaymentFailed = require("../handlers/handlePaymentFailed");
const handleRefundCreated = require("../handlers/handleRefundCreated");
const handlePaymentAuthorized = require("../handlers/handlePaymentAuthorized");
const Sentry = require("@sentry/node");

const handleWebhook = async (req, res) => {
  // Always respond with 200 to acknowledge receipt, even for ignored events, to avoid retries and send response quickly to avoid timeouts
  res.status(200).json({ status: "ok" });

  try {
    const eventType = req.body.event;

    // Route the event to the appropriate handler
    if (eventType === "payment.authorized") {
      await handlePaymentAuthorized(req.body);
    } else if (eventType === "payment.captured") {
      // await handlePaymentCaptured(req.body);
    } else if (eventType === "payment.failed") {
      //   await handlePaymentFailed(req.body);
    } else if (eventType === "refund.created") {
      //   await handleRefundCreated(req.body);
    } else {
      console.log("🤷 Ignoring unrelated event:", eventType);
    }
  } catch (error) {
    console.error("❌ Internal server error in webhook controller", error);
    // mannually send error to sentry
    Sentry.captureException(error); 
  }
};

module.exports = { handleWebhook };
