const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['past_paper', 'model_paper', 'mcq_practice', 'essay'],
    required: true
  },
  year: {
    type: Number
  },
  subject: {
    type: String,
    required: true
  },
  questions: [{
    questionText: String,
    questionType: {
      type: String,
      enum: ['mcq', 'structured', 'essay', 'truefalse']
    },
    options: [String],
    correctAnswer: mongoose.Schema.Types.Mixed,
    marks: Number
  }],
  timeLimit: {
    type: Number,
    default: 150
  },
  totalMarks: {
    type: Number,
    default: 100
  },
  isPublished: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Assignment', assignmentSchema);