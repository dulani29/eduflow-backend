const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  // Course CRUD
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  publishCourse,
  getMyCourses,
  getEnrolledCourses,
  // Lesson CRUD
  addLesson,
  updateLesson,
  deleteLesson,
  reorderLessons,
  getLessons,
  // Enrollment
  enrollInCourse,
  checkEnrollment,
  unenrollCourse,
  updateLessonProgress
} = require('../controllers/courseController');

// ==================== COURSE ROUTES ====================

// Public routes
router.get('/', getCourses);
router.get('/search', getCourses);
router.get('/categories', getCourses);
router.get('/:id', getCourseById);

// Protected routes - Student
router.get('/enrolled/my', protect, getEnrolledCourses);
router.post('/:id/enroll', protect, enrollInCourse);
router.get('/:id/check-enrollment', protect, checkEnrollment);
router.delete('/:id/unenroll', protect, unenrollCourse);
router.post('/lessons/:id/complete', protect, updateLessonProgress);

// Protected routes - Instructor/Tutor (CRUD operations)
router.post('/', protect, authorize('tutor', 'admin'), createCourse);
router.get('/my-courses', protect, authorize('tutor', 'admin'), getMyCourses);
router.put('/:id', protect, authorize('tutor', 'admin'), updateCourse);
router.delete('/:id', protect, authorize('tutor', 'admin'), deleteCourse);
router.put('/:id/publish', protect, authorize('tutor', 'admin'), publishCourse);

// ==================== LESSON ROUTES ====================

router.get('/:id/lessons', protect, getLessons);
router.post('/:id/lessons', protect, authorize('tutor', 'admin'), addLesson);
router.put('/lessons/:id', protect, authorize('tutor', 'admin'), updateLesson);
router.delete('/lessons/:id', protect, authorize('tutor', 'admin'), deleteLesson);
router.put('/lessons/reorder', protect, authorize('tutor', 'admin'), reorderLessons);

module.exports = router;