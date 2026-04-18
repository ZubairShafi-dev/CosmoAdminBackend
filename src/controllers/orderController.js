const Order = require('../models/Order');
const Product = require('../models/Product');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const { distributeCommissions, updateBuyerEligibilityFlags } = require('../services/AffiliateService');
const { startSalesBonusForOrder } = require('../services/SalesBonusService');

// ─── POST /api/orders ─────────────────────────────────────────
// Place a new order and immediately trigger commission distribution
exports.createOrder = async (req, res) => {
  try {
    const { productId, paymentReference } = req.body;
    const buyer = req.user;

    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, message: 'Product not found or inactive' });
    }

    // Create the order
    const order = await Order.create({
      buyer:           buyer._id,
      product:         product._id,
      amount:          product.price,
      currency:        product.currency || 'USD',
      productCategory: product.category,
      status:          'completed', // Assume payment verified externally for now
      paymentReference: paymentReference || '',
    });

    // ── 1. Update buyer's eligibility flags ──────────────────
    await updateBuyerEligibilityFlags(buyer, product, product.price);

    // ── 2. Distribute affiliate commissions (5-level tree) ───
    const populatedBuyer = await User.findById(buyer._id);
    await distributeCommissions(order, product, populatedBuyer);

    await Order.findByIdAndUpdate(order._id, { commissionsDistributed: true });

    // ── 3. Start 30-day sales bonus (courses only) ───────────
    if (product.category === 'course' && product.hasSalesBonus) {
      await startSalesBonusForOrder(order._id);
    }

    res.status(201).json({ success: true, message: 'Order placed successfully', data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/orders/my ───────────────────────────────────────
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ buyer: req.user._id })
      .populate('product', 'name category price thumbnail')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: orders.length, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/orders/:id ──────────────────────────────────────
exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('product buyer', 'name email category price');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // Allow owner or admin
    if (order.buyer._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/orders (Admin) ──────────────────────────────────
exports.getAllOrders = async (req, res) => {
  try {
    const { status, category, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status)   filter.status = status;
    if (category) filter.productCategory = category;

    const orders = await Order.find(filter)
      .populate('buyer', 'name email')
      .populate('product', 'name price')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Order.countDocuments(filter);
    res.json({ success: true, total, page: Number(page), data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PUT /api/orders/:id (Admin) ──────────────────────────────
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (status) order.status = status;
    if (notes !== undefined) order.notes = notes;

    await order.save();

    await AuditLog.create({
      adminId: req.user._id,
      action: 'UPDATE_ORDER_STATUS',
      details: `Changed order status to ${order.status}`,
      metadata: { orderId: order._id, newStatus: order.status }
    });

    res.json({ success: true, message: 'Order status updated', data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
