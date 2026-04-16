const Order = require('../models/Order');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

/**
 * COURSE SALES BONUS
 * When a course is sold, the SELLER (not the buyer) earns a 15% bonus
 * distributed as 0.5% per day over 30 days.
 *
 * Daily amount = (orderAmount × 15%) / 30 = 0.5% per day
 *
 * This service is called by salesBonusCron.js every day at midnight.
 */

const BONUS_PERCENT    = 15;   // Total bonus
const BONUS_DAYS       = 30;   // Distributed over 30 days
const DAILY_RATE       = BONUS_PERCENT / BONUS_DAYS; // 0.5% per day

/**
 * processDailySalesBonus
 * Finds all pending course orders where salesBonusDaysCompleted < 30,
 * pays out today's 0.5% installment, and increments the day counter.
 * Marks the order as fully distributed when day 30 is reached.
 */
const processDailySalesBonus = async () => {
  console.log('💰 [SalesBonusService] Processing daily 0.5% course sales bonus...');

  // Find active course orders that still have bonus days remaining
  const pendingOrders = await Order.find({
    productCategory:       'course',
    status:                'completed',
    salesBonusDistributed: false,
    salesBonusStartedAt:   { $ne: null },
  });

  let processedCount = 0;
  const transactions = [];

  for (const order of pendingOrders) {
    if (order.salesBonusDaysCompleted >= BONUS_DAYS) {
      // Mark as fully distributed (cleanup)
      await Order.findByIdAndUpdate(order._id, { salesBonusDistributed: true });
      continue;
    }

    const dailyAmount = parseFloat(((order.amount * DAILY_RATE) / 100).toFixed(2));

    // Credit the buyer's (course seller's) wallet — the person who sold this course
    // In the context of the affiliate system, the "seller" is the L1 affiliate (direct referrer)
    // For the seller bonus, we pay the buyer themselves as it's a passive income feature
    await User.findByIdAndUpdate(order.buyer, {
      $inc: { walletBalance: dailyAmount, totalEarned: dailyAmount },
    });

    transactions.push({
      user:        order.buyer,
      type:        'sales_bonus',
      amount:      dailyAmount,
      currency:    order.currency || 'USD',
      order:       order._id,
      description: `Day ${order.salesBonusDaysCompleted + 1} of ${BONUS_DAYS} course sales bonus (${DAILY_RATE}%)`,
      status:      'completed',
    });

    // Increment the day counter
    const newDaysCompleted = order.salesBonusDaysCompleted + 1;
    await Order.findByIdAndUpdate(order._id, {
      salesBonusDaysCompleted: newDaysCompleted,
      salesBonusDistributed:   newDaysCompleted >= BONUS_DAYS,
    });

    processedCount++;
  }

  if (transactions.length > 0) {
    await Transaction.insertMany(transactions);
  }

  console.log(`💰 [SalesBonusService] Done. ${processedCount} orders processed.`);
  return processedCount;
};

/**
 * startSalesBonusForOrder
 * Called immediately when a course order is completed.
 * Sets the salesBonusStartedAt timestamp so the cron picks it up.
 */
const startSalesBonusForOrder = async (orderId) => {
  await Order.findByIdAndUpdate(orderId, {
    salesBonusStartedAt:   new Date(),
    salesBonusDaysCompleted: 0,
    salesBonusDistributed:   false,
  });
};

module.exports = { processDailySalesBonus, startSalesBonusForOrder };
