const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'commission',       // Affiliate level commission earned
        'sales_bonus',      // Daily 0.5% course sales bonus
        'rank_reward',      // Monthly rank/bot bonus
        'withdrawal',       // Outgoing wallet withdrawal
        'deposit',          // Manual admin credit
      ],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: { type: String, default: 'USD' },

    // Reference to triggering order (if applicable)
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },

    // Who generated this commission (the buyer or source user)
    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // Affiliate level (1–5) for commission type
    affiliateLevel: { type: Number, default: null },

    description: { type: String, default: '' },

    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'completed',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transaction', transactionSchema);
