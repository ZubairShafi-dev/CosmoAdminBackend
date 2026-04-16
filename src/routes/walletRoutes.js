const express = require('express');
const router = express.Router();
const { getBalance, getTransactions, requestWithdrawal, getWithdrawals } = require('../controllers/walletController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/balance',       protect, getBalance);
router.get('/transactions',  protect, getTransactions);
router.get('/withdrawals',   protect, getWithdrawals);
router.post('/withdraw',     protect, requestWithdrawal);

module.exports = router;
