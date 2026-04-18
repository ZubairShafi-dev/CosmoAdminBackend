const Product = require('../models/Product');
const AuditLog = require('../models/AuditLog');

// ─── GET /api/products ────────────────────────────────────────
exports.getAllProducts = async (req, res) => {
  try {
    const { category, active } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (active !== undefined) filter.isActive = active === 'true';

    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: products.length, data: products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/products/:id ────────────────────────────────────
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/products (Admin) ───────────────────────────────
exports.createProduct = async (req, res) => {
  try {
    const product = await Product.create(req.body);
    
    await AuditLog.create({
      adminId: req.user._id,
      action: 'CREATE_PRODUCT',
      details: `Created new ${product.category}: ${product.name}`,
      metadata: { productId: product._id }
    });

    res.status(201).json({ success: true, data: product });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─── PUT /api/products/:id (Admin) ────────────────────────────
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    await AuditLog.create({
      adminId: req.user._id,
      action: 'UPDATE_PRODUCT',
      details: `Updated ${product.category}: ${product.name}`,
      metadata: { productId: product._id }
    });

    res.json({ success: true, data: product });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─── DELETE /api/products/:id (Admin) ─────────────────────────
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    await AuditLog.create({
      adminId: req.user._id,
      action: 'DELETE_PRODUCT',
      details: `Deleted ${product.category}: ${product.name}`,
      metadata: { productId: product._id }
    });

    res.json({ success: true, message: 'Product removed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
