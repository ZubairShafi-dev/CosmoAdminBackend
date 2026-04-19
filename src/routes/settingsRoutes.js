const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const { protect, restrictTo } = require('../middlewares/authMiddleware');

// Get current settings (Public or protected? Admin needs to edit, user needs to view)
router.get('/', async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    res.status(200).json({ status: 'success', data: settings });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Update settings (Admin only)
router.put('/', protect, restrictTo('admin'), async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings(req.body);
    } else {
      Object.assign(settings, req.body);
    }
    await settings.save();
    res.status(200).json({ status: 'success', data: settings });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Reset to defaults
router.post('/reset', protect, restrictTo('admin'), async (req, res) => {
  try {
    await Settings.deleteMany({});
    const settings = await Settings.getSettings();
    res.status(200).json({ status: 'success', data: settings, message: 'Settings reset to defaults' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

module.exports = router;
