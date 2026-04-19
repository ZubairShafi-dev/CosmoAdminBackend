const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middlewares/auth');
const { 
  getMonthlyBotSales, 
  submitRewardRequest, 
  approveRewardRequest 
} = require('../services/RankRewardService');
const RewardRequest = require('../models/RewardRequest');

// Get current month's sales for the logged-in user
router.get('/my-stats', protect, async (req, res) => {
  try {
    const sales = await getMonthlyBotSales(req.user._id);
    res.status(200).json({ status: 'success', data: { monthlyBotSales: sales } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Submit a reward request
router.post('/apply', protect, async (req, res) => {
  try {
    const { milestoneBots } = req.body;
    const request = await submitRewardRequest(req.user._id, milestoneBots);
    res.status(201).json({ status: 'success', data: request });
  } catch (err) {
    res.status(400).json({ status: 'error', message: err.message });
  }
});

// Admin: Get all reward requests
router.get('/admin/all', protect, restrictTo('admin'), async (req, res) => {
  try {
    const requests = await RewardRequest.find()
      .populate('user', 'name email')
      .sort('-createdAt');
    res.status(200).json({ status: 'success', data: requests });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Admin: Approve/Reject a request
router.post('/admin/process/:id', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { action, adminNote } = req.body; // action: 'approve' or 'reject'
    
    if (action === 'approve') {
      const request = await approveRewardRequest(req.params.id, adminNote);
      res.status(200).json({ status: 'success', data: request });
    } else {
      const request = await RewardRequest.findByIdAndUpdate(req.params.id, {
        status: 'rejected',
        adminNote
      }, { new: true });
      res.status(200).json({ status: 'success', data: request });
    }
  } catch (err) {
    res.status(400).json({ status: 'error', message: err.message });
  }
});

module.exports = router;
