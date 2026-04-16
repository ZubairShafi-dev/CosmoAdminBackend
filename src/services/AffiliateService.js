const User = require('../models/User');
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');

/**
 * COMMISSION RATES per category per level (L1 → L5)
 *  course:  [30, 7, 3, 3, 2]
 *  social:  [14, 1, 1, 1, 1]
 *  signal:  [35, 5, 3, 1, 1]
 *  bot:     [25, 2, 1, 1, 1]
 *
 * ELIGIBILITY for L2-L5:
 *  course  → parent must have hasPurchasedCourse === true
 *  social  → no condition (always pays)
 *  signal  → parent must have hasActiveSignalSub === true
 *  bot     → parent must have hasPurchasedBot === true
 */

const COMMISSION_RATES = {
  course: [30, 7, 3, 3, 2],
  social: [14, 1, 1, 1, 1],
  signal: [35, 5, 3, 1, 1],
  bot:    [25, 2, 1, 1, 1],
};

// ─── Check if a user is eligible for L2-L5 of a given category ──
const isEligibleForLevel = (user, category, level) => {
  if (level === 1) return true; // L1 always pays

  switch (category) {
    case 'course':  return user.hasPurchasedCourse === true;
    case 'social':  return true; // No condition
    case 'signal':  return user.hasActiveSignalSub === true;
    case 'bot':     return user.hasPurchasedBot === true;
    default:        return false;
  }
};

/**
 * distributeCommissions
 * Called after an order is marked "completed".
 *
 * @param {Object} order   - Populated Order document
 * @param {Object} product - Populated Product document
 * @param {Object} buyer   - User who placed the order
 */
const distributeCommissions = async (order, product, buyer) => {
  const category = product.category;
  const rates = COMMISSION_RATES[category] || [0, 0, 0, 0, 0];
  const transactions = [];

  let currentUserId = buyer.referredBy; // Start from the direct referrer (L1)
  let level = 1;

  while (currentUserId && level <= 5) {
    const affiliate = await User.findById(currentUserId);
    if (!affiliate) break;

    const rate = rates[level - 1]; // e.g. level 1 → index 0

    if (rate > 0 && isEligibleForLevel(affiliate, category, level)) {
      const commissionAmount = parseFloat(((order.amount * rate) / 100).toFixed(2));

      // Credit the affiliate's wallet
      await User.findByIdAndUpdate(affiliate._id, {
        $inc: { walletBalance: commissionAmount, totalEarned: commissionAmount },
      });

      // Record the transaction
      transactions.push({
        user:           affiliate._id,
        type:           'commission',
        amount:         commissionAmount,
        currency:       order.currency || 'USD',
        order:          order._id,
        fromUser:       buyer._id,
        affiliateLevel: level,
        description:    `L${level} commission (${rate}%) from ${category} sale by ${buyer.name}`,
        status:         'completed',
      });
    }

    // Move up the tree
    currentUserId = affiliate.referredBy;
    level++;
  }

  if (transactions.length > 0) {
    await Transaction.insertMany(transactions);
  }

  return transactions;
};

/**
 * updateBuyerEligibilityFlags
 * After a purchase, update the buyer's eligibility flags so their
 * upline can earn L2-L5 on future sales.
 *
 * @param {Object} buyer   - User document
 * @param {Object} product - Product document
 * @param {Number} amount  - Purchase amount
 */
const updateBuyerEligibilityFlags = async (buyer, product, amount) => {
  const updates = {};

  if (product.category === 'course')  updates.hasPurchasedCourse = true;
  if (product.category === 'bot')     updates.hasPurchasedBot = true;
  if (product.category === 'signal' && amount >= (product.minSubAmountForLevels || 25)) {
    updates.hasActiveSignalSub = true;
  }

  if (Object.keys(updates).length > 0) {
    await User.findByIdAndUpdate(buyer._id, updates);
  }
};

module.exports = { distributeCommissions, updateBuyerEligibilityFlags };
