const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId:       { type: String, required: true, unique: true }, // e.g. OFF001, ADM001
  email:        { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role:         { type: String, enum: ['officer', 'admin'], default: 'officer' },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);