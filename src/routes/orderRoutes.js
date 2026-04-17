const express = require('express');
const router = express.Router();
const { createOrder, getMyOrders, getOrder, getAllOrders, updateOrderStatus } = require('../controllers/orderController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');

router.post('/',         protect, createOrder);
router.get('/my',        protect, getMyOrders);
router.get('/:id',       protect, getOrder);
router.get('/',          protect, restrictTo('admin'), getAllOrders);
router.put('/:id',       protect, restrictTo('admin'), updateOrderStatus);

module.exports = router;
