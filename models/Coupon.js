// models/Coupon.js
const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  coupon_code: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  payment_id: {
    type: String,
    default: null,
    sparse: true,  
  },
  is_coupon_issued: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Coupon', couponSchema);