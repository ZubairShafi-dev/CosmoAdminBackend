const User = require('../models/User');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');

/**
 * MONTHLY RANK REWARD TABLE
 * Based on the number of direct referrals who purchased a bot this month.
 *
 * Tier     | Condition (direct referrals × bot price)     | Reward
 * ---------|----------------------------------------------|---------
 * Starter  | 2 referrals × $50 bot                        | $120
 * Pro      | 2 referrals × $100 bot                       | $300
 * Growth   | 2 referrals × $150 bot                       | $600
 * Elite    | 2 referrals × $200 bot (+ previous tiers)    | $1,200
 * Master   | 2 referrals × $300 bot (+ all tiers)         | $2,000
 *
 * The system sums up the highest qualifying tier per user.
 */
const RANK_TIERS = [
  { name: 'Starter', minBotPrice: 50,  minReferrals: 2, reward: 120  },
  { name: 'Pro',     minBotPrice: 100, minReferrals: 2, reward: 300  },
  { name: 'Growth',  minBotPrice: 150, minReferrals: 2, reward: 600  },
  { name: 'Elite',   minBotPrice: 200, minReferrals: 2, reward: 1200 },
  { name: 'Master',  minBotPrice: 300, minReferrals: 2, reward: 2000 },
];

/**
 * runMonthlyRankRewards
 * Scans all users, counts their direct referrals' bot purchases this month,
 * determines the highest qualifying rank, and distributes rewards.
 *
 * Should be triggered by rankRewardCron.js on the 1st of each month.
 */
const runMonthlyRankRewards = async () => {
  console.log('🏆 [RankRewardService] Running monthly rank reward distribution...');

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1); // Previous month
  const endOfMonth   = new Date(now.getFullYear(), now.getMonth(), 1);

  // Get all users who have at least one direct referral
  const users = await User.find({ isActive: true });

  const rewardTransactions = [];

  for (const user of users) {
    // Find all direct referrals of this user
    const directReferrals = await User.find({ referredBy: user._id }).select('_id');
    const referralIds = directReferrals.map((r) => r._id);

    if (referralIds.length === 0) continue;

    // Get all bot orders from direct referrals in the previous month
    const botOrders = await Order.find({
      buyer:          { $in: referralIds },
      productCategory: 'bot',
      status:         'completed',
      createdAt:      { $gte: startOfMonth, $lt: endOfMonth },
    }).populate('product', 'price');

    if (botOrders.length === 0) continue;

    // Determine the highest qualifying rank tier
    let qualifiedReward = 0;
    let qualifiedTier   = null;

    for (const tier of RANK_TIERS) {
      // Count referrals who bought a bot at or above this tier's min price
      const qualifyingOrders = botOrders.filter(
        (o) => o.product && o.product.price >= tier.minBotPrice
      );

      // Group by buyer to count unique referrals at this price level
      const uniqueBuyers = new Set(qualifyingOrders.map((o) => o.buyer.toString()));

      if (uniqueBuyers.size >= tier.minReferrals) {
        qualifiedReward = tier.reward; // Keep the highest tier
        qualifiedTier   = tier.name;
      }
    }

    if (qualifiedReward > 0) {
      // Credit the user's wallet
      await User.findByIdAndUpdate(user._id, {
        $inc: { walletBalance: qualifiedReward, totalEarned: qualifiedReward },
      });

      rewardTransactions.push({
        user:        user._id,
        type:        'rank_reward',
        amount:      qualifiedReward,
        currency:    'USD',
        description: `Monthly ${qualifiedTier} rank reward for ${startOfMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
        status:      'completed',
      });

      console.log(`  ✅ ${user.name} → ${qualifiedTier} → $${qualifiedReward}`);
    }
  }

  if (rewardTransactions.length > 0) {
    await Transaction.insertMany(rewardTransactions);
  }

  console.log(`🏆 [RankRewardService] Done. ${rewardTransactions.length} rewards distributed.`);
  return rewardTransactions.length;
};

module.exports = { runMonthlyRankRewards };
