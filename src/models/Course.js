const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide course title'],
    trim: true
  },
  slug: {
    type: String,
    unique: true
  },
  subject: {
    type: String,
    required: true,
    enum: ['Mathematics', 'Science', 'English', 'History', 'Sinhala', 'Tamil', 'Buddhism', 'Geography', 'Civics', 'ICT', 'Commerce']
  },
  medium: {
    type: String,
    enum: ['sinhala', 'tamil', 'english'],
    required: true
  },
  grade: {
    type: String,
    enum: ['Grade 10', 'Grade 11'],
    default: 'Grade 11'
  },
  description: {
    type: String,
    required: true
  },
  instructorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  thumbnail: {
    type: String,
    default: ''
  },
  price: {
    type: Number,
    default: 0
  },
  isFree: {
    type: Boolean,
    default: true
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  enrollmentCount: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    default: 0
  },
  totalLessons: {
    type: Number,
    default: 0
  },
  whatYouWillLearn: [String],
  requirements: [String],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create slug before saving
courseSchema.pre('save', function(next) {
  this.slug = this.title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Course', courseSchema);