const mongoose = require('mongoose');

const licenseSchema = new mongoose.Schema(
  {
    consumerName: { type: String, required: true, trim: true, maxlength: 120 },
    keyHash: { type: String, required: true, unique: true, index: true },
    keyPreview: { type: String, required: true, maxlength: 32 },
    isActive: { type: Boolean, default: true, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('License', licenseSchema);
