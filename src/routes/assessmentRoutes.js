const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  // Assignment CRUD
  createAssignment,
  getAssignments,
  getAssignmentById,
  updateAssignment,
  deleteAssignment,
  // Submission CRUD
  submitAssignment,
  getMySubmissions,
  gradeSubmission,
  getAssignmentSubmissions,
  // Quiz CRUD
  createQuiz,
  getQuizzes,
  getQuizById,
  updateQuiz,
  deleteQuiz,
  submitQuiz,
  // Certificate CRUD
  generateCertificate,
  getMyCertificates,
  verifyCertificate
} = require('../controllers/assessmentController');

// ==================== ASSIGNMENT ROUTES ====================

// Public / Protected routes
router.get('/assignments', protect, getAssignments);
router.get('/assignments/:id', protect, getAssignmentById);

// Assignment CRUD (Tutor/Admin only)
router.post('/assignments', protect, authorize('tutor', 'admin'), createAssignment);
router.put('/assignments/:id', protect, authorize('tutor', 'admin'), updateAssignment);
router.delete('/assignments/:id', protect, authorize('tutor', 'admin'), deleteAssignment);

// ==================== SUBMISSION ROUTES ====================

// Student submissions
router.post('/submissions', protect, submitAssignment);
router.get('/submissions/my', protect, getMySubmissions);

// Instructor grading
router.get('/assignments/:id/submissions', protect, authorize('tutor', 'admin'), getAssignmentSubmissions);
router.put('/submissions/:id/grade', protect, authorize('tutor', 'admin'), gradeSubmission);

// ==================== QUIZ ROUTES ====================

// Student quiz routes
router.get('/quizzes', protect, getQuizzes);
router.get('/quizzes/:id', protect, getQuizById);
router.post('/quizzes/:id/submit', protect, submitQuiz);

// Quiz CRUD (Tutor/Admin only)
router.post('/quizzes', protect, authorize('tutor', 'admin'), createQuiz);
router.put('/quizzes/:id', protect, authorize('tutor', 'admin'), updateQuiz);
router.delete('/quizzes/:id', protect, authorize('tutor', 'admin'), deleteQuiz);

// ==================== CERTIFICATE ROUTES ====================

// Student certificates
router.get('/certificates/my', protect, getMyCertificates);
router.post('/certificates/generate', protect, generateCertificate);

// Public verification (no auth required)
router.get('/certificates/verify/:number', verifyCertificate);

module.exports = router;