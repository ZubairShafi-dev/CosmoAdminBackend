const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  action: {
    type: String, // e.g., 'MANUAL_CREDIT', 'CREATE_PRODUCT', 'UPDATE_ORDER'
    required: true,
  },
  details: {
    type: String, // Readable string e.g., "Credited Rs 500 to User X"
    required: true,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed, // Storing raw object data (e.g. orderId)
    default: {},
  },
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);
