const { Schema, model } = require('mongoose');

const RefreshTokenSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  revoked: { type: Boolean, default: false }
});

module.exports = model('RefreshToken', RefreshTokenSchema);
