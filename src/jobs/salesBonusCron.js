const cron = require('node-cron');
const { processDailySalesBonus } = require('../services/SalesBonusService');

/**
 * Runs every day at 00:05 AM server time.
 * Distributes the daily 0.5% course sales bonus installment to eligible users.
 */
cron.schedule('5 0 * * *', async () => {
  console.log('[CRON] ⏰ salesBonusCron triggered at', new Date().toISOString());
  try {
    await processDailySalesBonus();
  } catch (err) {
    console.error('[CRON] ❌ salesBonusCron error:', err.message);
  }
});

console.log('[CRON] ✅ salesBonusCron registered (daily @ 00:05)');
