const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  // Notification CRUD
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  sendNotification,
  // Notification Preferences
  getPreferences,
  updatePreferences,
  // Engagement & Gamification
  sendStreakReminder,
  checkAchievements,
  getLeaderboard,
  getStudyStreak
} = require('../controllers/notificationController');

// ==================== NOTIFICATION CRUD ====================

// User notification routes
router.get('/', protect, getNotifications);
router.get('/unread-count', protect, getUnreadCount);
router.put('/:id/read', protect, markAsRead);
router.put('/read-all', protect, markAllAsRead);
router.delete('/:id', protect, deleteNotification);

// Send notification (admin/tutor only)
router.post('/send', protect, authorize('tutor', 'admin'), sendNotification);

// ==================== NOTIFICATION PREFERENCES ====================

router.get('/preferences', protect, getPreferences);
router.put('/preferences', protect, updatePreferences);

// ==================== ENGAGEMENT & GAMIFICATION ====================

// Streak and achievements
router.post('/streak-reminder', protect, sendStreakReminder);
router.post('/check-achievements', protect, checkAchievements);
router.get('/streak', protect, getStudyStreak);

// Leaderboard
router.get('/leaderboard', protect, getLeaderboard);

// ==================== BROADCAST NOTIFICATIONS (Admin only) ====================

router.post('/broadcast', protect, authorize('admin'), async (req, res) => {
  try {
    const { title, body, type } = req.body;
    const User = require('../models/User');
    const Notification = require('../models/Notification');
    
    const users = await User.find({ isActive: true });
    
    const notifications = await Notification.insertMany(
      users.map(user => ({
        userId: user._id,
        type: type || 'system',
        title,
        body,
        createdAt: new Date()
      }))
    );
    
    res.json({ 
      success: true, 
      message: `Broadcast sent to ${notifications.length} users` 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;