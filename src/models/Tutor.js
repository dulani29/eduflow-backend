const mongoose = require('mongoose');

const tutorSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  bio: {
    type: String,
    maxlength: 1000
  },
  expertise: [{
    subject: String,
    experience: Number,
    qualification: String
  }],
  qualifications: [{
    degree: String,
    institution: String,
    year: Number
  }],
  hourlyRate: {
    type: Number,
    default: 500
  },
  totalStudents: {
    type: Number,
    default: 0
  },
  totalEarnings: {
    type: Number,
    default: 0
  },
  pendingPayout: {
    type: Number,
    default: 0
  },
  bankAccount: {
    accountName: String,
    accountNumber: String,
    bankName: String
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  rating: {
    type: Number,
    default: 0
  },
  languages: [String],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Tutor', tutorSchema);