// Commission Verification Script
// Run: node test_commissions.js

const COMMISSION_RATES = {
  course: [30, 7, 3, 3, 2],
  social: [14, 1, 1, 1, 1],
  signal: [35, 5, 3, 1, 1],
  bot:    [25, 2, 1, 1, 1],
};

const isEligible = (affiliate, category, level) => {
  if (level === 1) return true;
  switch (category) {
    case 'course':  return affiliate.hasPurchasedCourse;
    case 'social':  return true;
    case 'signal':  return affiliate.hasActiveSignalSub;
    case 'bot':     return affiliate.hasPurchasedBot;
    default: return false;
  }
};

const simulate = (category, orderAmount, affiliates) => {
  console.log(`\n=== ${category.toUpperCase()} Sale — $${orderAmount} ===`);
  const rates = COMMISSION_RATES[category];
  let totalPaid = 0;

  affiliates.forEach((aff, i) => {
    const level = i + 1;
    const rate = rates[i];
    const eligible = isEligible(aff, category, level);
    const amount = eligible ? +((orderAmount * rate) / 100).toFixed(2) : 0;
    totalPaid += amount;
    const skip = !eligible ? ' ← SKIPPED (not eligible)' : '';
    console.log(`  L${level} [${aff.name}] ${rate}% → $${amount}${skip}`);
  });

  console.log(`  Total paid out: $${totalPaid.toFixed(2)} (${((totalPaid / orderAmount) * 100).toFixed(1)}% of sale)`);
};

// Test 1: Course — L3 parent has NOT purchased a course
simulate('course', 100, [
  { name: 'Alice (L1)', hasPurchasedCourse: true  },
  { name: 'Bob   (L2)', hasPurchasedCourse: true  },
  { name: 'Carol (L3)', hasPurchasedCourse: false }, // skipped
  { name: 'Dave  (L4)', hasPurchasedCourse: true  },
  { name: 'Eve   (L5)', hasPurchasedCourse: true  },
]);

// Test 2: Social — no conditions, all levels always paid
simulate('social', 50, [
  { name: 'Alice (L1)' },
  { name: 'Bob   (L2)' },
  { name: 'Carol (L3)' },
  { name: 'Dave  (L4)' },
  { name: 'Eve   (L5)' },
]);

// Test 3: Signal — L2+ only if sub >= $25
simulate('signal', 75, [
  { name: 'Alice (L1)', hasActiveSignalSub: true  },
  { name: 'Bob   (L2)', hasActiveSignalSub: false }, // skipped
  { name: 'Carol (L3)', hasActiveSignalSub: true  },
  { name: 'Dave  (L4)', hasActiveSignalSub: true  },
  { name: 'Eve   (L5)', hasActiveSignalSub: false }, // skipped
]);

// Test 4: Bot
simulate('bot', 200, [
  { name: 'Alice (L1)', hasPurchasedBot: true  },
  { name: 'Bob   (L2)', hasPurchasedBot: true  },
  { name: 'Carol (L3)', hasPurchasedBot: false }, // skipped
  { name: 'Dave  (L4)', hasPurchasedBot: true  },
  { name: 'Eve   (L5)', hasPurchasedBot: true  },
]);

console.log('\n✅ Simulation complete.');
