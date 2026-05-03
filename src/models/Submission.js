const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  assignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
    required: true,
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: {
    type: String,
    trim: true,
  },
  attachments: [{
    name: String,
    url: String,
    type: String,
    size: Number,
  }],
  answers: [{
    questionId: {
      type: Number,
    },
    answer: mongoose.Schema.Types.Mixed,
    isCorrect: Boolean,
    marksObtained: Number,
  }],
  score: {
    type: Number,
    default: 0,
  },
  percentage: {
    type: Number,
    default: 0,
  },
  feedback: {
    type: String,
  },
  gradedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  gradedAt: {
    type: Date,
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'graded', 'returned'],
    default: 'submitted',
  },
  attemptNumber: {
    type: Number,
    default: 1,
  },
  isLate: {
    type: Boolean,
    default: false,
  },
  timeTaken: {
    type: Number, // in seconds
  },
});

// Calculate score based on answers
submissionSchema.methods.calculateScore = async function() {
  const Assignment = mongoose.model('Assignment');
  const assignment = await Assignment.findById(this.assignmentId);
  
  if (!assignment || !assignment.questions || assignment.questions.length === 0) {
    return 0;
  }
  
  let totalScore = 0;
  let maxScore = 0;
  
  this.answers.forEach(answer => {
    const question = assignment.questions[answer.questionId];
    if (question) {
      maxScore += question.marks || 0;
      if (answer.isCorrect) {
        totalScore += question.marks || 0;
      }
    }
  });
  
  this.score = totalScore;
  this.percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
  
  return this.percentage;
};

// Check if submission is late
submissionSchema.pre('save', async function(next) {
  const Assignment = mongoose.model('Assignment');
  const assignment = await Assignment.findById(this.assignmentId);
  
  if (assignment && assignment.dueDate) {
    this.isLate = new Date(this.submittedAt) > new Date(assignment.dueDate);
  }
  
  next();
});

module.exports = mongoose.model('Submission', submissionSchema);