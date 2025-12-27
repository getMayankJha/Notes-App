const { Schema, model } = require('mongoose');

/*
  content: string — recommended to store Quill Delta JSON (stringified)
  sharedWith: [{ user: ObjectId, role: 'viewer'|'editor' }]
*/
const NoteSchema = new Schema({
  title: { type: String, default: 'Untitled' },
  content: { type: String, default: '' },
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  sharedWith: [
    {
      user: { type: Schema.Types.ObjectId, ref: 'User' },
      role: { type: String, enum: ['viewer', 'editor'], default: 'viewer' },
      invitedAt: { type: Date, default: Date.now }
    }
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  isDeleted: { type: Boolean, default: false }
});

NoteSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = model('Note', NoteSchema);
