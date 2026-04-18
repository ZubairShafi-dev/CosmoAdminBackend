const User = require('../models/User');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const WithdrawalRequest = require('../models/WithdrawalRequest');
const AuditLog = require('../models/AuditLog');
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
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [totalUsers, totalOrders, revenueAgg, pendingWithdrawals, dailyRev, dailyUsers, recentLogs] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Order.countDocuments({ status: 'completed' }),
      Order.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      WithdrawalRequest.countDocuments({ status: 'pending' }),

      // 7-day revenue aggregation
      Order.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$amount' }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // 7-day user acquisition aggregation
      User.aggregate([
        { $match: { role: 'user', createdAt: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            users: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // Recent Activity (Using AuditLogs as a unified activity stream, grabbing last 10)
      AuditLog.find().populate('adminId', 'name email').sort({ createdAt: -1 }).limit(10)
    ]);

    // Format chart data (merge dailyRev and dailyUsers into one array mapping last 7 days)
    const chartData = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 0; i < 7; i++) {
       const date = new Date(sevenDaysAgo);
       date.setDate(sevenDaysAgo.getDate() + i);
       const dateString = date.toISOString().split('T')[0];
       const dayName = days[date.getDay()];
       
       const revData = dailyRev.find(d => d._id === dateString);
       const userData = dailyUsers.find(d => d._id === dateString);

       chartData.push({
         name: dayName,
         fullDate: dateString,
         revenue: revData ? revData.revenue : 0,
         users: userData ? userData.users : 0,
       });
    }

    res.json({
      success: true,
      data: {
        totalUsers,
        totalOrders,
        totalRevenue: revenueAgg[0]?.total || 0,
        pendingWithdrawals,
        chartData,
        recentActivity: recentLogs
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

    await AuditLog.create({
      adminId: req.user._id,
      action: 'UPDATE_WITHDRAWAL',
      details: `${status === 'approved' ? 'Approved' : 'Rejected'} withdrawal of Rs ${withdrawal.amount} for ${withdrawal.user.email}`,
      metadata: { withdrawalId: withdrawal._id, status }
    });

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

    await AuditLog.create({
      adminId: req.user._id,
      action: 'MANUAL_CREDIT',
      details: `Credited Rs ${amount} to user via manual top-up`,
      metadata: { userId, amount }
    });

    res.json({ success: true, message: `$${amount} credited to user wallet` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/admin/logs ─────────────────────────────────────
exports.getSystemLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const logs = await AuditLog.find()
      .populate('adminId', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await AuditLog.countDocuments();
    
    res.json({ success: true, total, page: Number(page), data: logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
