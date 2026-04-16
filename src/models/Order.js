const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: { type: String, default: 'USD' },
    status: {
      type: String,
      enum: ['pending', 'completed', 'refunded', 'cancelled'],
      default: 'pending',
    },

    // Snapshot of product category at time of purchase (for audit)
    productCategory: {
      type: String,
      enum: ['course', 'social', 'signal', 'bot'],
    },

    // Track whether affiliate commissions have been distributed
    commissionsDistributed: { type: Boolean, default: false },

    // Track whether the 15% course sales bonus cron has finished
    salesBonusDistributed:     { type: Boolean, default: false },
    salesBonusDaysCompleted:   { type: Number,  default: 0 },
    salesBonusStartedAt:       { type: Date,    default: null },

    paymentReference: { type: String, default: '' },
    notes:            { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
