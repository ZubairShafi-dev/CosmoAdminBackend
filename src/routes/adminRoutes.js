const express = require('express');
const router = express.Router();
const {
  getAllUsers, getDashboard, getWithdrawals, updateWithdrawal,
  triggerRankRewards, manualCredit,
} = require('../controllers/adminController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');

// All admin routes require JWT + admin role
router.use(protect, restrictTo('admin'));

router.get('/dashboard',             getDashboard);
router.get('/users',                 getAllUsers);
router.get('/withdrawals',           getWithdrawals);
router.put('/withdrawals/:id',       updateWithdrawal);
router.post('/rank-rewards/run',     triggerRankRewards);
router.post('/credit',               manualCredit);

module.exports = router;
