const cron = require('node-cron');
const { runMonthlyRankRewards } = require('../services/RankRewardService');

/**
 * Runs on the 1st of every month at 01:00 AM.
 * Calculates the previous month's direct bot sales per user
 * and distributes the appropriate rank reward.
 */
cron.schedule('0 1 1 * *', async () => {
  console.log('[CRON] 🏆 rankRewardCron triggered at', new Date().toISOString());
  try {
    await runMonthlyRankRewards();
  } catch (err) {
    console.error('[CRON] ❌ rankRewardCron error:', err.message);
  }
});

console.log('[CRON] ✅ rankRewardCron registered (1st of each month @ 01:00)');
