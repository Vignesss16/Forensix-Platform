const mongoose = require('mongoose');

const savedSearchSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:      { type: String, required: true },
  criteria:  { type: mongoose.Schema.Types.Mixed }, // stores the search criteria object
}, { timestamps: true });

module.exports = mongoose.model('SavedSearch', savedSearchSchema);