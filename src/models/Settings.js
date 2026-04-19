const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  usdToPkr: { type: Number, default: 290 },
  
  // Commission Percentages (Level 1 to 5)
  commissions: {
    course: { type: [Number], default: [35, 5, 2, 2, 1] },
    social: { type: [Number], default: [20, 1, 1, 1, 1] },
    signal: { type: [Number], default: [35, 5, 2, 2, 1] },
    bot:    { type: [Number], default: [35, 5, 3, 2, 1] },
  },

  // VIP Direct Income Levels
  vipDirectIncome: {
    standard: { type: Number, default: 35 },
    vip1:     { type: Number, default: 40 },
    vip2:     { type: Number, default: 45 },
    vip3:     { type: Number, default: 50 },
  },

  // VIP Criteria (How many direct bundle members)
  vipCriteria: {
    vip1: { type: Number, default: 5 },
    vip2: { type: Number, default: 10 },
    vip3: { type: Number, default: 15 },
  },

  // Bot Rank Reward Milestones (Direct sales count -> Reward amount)
  botRankRewards: {
    type: [{
      bots: Number,
      reward: Number
    }],
    default: [
      { bots: 6,   reward: 100 },
      { bots: 15,  reward: 250 },
      { bots: 26,  reward: 500 },
      { bots: 50,  reward: 1000 },
      { bots: 100, reward: 2000 },
    ]
  },

  // Sales Bonus for Courses
  courseSalesBonus: {
    percent: { type: Number, default: 15 },
    days:    { type: Number, default: 30 },
    dailyPercent: { type: Number, default: 0.5 },
  }
}, { timestamps: true });

// We only ever want one settings document
settingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model('Settings', settingsSchema);
