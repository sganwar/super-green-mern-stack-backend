const Razorpay = require('razorpay');

// Validate that essential environment variables are set
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  throw new Error('❌ Razorpay API keys are missing. Please check your environment variables.');
}

// Create and configure the Razorpay instance
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,     
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Optional: Add a quick test to verify configuration on startup
console.log('✅ Razorpay Instance Configured for Key ID:', process.env.RAZORPAY_KEY_ID);

// module.exports = razorpayInstance;