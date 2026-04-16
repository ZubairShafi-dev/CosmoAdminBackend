const User = require('../models/User');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const WithdrawalRequest = require('../models/WithdrawalRequest');
const { runMonthlyRankRewards } = require('../services/RankRewardService');

// ─── GET /api/admin/users ─────────────────────────────────────
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const filter = {};
    if (search) filter.$or = [
      { name:  { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];

    const users = await User.find(filter)
      .populate('referredBy', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await User.countDocuments(filter);
    res.json({ success: true, total, page: Number(page), data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/admin/dashboard ─────────────────────────────────
exports.getDashboard = async (req, res) => {
  try {
    const [totalUsers, totalOrders, revenueAgg, pendingWithdrawals] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Order.countDocuments({ status: 'completed' }),
      Order.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      WithdrawalRequest.countDocuments({ status: 'pending' }),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalOrders,
        totalRevenue: revenueAgg[0]?.total || 0,
        pendingWithdrawals,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/admin/withdrawals ───────────────────────────────
exports.getWithdrawals = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const withdrawals = await WithdrawalRequest.find(filter)
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: withdrawals.length, data: withdrawals });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PUT /api/admin/withdrawals/:id ──────────────────────────
exports.updateWithdrawal = async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const withdrawal = await WithdrawalRequest.findById(req.params.id).populate('user');

    if (!withdrawal) return res.status(404).json({ success: false, message: 'Withdrawal not found' });

    // If rejecting, refund the amount back to wallet
    if (status === 'rejected' && withdrawal.status === 'pending') {
      await User.findByIdAndUpdate(withdrawal.user._id, {
        $inc: { walletBalance: withdrawal.amount },
      });
    }

    withdrawal.status    = status;
    withdrawal.adminNote = adminNote || '';
    withdrawal.processedAt = new Date();
    await withdrawal.save();

    res.json({ success: true, data: withdrawal });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/admin/rank-rewards/run ────────────────────────
// Manual trigger for testing or override
exports.triggerRankRewards = async (req, res) => {
  try {
    const count = await runMonthlyRankRewards();
    res.json({ success: true, message: `Rank rewards distributed to ${count} users` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/admin/credit ───────────────────────────────────
// Manually credit a user's wallet
exports.manualCredit = async (req, res) => {
  try {
    const { userId, amount, description } = req.body;
    if (!userId || !amount) return res.status(400).json({ success: false, message: 'userId and amount required' });

    await User.findByIdAndUpdate(userId, {
      $inc: { walletBalance: amount, totalEarned: amount },
    });

    await Transaction.create({
      user: userId,
      type: 'deposit',
      amount,
      description: description || 'Manual admin credit',
      status: 'completed',
    });

    res.json({ success: true, message: `$${amount} credited to user wallet` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
