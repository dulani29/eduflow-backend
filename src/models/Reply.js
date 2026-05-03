const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  discussionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Discussion',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: {
    type: String,
    required: [true, 'Reply content is required'],
    trim: true,
  },
  isBestAnswer: {
    type: Boolean,
    default: false,
  },
  upvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  parentReplyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reply',
    default: null,
  },
  isEdited: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  editedAt: {
    type: Date,
  },
  attachments: [{
    name: String,
    url: String,
    type: String,
  }],
});

// Update discussion's reply count and last activity
replySchema.post('save', async function() {
  if (this.discussionId) {
    const Discussion = mongoose.model('Discussion');
    await Discussion.findByIdAndUpdate(this.discussionId, {
      $inc: { repliesCount: 1 },
      lastActivityAt: Date.now(),
    });
  }
});

replySchema.pre('remove', async function() {
  if (this.discussionId) {
    const Discussion = mongoose.model('Discussion');
    await Discussion.findByIdAndUpdate(this.discussionId, {
      $inc: { repliesCount: -1 },
    });
  }
});

module.exports = mongoose.model('Reply', replySchema);