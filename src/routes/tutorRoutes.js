const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  // Tutor Profile CRUD
  registerTutor,
  getTutorProfile,
  getPublicTutorProfile,
  updateTutorProfile,
  // Tutor Statistics
  getTutorStats,
  getTopTutors,
  searchTutors,
  // Payout CRUD
  getPayoutSummary,
  requestPayout,
  updatePayoutMethod,
  getPayoutHistory
} = require('../controllers/tutorController');

// ==================== TUTOR PROFILE ROUTES ====================

// Public routes (no auth required)
router.get('/top', getTopTutors);
router.get('/search', searchTutors);
router.get('/:id', getPublicTutorProfile);

// Protected routes - Tutor only
router.post('/register', protect, registerTutor);
router.get('/profile', protect, authorize('tutor', 'admin'), getTutorProfile);
router.put('/profile', protect, authorize('tutor', 'admin'), updateTutorProfile);

// ==================== TUTOR STATISTICS ====================

router.get('/stats', protect, authorize('tutor', 'admin'), getTutorStats);

// ==================== PAYOUT ROUTES ====================

router.get('/payouts/summary', protect, authorize('tutor', 'admin'), getPayoutSummary);
router.get('/payouts/history', protect, authorize('tutor', 'admin'), getPayoutHistory);
router.post('/payouts/request', protect, authorize('tutor', 'admin'), requestPayout);
router.put('/payout-method', protect, authorize('tutor', 'admin'), updatePayoutMethod);

module.exports = router;