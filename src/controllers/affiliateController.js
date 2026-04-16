const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Order = require('../models/Order');

// ─── GET /api/affiliate/team ──────────────────────────────────
// Returns the user's direct referrals (L1) with basic stats
exports.getTeam = async (req, res) => {
  try {
    const directReferrals = await User.find({ referredBy: req.user._id })
      .select('name email referralCode walletBalance totalEarned hasPurchasedCourse hasPurchasedBot hasActiveSignalSub createdAt')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: directReferrals.length, data: directReferrals });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/affiliate/tree ──────────────────────────────────
// Returns the full 5-level downline tree for the authenticated user
exports.getTree = async (req, res) => {
  try {
    const buildLevel = async (userId, depth) => {
      if (depth > 5) return [];
      const members = await User.find({ referredBy: userId })
        .select('name email referralCode createdAt hasPurchasedCourse hasPurchasedBot hasActiveSignalSub');
      const result = [];
      for (const member of members) {
        const children = await buildLevel(member._id, depth + 1);
        result.push({ ...member.toObject(), level: depth, children });
      }
      return result;
    };

    const tree = await buildLevel(req.user._id, 1);
    res.json({ success: true, data: tree });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/affiliate/earnings ─────────────────────────────
// Summary of commission earnings by level and type
exports.getEarningsSummary = async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user._id, type: 'commission' });

    const byLevel = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalCommissions = 0;

    for (const tx of transactions) {
      if (tx.affiliateLevel) {
        byLevel[tx.affiliateLevel] = (byLevel[tx.affiliateLevel] || 0) + tx.amount;
        totalCommissions += tx.amount;
      }
    }

    const salesBonus = await Transaction.aggregate([
      { $match: { user: req.user._id, type: 'sales_bonus' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const rankRewards = await Transaction.aggregate([
      { $match: { user: req.user._id, type: 'rank_reward' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    res.json({
      success: true,
      data: {
        commissionsByLevel: byLevel,
        totalCommissions,
        totalSalesBonus:  salesBonus[0]?.total || 0,
        totalRankRewards: rankRewards[0]?.total || 0,
        grandTotal: totalCommissions + (salesBonus[0]?.total || 0) + (rankRewards[0]?.total || 0),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/affiliate/link ──────────────────────────────────
exports.getReferralLink = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('referralCode');
    const frontendUrl = process.env.FRONTEND_URL || 'https://cosmoorbit.com';
    res.json({
      success: true,
      data: {
        referralCode: user.referralCode,
        referralLink: `${frontendUrl}/register?ref=${user.referralCode}`,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
