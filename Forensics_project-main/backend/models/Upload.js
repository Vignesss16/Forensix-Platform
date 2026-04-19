const mongoose = require('mongoose');

const uploadSchema = new mongoose.Schema({
  caseId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Case', default: null },
  filename:   { type: String, required: true },
  parsedData: { type: mongoose.Schema.Types.Mixed }, // stores full UFDR JSON as-is
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Upload', uploadSchema);