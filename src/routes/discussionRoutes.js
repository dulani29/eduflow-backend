const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  // Discussion CRUD
  createDiscussion,
  getDiscussions,
  getDiscussionById,
  updateDiscussion,
  deleteDiscussion,
  pinDiscussion,
  closeDiscussion,
  upvoteDiscussion,
  getMyDiscussions,
  searchDiscussions,
  // Reply CRUD
  addReply,
  updateReply,
  deleteReply,
  markBestAnswer,
  upvoteReply
} = require('../controllers/discussionController');

// ==================== DISCUSSION ROUTES ====================

// Public / Protected routes
router.get('/', protect, getDiscussions);
router.get('/search', protect, searchDiscussions);
router.get('/my/discussions', protect, getMyDiscussions);
router.get('/:id', protect, getDiscussionById);

// Discussion CRUD (Protected)
router.post('/', protect, createDiscussion);
router.put('/:id', protect, updateDiscussion);
router.delete('/:id', protect, deleteDiscussion);

// Discussion actions
router.post('/:id/pin', protect, authorize('tutor', 'admin'), pinDiscussion);
router.post('/:id/close', protect, closeDiscussion);
router.post('/:id/upvote', protect, upvoteDiscussion);

// ==================== REPLY ROUTES ====================

// Reply CRUD
router.post('/:id/replies', protect, addReply);
router.put('/replies/:id', protect, updateReply);
router.delete('/replies/:id', protect, deleteReply);

// Reply actions
router.post('/replies/:id/best-answer', protect, markBestAnswer);
router.post('/replies/:id/upvote', protect, upvoteReply);

module.exports = router;