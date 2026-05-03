const Notification = require('../models/Notification');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const Assignment = require('../models/Assignment');
const { sendAssignmentReminder, sendWeeklyProgressReport } = require('../config/email');

// ==================== NOTIFICATION CRUD ====================

// @desc    Get user's notifications
// @route   GET /api/v1/notifications
exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;

    let query = { userId: req.user.id };
    if (type) query.type = type;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const unreadCount = await Notification.countDocuments({
      userId: req.user.id,
      isRead: false
    });

    res.json({
      success: true,
      notifications,
      unreadCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: await Notification.countDocuments(query)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get unread count
// @route   GET /api/v1/notifications/unread-count
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      userId: req.user.id,
      isRead: false
    });

    res.json({ success: true, count });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/v1/notifications/:id/read
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    notification.isRead = true;
    notification.readAt = Date.now();
    await notification.save();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/v1/notifications/read-all
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, isRead: false },
      { isRead: true, readAt: Date.now() }
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete notification
// @route   DELETE /api/v1/notifications/:id
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    await notification.deleteOne();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create notification (internal use)
// @route   POST /api/v1/notifications/send
exports.sendNotification = async (req, res) => {
  try {
    const { userId, type, title, body, actionUrl, imageUrl } = req.body;

    const notification = await Notification.create({
      userId,
      type,
      title,
      body,
      actionUrl,
      imageUrl,
      createdAt: Date.now()
    });

    // If notification type is 'assignment', also send email
    if (type === 'assignment' && body.includes('due')) {
      const user = await User.findById(userId);
      const assignmentTitle = title.replace('Reminder: ', '');
      await sendAssignmentReminder(user.email, user.name, assignmentTitle, new Date());
    }

    res.status(201).json({ success: true, notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== AUTOMATED NOTIFICATIONS ====================

// @desc    Send assignment due reminders (to be called by cron job)
exports.sendAssignmentReminders = async () => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const assignments = await Assignment.find({
      dueDate: {
        $gte: tomorrow,
        $lt: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    for (const assignment of assignments) {
      const enrollments = await Enrollment.find({
        courseId: assignment.courseId,
        status: 'in_progress'
      }).populate('userId');

      for (const enrollment of enrollments) {
        // Check if already notified
        const existingNotif = await Notification.findOne({
          userId: enrollment.userId._id,
          type: 'assignment',
          title: { $regex: assignment.title, $options: 'i' }
        });

        if (!existingNotif) {
          await Notification.create({
            userId: enrollment.userId._id,
            type: 'assignment',
            title: `📝 Reminder: ${assignment.title} is due tomorrow!`,
            body: `Don't forget to complete "${assignment.title}" before the deadline.`,
            actionUrl: `/assignments/${assignment._id}`
          });
        }
      }
    }
  } catch (error) {
    console.error('Error sending assignment reminders:', error);
  }
};

// @desc    Send weekly study summary (to be called by cron job on Sunday)
exports.sendWeeklySummary = async () => {
  try {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const enrollments = await Enrollment.find({
      lastAccessedAt: { $gte: oneWeekAgo }
    }).populate('userId');

    const userStats = new Map();

    for (const enrollment of enrollments) {
      const userId = enrollment.userId._id.toString();
      if (!userStats.has(userId)) {
        userStats.set(userId, {
          name: enrollment.userId.name,
          email: enrollment.userId.email,
          subjectsStudied: new Set(),
          totalTime: 0,
          lessonsCompleted: 0
        });
      }

      const stats = userStats.get(userId);
      stats.subjectsStudied.add(enrollment.courseId?.subject);
      stats.totalTime += enrollment.timeSpent;
    }

    for (const [userId, stats] of userStats) {
      await sendWeeklyProgressReport(
        stats.email,
        stats.name,
        {
          subjectsStudied: stats.subjectsStudied.size,
          totalTime: stats.totalTime,
          lessonsCompleted: stats.lessonsCompleted
        }
      );
    }
  } catch (error) {
    console.error('Error sending weekly summary:', error);
  }
};

// @desc    Send study streak reminder
// @route   POST /api/v1/notifications/streak-reminder
exports.sendStreakReminder = async (req, res) => {
  try {
    const { userId } = req.body;

    const enrollments = await Enrollment.find({
      userId,
      lastAccessedAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    if (enrollments.length > 0) {
      const notification = await Notification.create({
        userId,
        type: 'reminder',
        title: '🔥 Do not break your streak!',
        body: 'You haven\'t studied today. Keep your learning streak alive!',
        actionUrl: '/home'
      });

      res.json({ success: true, notification });
    } else {
      res.json({ success: true, message: 'Streak is active' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== NOTIFICATION PREFERENCES ====================

// @desc    Get user's notification preferences
// @route   GET /api/v1/notifications/preferences
exports.getPreferences = async (req, res) => {
  try {
    // Get or create preferences
    let prefs = await NotificationPreference.findOne({ userId: req.user.id });

    if (!prefs) {
      prefs = await NotificationPreference.create({
        userId: req.user.id,
        email: { enabled: true, frequency: 'instant' },
        push: { enabled: true },
        inApp: { enabled: true },
        categories: {
          assignmentReminders: true,
          discussionReplies: true,
          grades: true,
          achievements: true,
          promotions: false
        }
      });
    }

    res.json({ success: true, preferences: prefs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update notification preferences
// @route   PUT /api/v1/notifications/preferences
exports.updatePreferences = async (req, res) => {
  try {
    const { email, push, inApp, categories } = req.body;

    const prefs = await NotificationPreference.findOneAndUpdate(
      { userId: req.user.id },
      { email, push, inApp, categories },
      { new: true, upsert: true }
    );

    res.json({ success: true, preferences: prefs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== GAMIFICATION ====================

// @desc    Check and award achievements
// @route   POST /api/v1/notifications/check-achievements
exports.checkAchievements = async (req, res) => {
  try {
    const achievements = [];
    const userId = req.user.id;

    // Get user stats
    const enrollments = await Enrollment.find({ userId });
    const totalStudyTime = enrollments.reduce((sum, e) => sum + e.timeSpent, 0);
    const completedCourses = enrollments.filter(e => e.status === 'completed').length;

    // Check for study streak (consecutive days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.setHours(0, 0, 0, 0);
    });

    let streak = 0;
    for (let i = 0; i < last7Days.length; i++) {
      const day = last7Days[i];
      const hasActivity = enrollments.some(e =>
        new Date(e.lastAccessedAt).setHours(0, 0, 0, 0) === day
      );
      if (hasActivity) streak++;
      else break;
    }

    // Award badges
    if (streak >= 7) {
      achievements.push('🔥 7-Day Streak Badge');
    }
    if (streak >= 30) {
      achievements.push('🏆 30-Day Legend Badge');
    }
    if (totalStudyTime >= 600) { // 10 hours
      achievements.push('📚 10 Hours Learning Badge');
    }
    if (completedCourses >= 1) {
      achievements.push('🎓 First Course Completion Badge');
    }
    if (completedCourses >= 5) {
      achievements.push('🌟 Master Learner Badge');
    }

    // Create notifications for new achievements
    for (const achievement of achievements) {
      await Notification.create({
        userId,
        type: 'achievement',
        title: '🏅 New Achievement Unlocked!',
        body: `Congratulations! You earned the ${achievement}.`,
        actionUrl: '/profile/achievements'
      });
    }

    res.json({
      success: true,
      achievements,
      streak,
      stats: {
        totalStudyTime,
        completedCourses,
        totalEnrollments: enrollments.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getLeaderboard = async (req, res) => { res.status(501).json({ message: "Not implemented yet" }); };
exports.getStudyStreak = async (req, res) => { res.status(501).json({ message: "Not implemented yet" }); };