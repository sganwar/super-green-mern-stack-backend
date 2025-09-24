const handlePaymentCaptured = async (webhookData) => {
  try {
    const { payload } = webhookData;
    let paymentId = payload.payment.entity.id;
    console.log(`✅ Payment Captured for PaymentId: ${paymentId}`);
  } catch (error) {
      console.error('❌ Error in handlePaymentCaptured:', error);
  }
};

module.exports = handlePaymentCaptured;