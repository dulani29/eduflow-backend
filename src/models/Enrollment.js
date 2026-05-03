const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  completedLessons: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson',
  }],
  timeSpent: {
    type: Number, // in minutes
    default: 0,
  },
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed'],
    default: 'not_started',
  },
  enrolledAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: {
    type: Date,
  },
  lastAccessedAt: {
    type: Date,
    default: Date.now,
  },
  certificateIssued: {
    type: Boolean,
    default: false,
  },
  certificateUrl: {
    type: String,
  },
});

// Composite unique index to prevent duplicate enrollments
enrollmentSchema.index({ userId: 1, courseId: 1 }, { unique: true });

// Update progress automatically when lessons are completed
enrollmentSchema.methods.updateProgress = async function() {
  const Course = mongoose.model('Course');
  const course = await Course.findById(this.courseId);
  
  if (course && course.totalLessons > 0) {
    const newProgress = (this.completedLessons.length / course.totalLessons) * 100;
    this.progress = Math.round(newProgress);
    
    if (this.progress === 100 && this.status !== 'completed') {
      this.status = 'completed';
      this.completedAt = Date.now();
    } else if (this.progress > 0 && this.progress < 100) {
      this.status = 'in_progress';
    }
    
    await this.save();
  }
  
  return this.progress;
};

module.exports = mongoose.model('Enrollment', enrollmentSchema);