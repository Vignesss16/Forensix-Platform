const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userRef:  { type: String }, // stores the human-readable id like OFF001
  action:   { type: String, required: true }, // e.g. 'LOGIN', 'UPLOAD', 'CREATE_CASE'
  details:  { type: mongoose.Schema.Types.Mixed }, // any extra info
  ip:       { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);