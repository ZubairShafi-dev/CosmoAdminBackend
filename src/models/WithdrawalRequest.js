const mongoose = require('mongoose');

const withdrawalRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [10, 'Minimum withdrawal is $10'],
    },
    currency: { type: String, default: 'USD' },
    method: {
      type: String,
      enum: ['bank_transfer', 'crypto', 'easypaisa', 'jazzcash'],
      required: true,
    },
    accountDetails: {
      type: String,
      required: [true, 'Account/wallet details are required'],
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'paid'],
      default: 'pending',
    },
    adminNote: { type: String, default: '' },
    processedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WithdrawalRequest', withdrawalRequestSchema);
