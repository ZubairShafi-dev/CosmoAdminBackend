const User = require('../models/User');
const Transaction = require('../models/Transaction');
const WithdrawalRequest = require('../models/WithdrawalRequest');

// ─── GET /api/wallet/balance ──────────────────────────────────
exports.getBalance = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('walletBalance totalEarned');
    res.json({ success: true, data: { walletBalance: user.walletBalance, totalEarned: user.totalEarned } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/wallet/transactions ────────────────────────────
exports.getTransactions = async (req, res) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;
    const filter = { user: req.user._id };
    if (type) filter.type = type;

    const transactions = await Transaction.find(filter)
      .populate('order', 'amount productCategory')
      .populate('fromUser', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Transaction.countDocuments(filter);
    res.json({ success: true, total, page: Number(page), data: transactions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/wallet/withdraw ────────────────────────────────
exports.requestWithdrawal = async (req, res) => {
  try {
    const { amount, method, accountDetails } = req.body;

    const user = await User.findById(req.user._id);
    if (user.walletBalance < amount) {
      return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
    }
    if (amount < 10) {
      return res.status(400).json({ success: false, message: 'Minimum withdrawal is $10' });
    }

    // Deduct from wallet immediately (hold in review)
    await User.findByIdAndUpdate(req.user._id, { $inc: { walletBalance: -amount } });

    const withdrawal = await WithdrawalRequest.create({
      user: req.user._id,
      amount,
      method,
      accountDetails,
    });

    res.status(201).json({ success: true, message: 'Withdrawal request submitted', data: withdrawal });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/wallet/withdrawals ──────────────────────────────
exports.getWithdrawals = async (req, res) => {
  try {
    const withdrawals = await WithdrawalRequest.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: withdrawals });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
