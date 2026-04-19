const User = require('../models/User');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const Settings = require('../models/Settings');
const RewardRequest = require('../models/RewardRequest');

/**
 * getMonthlyBotSales
 * Counts unique direct referrals who purchased a bot THIS month.
 */
const getMonthlyBotSales = async (userId) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const directReferrals = await User.find({ referredBy: userId }).select('_id');
  const referralIds = directReferrals.map(r => r._id);

  if (referralIds.length === 0) return 0;

  const botOrders = await Order.find({
    buyer: { $in: referralIds },
    productCategory: 'bot',
    status: 'completed',
    createdAt: { $gte: startOfMonth, $lte: endOfMonth }
  });

  // Count unique buyers
  const uniqueBuyers = new Set(botOrders.map(o => o.buyer.toString()));
  return uniqueBuyers.size;
};

/**
 * submitRewardRequest
 * Validates eligibility (sales + window) and creates a request.
 */
const submitRewardRequest = async (userId, milestoneBots) => {
  const now = new Date();
  const day = now.getDate();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  // "last 5 days of the month"
  if (day < lastDay - 4) {
    throw new Error(`Rewards can only be claimed in the last 5 days of the month (starting from day ${lastDay - 4}).`);
  }

  const settings = await Settings.getSettings();
  const milestone = settings.botRankRewards.find(r => r.bots === milestoneBots);
  
  if (!milestone) {
    throw new Error('Invalid reward milestone.');
  }

  const currentSales = await getMonthlyBotSales(userId);
  if (currentSales < milestoneBots) {
    throw new Error(`Requirement not met. You need ${milestoneBots} direct bot sales, but you have ${currentSales}.`);
  }

  // Check if already requested/received this month
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const existing = await RewardRequest.findOne({
    user: userId,
    milestoneBots,
    month,
    year
  });

  if (existing) {
    throw new Error('You have already submitted a request for this milestone this month.');
  }

  const request = await RewardRequest.create({
    user: userId,
    milestoneBots,
    rewardAmount: milestone.reward,
    month,
    year,
    status: 'pending'
  });

  return request;
};

/**
 * approveRewardRequest
 * Admin action to credit user and mark as approved.
 */
const approveRewardRequest = async (requestId, adminNote = '') => {
  const request = await RewardRequest.findById(requestId);
  if (!request) throw new Error('Request not found');
  if (request.status !== 'pending') throw new Error('Request is already processed');

  const user = await User.findById(request.user);
  if (!user) throw new Error('User not found');

  // Update status
  request.status = 'approved';
  request.adminNote = adminNote;
  await request.save();

  // Credit wallet
  await User.findByIdAndUpdate(user._id, {
    $inc: { walletBalance: request.rewardAmount, totalEarned: request.rewardAmount }
  });

  // Create transaction record
  await Transaction.create({
    user: user._id,
    type: 'rank_reward',
    amount: request.rewardAmount,
    currency: 'USD',
    description: `Bot Rank Reward (${request.milestoneBots} bots) - Approved`,
    status: 'completed'
  });

  return request;
};

module.exports = { getMonthlyBotSales, submitRewardRequest, approveRewardRequest };
