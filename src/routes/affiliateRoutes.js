const express = require('express');
const router = express.Router();
const { getTeam, getTree, getEarningsSummary, getReferralLink } = require('../controllers/affiliateController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/team',     protect, getTeam);
router.get('/tree',     protect, getTree);
router.get('/earnings', protect, getEarningsSummary);
router.get('/link',     protect, getReferralLink);

module.exports = router;
