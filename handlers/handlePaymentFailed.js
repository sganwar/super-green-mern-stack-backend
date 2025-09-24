const handlePaymentFailed = async (webhookData) => {
  try {
    const paymentId = webhookData.payload.payment.entity.id;
    console.log(`❌ Payment failed: ${paymentId}`);
  } catch (error) {
    console.error('Error in handlePaymentFailed:', error);
  }
};

module.exports = handlePaymentFailed;