const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  // Progress Tracking
  getUserProgress,
  getCourseProgress,
  updateLessonProgress,
  getLearningTimeline,
  // Analytics Dashboard
  getStudentDashboard,
  getInstructorDashboard,
  getAdminDashboard,
  getEngagementMetrics,
  getDropoutRisk,
  // Report Generation
  generateProgressReport,
  exportData,
  // Learning Goals
  setLearningGoal,
  getGoals,
  updateGoalProgress,
  getGoalRecommendations
} = require('../controllers/analyticsController');

// ==================== PROGRESS TRACKING ====================

// Student progress routes
router.get('/progress/me', protect, getUserProgress);
router.get('/progress/course/:courseId', protect, getCourseProgress);
router.post('/progress/lesson/complete', protect, updateLessonProgress);
router.get('/progress/timeline', protect, getLearningTimeline);

// ==================== ANALYTICS DASHBOARD ====================

// Role-based dashboards
router.get('/student/dashboard', protect, getStudentDashboard);
router.get('/instructor/dashboard', protect, authorize('tutor', 'admin'), getInstructorDashboard);
router.get('/admin/dashboard', protect, authorize('admin'), getAdminDashboard);

// Engagement metrics
router.get('/engagement', protect, authorize('tutor', 'admin'), getEngagementMetrics);
router.get('/dropout-risk', protect, authorize('tutor', 'admin'), getDropoutRisk);

// ==================== REPORT GENERATION ====================

router.get('/reports/progress', protect, generateProgressReport);
router.get('/reports/export', protect, exportData);

// ==================== LEARNING GOALS ====================

router.get('/goals', protect, getGoals);
router.post('/goals', protect, setLearningGoal);
router.put('/goals/:id/progress', protect, updateGoalProgress);
router.get('/goals/recommendations', protect, getGoalRecommendations);

module.exports = router;