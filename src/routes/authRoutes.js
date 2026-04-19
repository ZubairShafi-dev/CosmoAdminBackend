const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { register, login, getMe, updateMe, syncVerification } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

// Validation rules
const registerRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const loginRules = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

router.post('/register', registerRules, register);
router.post('/sync-verification', syncVerification);
router.post('/login',    loginRules,    login);
router.get('/me',        protect,       getMe);
router.put('/me',        protect,       updateMe);

module.exports = router;
