const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'viewer'],
      default: 'user',
    },

    // ─── Referral System ───────────────────────────────────────
    referralCode: {
      type: String,
      unique: true,
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // ─── Affiliate & VIP Status ────────────────────────────────
    vipLevel: {
      type: Number,
      enum: [0, 1, 2, 3], // 0: Standard, 1: VIP1, etc.
      default: 0,
    },
    bundleBuyersCount: {
      type: Number,
      default: 0, // Number of direct members who bought a full bundle
    },

    // ─── Eligibility Flags (for L2-L5 commission unlocking) ───
    hasPurchasedCourse: { type: Boolean, default: false },
    hasActiveSignalSub: { type: Boolean, default: false },  // sub >= $25
    hasPurchasedBot:    { type: Boolean, default: false },

    // ─── Wallet ────────────────────────────────────────────────
    walletBalance: { type: Number, default: 0 },           // available to withdraw
    totalEarned:   { type: Number, default: 0 },           // lifetime earnings

    // ─── Profile ───────────────────────────────────────────────
    phone:   { type: String, default: '' },
    country: { type: String, default: '' },
    avatar:  { type: String, default: '' },

    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    firebaseUid: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

// ─── Pre-save: Hash password & generate referral code ─────────
userSchema.pre('save', async function () {
  // Hash password only when modified
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }

  // Auto-generate referral code on first save
  if (!this.referralCode) {
    this.referralCode = crypto.randomBytes(4).toString('hex').toUpperCase();
  }
});

// ─── Instance method: Compare password ────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
