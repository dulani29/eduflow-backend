const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  content: {
    type: String
  },
  type: {
    type: String,
    enum: ['video', 'pdf', 'article', 'quiz'],
    required: true
  },
  videoUrl: {
    type: String
  },
  pdfUrl: {
    type: String
  },
  duration: {
    type: Number,
    default: 0
  },
  order: {
    type: Number,
    default: 0
  },
  isPreview: {
    type: Boolean,
    default: false
  },
  isLocked: {
    type: Boolean,
    default: true
  },
  attachment: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Lesson', lessonSchema);