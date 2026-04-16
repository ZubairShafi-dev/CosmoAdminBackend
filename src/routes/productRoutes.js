const express = require('express');
const router = express.Router();
const {
  getAllProducts, getProduct, createProduct, updateProduct, deleteProduct,
} = require('../controllers/productController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');

router.get('/',     getAllProducts);
router.get('/:id',  getProduct);
router.post('/',    protect, restrictTo('admin'), createProduct);
router.put('/:id',  protect, restrictTo('admin'), updateProduct);
router.delete('/:id', protect, restrictTo('admin'), deleteProduct);

module.exports = router;
