const User = require('../models/User');
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
const Settings = require('../models/Settings');
const Order = require('../models/Order');

/**
 * ELIGIBILITY for L2-L5:
 *  course  → parent must have hasPurchasedCourse === true
 *  social  → no condition (always pays)
 *  signal  → parent must have hasActiveSignalSub === true
 *  bot     → parent must have hasPurchasedBot === true
 */
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
 */
const distributeCommissions = async (order, product, buyer) => {
  const settings = await Settings.getSettings();
  const category = product.category;
  const baseRates = settings.commissions[category] || [0, 0, 0, 0, 0];
  const transactions = [];

  let currentUserId = buyer.referredBy; 
  let level = 1;

  while (currentUserId && level <= 5) {
    const affiliate = await User.findById(currentUserId);
    if (!affiliate) break;

    let rate = baseRates[level - 1];

    // ─── VIP Logic for Level 1 ───
    if (level === 1) {
      const vipIncome = settings.vipDirectIncome;
      if (affiliate.vipLevel === 1) rate = vipIncome.vip1;
      else if (affiliate.vipLevel === 2) rate = vipIncome.vip2;
      else if (affiliate.vipLevel === 3) rate = vipIncome.vip3;
      else rate = vipIncome.standard;
    }

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
 * Includes "Full Bundle" detection and auto-VIP upgrade for referrer.
 */
const updateBuyerEligibilityFlags = async (buyer, product, amount) => {
  const settings = await Settings.getSettings();
  const updates = {};
  let newlyCompletedBundle = false;

  if (product.category === 'course') {
    updates.hasPurchasedCourse = true;
    
    // Check if this purchase completes a "Full Bundle" for the buyer
    // A bundle = all courses in the same sub-category or specific flag
    // For now, we'll check if buyer owns all courses in this category
    const allCoursesInCategory = await Product.find({ category: 'course', isActive: true });
    
    // Get all completed orders for this user for courses
    const userCourseOrders = await Order.find({ 
      buyer: buyer._id, 
      productCategory: 'course', 
      status: 'completed' 
    }).populate('product');

    const ownedProductIds = new Set(userCourseOrders.map(o => o.product?._id.toString()));
    ownedProductIds.add(product._id.toString()); // include current

    const categoryProducts = allCoursesInCategory.map(p => p._id.toString());
    const hasAll = categoryProducts.every(id => ownedProductIds.has(id));

    if (hasAll) {
      newlyCompletedBundle = true;
    }
  }

  if (product.category === 'bot')     updates.hasPurchasedBot = true;
  if (product.category === 'signal' && amount >= (product.minSubAmountForLevels || 25)) {
    updates.hasActiveSignalSub = true;
  }

  if (Object.keys(updates).length > 0) {
    await User.findByIdAndUpdate(buyer._id, updates);
  }

  // If a bundle was completed, increment referrer's count and check for VIP upgrade
  if (newlyCompletedBundle && buyer.referredBy) {
    const referrer = await User.findById(buyer.referredBy);
    if (referrer) {
      const newCount = (referrer.bundleBuyersCount || 0) + 1;
      let newVipLevel = referrer.vipLevel;

      if (newCount >= settings.vipCriteria.vip3) newVipLevel = 3;
      else if (newCount >= settings.vipCriteria.vip2) newVipLevel = 2;
      else if (newCount >= settings.vipCriteria.vip1) newVipLevel = 1;

      await User.findByIdAndUpdate(referrer._id, {
        bundleBuyersCount: newCount,
        vipLevel: newVipLevel
      });
    }
  }
};

module.exports = { distributeCommissions, updateBuyerEligibilityFlags };
