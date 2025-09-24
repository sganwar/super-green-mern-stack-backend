// middleware/verifyWebhook.js
const crypto = require('crypto');

const verifyWebhook = (req, res, next) => {
  try {
    // 1. Get the signature sent by Razorpay
    const razorpaySignature = req.headers['x-razorpay-signature'];

    // 2. Create a HMAC SHA256 hash using your webhook secret
    const expectedSignature = crypto
      .createHmac('sha256', process.env.WEBHOOK_SECRET)
      .update(JSON.stringify(req.body))
      .digest('hex');

    // 3. Compare the signatures securely (to prevent timing attacks), after checking equallength as it gives rangeerror
    if (razorpaySignature.length !== expectedSignature.length) {
      console.error('❌ Webhook verification failed: Signature length mismatch');
      return res.status(401).json({ error: 'Invalid signature' });
    }
    const isSignatureValid = crypto.timingSafeEqual(
      Buffer.from(razorpaySignature, 'utf8'),
      Buffer.from(expectedSignature, 'utf8')
    );

    // 4. If valid, proceed. If not, reject the request.
    if (isSignatureValid) {
      next(); // All good, go to the controller
    } else {
      console.error('❌ Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }
  } catch (error) {
    console.error('❌ Webhook verification error:', error);
     next(error); 
  }
};

module.exports = verifyWebhook;