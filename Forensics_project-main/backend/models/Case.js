const mongoose = require('mongoose');

const caseSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  status:      { type: String, enum: ['active', 'closed', 'archived'], default: 'active' },
  priority:    { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  assignedTo:  { type: String, default: '' },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  tags:        [String],
  notes:       [String],
}, { timestamps: true });

module.exports = mongoose.model('Case', caseSchema);