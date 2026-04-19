const mongoose = require('mongoose');

const rewardRequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rewardType: {
    type: String,
    enum: ['bot_rank'],
    default: 'bot_rank'
  },
  milestoneBots: {
    type: Number,
    required: true
  },
  rewardAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  adminNote: {
    type: String,
    default: ''
  },
  month: {
    type: Number,
    required: true // 1-12
  },
  year: {
    type: Number,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('RewardRequest', rewardRequestSchema);
