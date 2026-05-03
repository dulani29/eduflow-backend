const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const Quiz = require('../models/Quiz');
const Certificate = require('../models/Certificate');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const User = require('../models/User');
const { sendCertificateEmail, sendAssignmentReminder } = require('../config/email');

// ==================== ASSIGNMENT CRUD ====================

// @desc    Create assignment
// @route   POST /api/v1/assessments/assignments
exports.createAssignment = async (req, res) => {
  try {
    const { courseId, title, description, type, year, questions, timeLimit, totalMarks } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const assignment = await Assignment.create({
      courseId,
      title,
      description,
      type,
      year,
      questions,
      timeLimit,
      totalMarks,
      subject: course.subject
    });

    res.status(201).json({ success: true, assignment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all assignments
// @route   GET /api/v1/assessments/assignments
exports.getAssignments = async (req, res) => {
  try {
    const { courseId, type, subject, year } = req.query;
    let query = { isPublished: true };

    if (courseId) query.courseId = courseId;
    if (type) query.type = type;
    if (subject) query.subject = subject;
    if (year) query.year = year;

    const assignments = await Assignment.find(query)
      .populate('courseId', 'title subject medium')
      .sort({ year: -1, createdAt: -1 });

    res.json({ success: true, assignments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single assignment
// @route   GET /api/v1/assessments/assignments/:id
exports.getAssignmentById = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate('courseId', 'title subject medium instructorId');

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    res.json({ success: true, assignment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update assignment
// @route   PUT /api/v1/assessments/assignments/:id
exports.updateAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    res.json({ success: true, assignment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete assignment
// @route   DELETE /api/v1/assessments/assignments/:id
exports.deleteAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findByIdAndDelete(req.params.id);

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    await Submission.deleteMany({ assignmentId: assignment._id });

    res.json({ success: true, message: 'Assignment deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== SUBMISSION CRUD ====================

// @desc    Submit assignment
// @route   POST /api/v1/assessments/submissions
exports.submitAssignment = async (req, res) => {
  try {
    const { assignmentId, content, answers, attachments } = req.body;

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    // Check if already submitted
    const existingSubmission = await Submission.findOne({
      assignmentId,
      studentId: req.user.id,
      status: 'submitted'
    });

    if (existingSubmission) {
      return res.status(400).json({ success: false, message: 'Already submitted' });
    }

    const submission = await Submission.create({
      assignmentId,
      studentId: req.user.id,
      content,
      answers,
      attachments,
      submittedAt: Date.now()
    });

    // Auto-grade if it's a quiz/MCQ assignment
    if (answers && answers.length > 0 && assignment.type === 'mcq_practice') {
      await submission.calculateScore();
      
      if (submission.percentage >= assignment.passingScore) {
        submission.status = 'graded';
      }
      await submission.save();
    }

    res.status(201).json({ success: true, submission });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get student's submissions
// @route   GET /api/v1/assessments/submissions/my
exports.getMySubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find({ studentId: req.user.id })
      .populate('assignmentId', 'title type subject year totalMarks')
      .sort({ submittedAt: -1 });

    res.json({ success: true, submissions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Grade submission (Instructor)
// @route   PUT /api/v1/assessments/submissions/:id/grade
exports.gradeSubmission = async (req, res) => {
  try {
    const { score, feedback } = req.body;

    const submission = await Submission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    submission.score = score;
    submission.percentage = (score / submission.assignment.totalMarks) * 100;
    submission.feedback = feedback;
    submission.gradedBy = req.user.id;
    submission.gradedAt = Date.now();
    submission.status = 'graded';

    await submission.save();

    res.json({ success: true, submission });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== QUIZ CRUD ====================

// @desc    Create quiz
// @route   POST /api/v1/assessments/quizzes
exports.createQuiz = async (req, res) => {
  try {
    const { courseId, title, description, questions, timeLimit, passingScore, examType, year } = req.body;

    const quiz = await Quiz.create({
      courseId,
      title,
      description,
      questions,
      timeLimit,
      passingScore,
      examType,
      year
    });

    res.status(201).json({ success: true, quiz });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all quizzes
// @route   GET /api/v1/assessments/quizzes
exports.getQuizzes = async (req, res) => {
  try {
    const { courseId, examType, subject, year } = req.query;
    let query = { isPublished: true };

    if (courseId) query.courseId = courseId;
    if (examType) query.examType = examType;
    if (subject) query.subject = subject;
    if (year) query.year = year;

    const quizzes = await Quiz.find(query)
      .populate('courseId', 'title subject medium')
      .sort({ year: -1, createdAt: -1 });

    res.json({ success: true, quizzes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single quiz
// @route   GET /api/v1/assessments/quizzes/:id
exports.getQuizById = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id)
      .populate('courseId', 'title subject medium');

    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    // Return shuffled questions if enabled
    const questions = quiz.shuffleQuestions ? quiz.getShuffledQuestions() : quiz.questions;

    res.json({
      success: true,
      quiz: { ...quiz.toObject(), questions }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Submit quiz
// @route   POST /api/v1/assessments/quizzes/:id/submit
exports.submitQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    const { answers, timeTaken } = req.body;

    // Grade the quiz
    const result = quiz.gradeSubmission(answers);

    // Save submission
    const submission = await Submission.create({
      assignmentId: quiz._id,
      studentId: req.user.id,
      answers: result.gradedAnswers,
      score: result.score,
      percentage: result.percentage,
      timeTaken,
      status: 'graded'
    });

    res.json({
      success: true,
      score: result.score,
      percentage: result.percentage,
      passed: result.passed,
      gradedAnswers: result.gradedAnswers,
      submissionId: submission._id
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== CERTIFICATE CRUD ====================

// @desc    Generate certificate
// @route   POST /api/v1/assessments/certificates/generate
exports.generateCertificate = async (req, res) => {
  try {
    const { courseId, percentage, grade } = req.body;

    const enrollment = await Enrollment.findOne({
      userId: req.user.id,
      courseId,
      status: 'completed'
    });

    if (!enrollment) {
      return res.status(400).json({
        success: false,
        message: 'Course not completed yet'
      });
    }

    const course = await Course.findById(courseId);
    const user = await User.findById(req.user.id);

    // Check if certificate already exists
    const existingCertificate = await Certificate.findOne({
      userId: req.user.id,
      courseId
    });

    if (existingCertificate) {
      return res.json({
        success: true,
        certificate: existingCertificate,
        message: 'Certificate already exists'
      });
    }

    const certificate = await Certificate.create({
      userId: req.user.id,
      courseId,
      studentName: user.name,
      courseTitle: course.title,
      subject: course.subject,
      medium: user.medium || 'sinhala',
      grade: grade || 'S',
      percentage: percentage || 85,
      metadata: {
        enrollmentId: enrollment._id,
        completionDate: enrollment.completedAt,
        finalScore: percentage
      }
    });

    // Generate PDF URL (placeholder - implement PDF generation)
    certificate.pdfUrl = `https://eduflow.com/certificates/${certificate.certificateNumber}.pdf`;
    await certificate.save();

    // Send email with certificate
    await sendCertificateEmail(user.email, user.name, course.title, certificate.pdfUrl);

    res.status(201).json({ success: true, certificate });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get user's certificates
// @route   GET /api/v1/assessments/certificates/my
exports.getMyCertificates = async (req, res) => {
  try {
    const certificates = await Certificate.find({
      userId: req.user.id,
      isRevoked: false
    }).populate('courseId', 'title subject');

    res.json({ success: true, certificates });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify certificate (public)
// @route   GET /api/v1/assessments/certificates/verify/:number
exports.verifyCertificate = async (req, res) => {
  try {
    const certificate = await Certificate.findOne({
      certificateNumber: req.params.number,
      isRevoked: false
    }).populate('userId', 'name');

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found or revoked'
      });
    }

    res.json({
      success: true,
      certificate: {
        studentName: certificate.studentName,
        courseTitle: certificate.courseTitle,
        subject: certificate.subject,
        issueDate: certificate.issueDate,
        grade: certificate.grade
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAssignmentSubmissions = async (req, res) => { res.status(501).json({ message: "Not implemented yet" }); };
exports.updateQuiz = async (req, res) => { res.status(501).json({ message: "Not implemented yet" }); };
exports.deleteQuiz = async (req, res) => { res.status(501).json({ message: "Not implemented yet" }); };