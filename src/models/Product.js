const mongoose = require('mongoose');

// Commission rate table per category per level
// Structure: { category: [L1%, L2%, L3%, L4%, L5%] }
const COMMISSION_RATES = {
  course:   [30, 7, 3, 3, 2],
  social:   [14, 1, 1, 1, 1],
  signal:   [35, 5, 3, 1, 1],
  bot:      [25, 2, 1, 1, 1],
};

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    description: { type: String, default: '' },
    category: {
      type: String,
      enum: ['course', 'social', 'signal', 'bot'],
      required: [true, 'Category is required'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: 0,
    },
    currency: { type: String, default: 'USD' },

    // For signals: the minimum subscription amount to unlock L2-L5
    minSubAmountForLevels: { type: Number, default: 25 },

    // For bots: model to track monthly rank rewards
    isBot: { type: Boolean, default: false },

    // Course-specific: 15% sales bonus distributed over 30 days
    hasSalesBonus: { type: Boolean, default: false },
    salesBonusPercent: { type: Number, default: 15 },
    salesBonusDays:    { type: Number, default: 30 },

    isActive: { type: Boolean, default: true },
    thumbnail: { type: String, default: '' },
  },
  {
    timestamps: true,
    // Attach the commission rate table as a static for use in services
    statics: {},
  }
);

// ─── Static: Get commission rates for a category ──────────────
productSchema.statics.getCommissionRates = function (category) {
  return COMMISSION_RATES[category] || [0, 0, 0, 0, 0];
};

module.exports = mongoose.model('Product', productSchema);
