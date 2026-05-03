const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
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
  certificateNumber: {
    type: String,
    unique: true,
    required: true,
  },
  studentName: {
    type: String,
    required: true,
  },
  courseTitle: {
    type: String,
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  medium: {
    type: String,
    enum: ['sinhala', 'tamil', 'english'],
    required: true,
  },
  grade: {
    type: String,
    enum: ['A', 'B', 'C', 'S', 'W'],
  },
  percentage: {
    type: Number,
  },
  issueDate: {
    type: Date,
    default: Date.now,
  },
  expiryDate: {
    type: Date,
  },
  verificationUrl: {
    type: String,
  },
  pdfUrl: {
    type: String,
  },
  isRevoked: {
    type: Boolean,
    default: false,
  },
  revokedAt: {
    type: Date,
  },
  revokedReason: {
    type: String,
  },
  metadata: {
    enrollmentId: mongoose.Schema.Types.ObjectId,
    completionDate: Date,
    finalScore: Number,
  },
});

// Generate unique certificate number before saving
certificateSchema.pre('save', async function(next) {
  if (!this.certificateNumber) {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.certificateNumber = `EDF-${year}-${random}`;
  }
  
  if (!this.verificationUrl) {
    this.verificationUrl = `https://eduflow.com/verify/${this.certificateNumber}`;
  }
  
  next();
});

// Method to generate certificate HTML for PDF
certificateSchema.methods.generateCertificateHTML = function() {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          margin: 0;
          padding: 40px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .certificate {
          background: white;
          border: 20px solid #4A90E2;
          border-radius: 20px;
          padding: 40px;
          text-align: center;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        h1 {
          color: #4A90E2;
          font-size: 48px;
          margin-bottom: 20px;
        }
        h2 {
          color: #333;
          font-size: 32px;
          margin: 30px 0;
        }
        .student-name {
          font-size: 36px;
          font-weight: bold;
          color: #764ba2;
          margin: 20px 0;
        }
        .course-title {
          font-size: 24px;
          color: #666;
          margin: 20px 0;
        }
        .date {
          margin-top: 40px;
          color: #999;
        }
        .certificate-number {
          margin-top: 30px;
          font-size: 12px;
          color: #ccc;
        }
        .seal {
          margin-top: 30px;
        }
      </style>
    </head>
    <body>
      <div class="certificate">
        <h1>CERTIFICATE OF ACHIEVEMENT</h1>
        <p>This certificate is proudly presented to</p>
        <div class="student-name">${this.studentName}</div>
        <p>for successfully completing</p>
        <div class="course-title">${this.courseTitle}</div>
        <p>with ${this.percentage || 'excellent'}% achievement</p>
        <p>Subject: ${this.subject} | Medium: ${this.medium.toUpperCase()} | Grade: ${this.grade || 'S'}</p>
        <div class="date">
          Issued on: ${new Date(this.issueDate).toLocaleDateString()}
        </div>
        <div class="certificate-number">
          Certificate No: ${this.certificateNumber}
        </div>
        <div class="seal">
          <img src="https://cdn-icons-png.flaticon.com/512/190/190411.png" width="80" height="80" alt="seal">
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = mongoose.model('Certificate', certificateSchema);