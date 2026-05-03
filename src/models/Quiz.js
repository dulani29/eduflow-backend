const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['mcq', 'truefalse', 'fillblank', 'matching', 'essay'],
    required: true,
  },
  options: [{
    type: String,
  }],
  correctAnswer: {
    type: mongoose.Schema.Types.Mixed,
    required: function() {
      return this.type !== 'essay';
    },
  },
  explanation: {
    type: String,
  },
  marks: {
    type: Number,
    default: 1,
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium',
  },
  subject: {
    type: String,
  },
  year: {
    type: Number,
  },
});

const quizSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
  },
  lessonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson',
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  questions: [questionSchema],
  timeLimit: {
    type: Number, // in minutes
    default: 60,
  },
  passingScore: {
    type: Number,
    default: 70,
  },
  maxAttempts: {
    type: Number,
    default: 3,
  },
  shuffleQuestions: {
    type: Boolean,
    default: false,
  },
  showAnswersAfterSubmit: {
    type: Boolean,
    default: true,
  },
  totalMarks: {
    type: Number,
    default: 0,
  },
  attemptCount: {
    type: Number,
    default: 0,
  },
  isPublished: {
    type: Boolean,
    default: true,
  },
  examType: {
    type: String,
    enum: ['past_paper', 'model_paper', 'mcq_practice', 'chapter_quiz'],
    default: 'mcq_practice',
  },
  year: {
    type: Number,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Calculate total marks before saving
quizSchema.pre('save', function(next) {
  let total = 0;
  this.questions.forEach(question => {
    total += question.marks || 0;
  });
  this.totalMarks = total;
  this.updatedAt = Date.now();
  next();
});

// Shuffle questions if enabled
quizSchema.methods.getShuffledQuestions = function() {
  if (!this.shuffleQuestions) {
    return this.questions;
  }
  
  const shuffled = [...this.questions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Auto-grade a quiz submission
quizSchema.methods.gradeSubmission = function(answers) {
  let totalScore = 0;
  const gradedAnswers = [];
  
  this.questions.forEach((question, index) => {
    const userAnswer = answers[index];
    let isCorrect = false;
    let marksObtained = 0;
    
    if (question.type === 'mcq' || question.type === 'truefalse') {
      isCorrect = userAnswer === question.correctAnswer;
      marksObtained = isCorrect ? question.marks : 0;
    } else if (question.type === 'fillblank') {
      // Case-insensitive comparison for fill blanks
      isCorrect = userAnswer?.toLowerCase().trim() === question.correctAnswer?.toLowerCase().trim();
      marksObtained = isCorrect ? question.marks : 0;
    } else if (question.type === 'essay') {
      // Essay questions need manual grading
      marksObtained = 0; // Set to 0, instructor will grade
      isCorrect = false;
    }
    
    totalScore += marksObtained;
    gradedAnswers.push({
      questionId: index,
      answer: userAnswer,
      isCorrect,
      marksObtained,
    });
  });
  
  const percentage = (totalScore / this.totalMarks) * 100;
  const passed = percentage >= this.passingScore;
  
  return {
    score: totalScore,
    percentage,
    passed,
    gradedAnswers,
  };
};

module.exports = mongoose.model('Quiz', quizSchema);