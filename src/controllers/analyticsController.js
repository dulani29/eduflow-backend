const Progress = require('../models/Progress');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const User = require('../models/User');
const Submission = require('../models/Submission');

// ==================== PROGRESS TRACKING ====================

// @desc    Get user's overall progress
// @route   GET /api/v1/analytics/progress/me
exports.getUserProgress = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({
      userId: req.user.id,
      status: { $ne: 'not_started' }
    }).populate('courseId', 'title subject medium thumbnail');

    const totalProgress = enrollments.reduce((sum, e) => sum + e.progress, 0);
    const averageProgress = enrollments.length > 0 ? totalProgress / enrollments.length : 0;

    const completedCourses = enrollments.filter(e => e.status === 'completed').length;
    const inProgressCourses = enrollments.filter(e => e.status === 'in_progress').length;

    // Calculate total study time
    const totalTimeSpent = enrollments.reduce((sum, e) => sum + e.timeSpent, 0);

    // Identify weak subjects
    const weakSubjects = [];
    const strongSubjects = [];

    for (const enrollment of enrollments) {
      if (enrollment.progress < 40) {
        weakSubjects.push(enrollment.courseId.subject);
      } else if (enrollment.progress > 80) {
        strongSubjects.push(enrollment.courseId.subject);
      }
    }

    res.json({
      success: true,
      stats: {
        totalCoursesEnrolled: enrollments.length,
        completedCourses,
        inProgressCourses,
        averageProgress: Math.round(averageProgress),
        totalTimeSpent: Math.round(totalTimeSpent / 60), // in hours
        weakSubjects: [...new Set(weakSubjects)],
        strongSubjects: [...new Set(strongSubjects)]
      },
      enrollments
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get course progress for student
// @route   GET /api/v1/analytics/progress/course/:courseId
exports.getCourseProgress = async (req, res) => {
  try {
    const { courseId } = req.params;

    const enrollment = await Enrollment.findOne({
      userId: req.user.id,
      courseId
    }).populate('courseId', 'title subject totalLessons');

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Not enrolled in this course'
      });
    }

    // Get quiz scores for this course
    const submissions = await Submission.find({
      studentId: req.user.id
    }).populate('assignmentId');

    const courseSubmissions = submissions.filter(s =>
      s.assignmentId && s.assignmentId.courseId &&
      s.assignmentId.courseId.toString() === courseId
    );

    const averageQuizScore = courseSubmissions.length > 0
      ? courseSubmissions.reduce((sum, s) => sum + (s.percentage || 0), 0) / courseSubmissions.length
      : 0;

    // Calculate estimated completion date based on pace
    const daysSinceEnrollment = Math.max(1, (Date.now() - new Date(enrollment.enrolledAt)) / (1000 * 60 * 60 * 24));
    const progressPerDay = enrollment.progress / daysSinceEnrollment;
    const daysRemaining = progressPerDay > 0 ? (100 - enrollment.progress) / progressPerDay : 30;
    const estimatedCompletionDate = new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000);

    res.json({
      success: true,
      progress: {
        overall: enrollment.progress,
        completedLessons: enrollment.completedLessons.length,
        totalLessons: enrollment.courseId.totalLessons,
        timeSpent: enrollment.timeSpent,
        status: enrollment.status,
        enrolledAt: enrollment.enrolledAt,
        lastAccessedAt: enrollment.lastAccessedAt
      },
      quizStats: {
        averageScore: Math.round(averageQuizScore),
        totalSubmissions: courseSubmissions.length
      },
      predictions: {
        estimatedCompletionDate,
        daysRemaining: Math.ceil(daysRemaining)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update lesson progress
// @route   POST /api/v1/analytics/progress/lesson/complete
exports.updateLessonProgress = async (req, res) => {
  try {
    const { courseId, lessonId, timeSpent } = req.body;

    let enrollment = await Enrollment.findOne({
      userId: req.user.id,
      courseId
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Not enrolled in this course'
      });
    }

    // Add lesson if not already completed
    if (!enrollment.completedLessons.includes(lessonId)) {
      enrollment.completedLessons.push(lessonId);
    }

    // Update time spent
    enrollment.timeSpent += timeSpent;
    enrollment.lastAccessedAt = Date.now();

    // Recalculate progress
    await enrollment.updateProgress();

    res.json({
      success: true,
      progress: enrollment.progress,
      completedCount: enrollment.completedLessons.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== ANALYTICS DASHBOARD ====================

// @desc    Get student dashboard analytics
// @route   GET /api/v1/analytics/student/dashboard
exports.getStudentDashboard = async (req, res) => {
  try {
    // Get recent activity (last 7 days)
    const recentEnrollments = await Enrollment.find({
      userId: req.user.id,
      enrolledAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    }).populate('courseId', 'title thumbnail');

    // Get upcoming deadlines
    const submissions = await Submission.find({
      studentId: req.user.id,
      status: 'submitted'
    });

    // Calculate exam readiness score
    const enrollments = await Enrollment.find({ userId: req.user.id });
    const totalProgress = enrollments.reduce((sum, e) => sum + e.progress, 0);
    const examReadinessScore = enrollments.length > 0
      ? Math.round(totalProgress / enrollments.length)
      : 0;

    // Calculate study streak
    const lastAccessDates = enrollments.map(e => e.lastAccessedAt);
    const today = new Date().setHours(0, 0, 0, 0);
    let streak = 0;

    for (const date of lastAccessDates) {
      const accessDate = new Date(date).setHours(0, 0, 0, 0);
      if (accessDate === today) {
        streak++;
      }
    }

    res.json({
      success: true,
      dashboard: {
        examReadinessScore,
        streak,
        recentEnrollments,
        totalCourses: enrollments.length,
        completedCourses: enrollments.filter(e => e.status === 'completed').length,
        totalStudyTime: enrollments.reduce((sum, e) => sum + e.timeSpent, 0),
        pendingSubmissions: submissions.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get instructor dashboard
// @route   GET /api/v1/analytics/instructor/dashboard
exports.getInstructorDashboard = async (req, res) => {
  try {
    const courses = await Course.find({ instructorId: req.user.id });
    const courseIds = courses.map(c => c._id);

    // Get all enrollments for instructor's courses
    const enrollments = await Enrollment.find({
      courseId: { $in: courseIds }
    });

    // At-risk students (progress < 30% and not accessed in 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const atRiskStudents = enrollments.filter(e =>
      e.progress < 30 && e.lastAccessedAt < sevenDaysAgo
    ).length;

    // Top performing courses
    const coursePerformance = courses.map(course => ({
      title: course.title,
      enrollmentCount: course.enrollmentCount,
      averageProgress: enrollments
        .filter(e => e.courseId.toString() === course._id.toString())
        .reduce((sum, e) => sum + e.progress, 0) / (course.enrollmentCount || 1),
      rating: course.rating
    })).sort((a, b) => b.enrollmentCount - a.enrollmentCount);

    res.json({
      success: true,
      dashboard: {
        totalCourses: courses.length,
        totalStudents: enrollments.length,
        atRiskStudents,
        averageCompletionRate: enrollments.filter(e => e.status === 'completed').length / (enrollments.length || 1) * 100,
        topCourses: coursePerformance.slice(0, 5),
        totalRevenue: courses.reduce((sum, c) => sum + c.price * c.enrollmentCount, 0)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== REPORT GENERATION ====================

// @desc    Generate progress report
// @route   GET /api/v1/analytics/reports/progress
exports.generateProgressReport = async (req, res) => {
  try {
    const { courseId, format = 'json' } = req.query;

    const enrollments = await Enrollment.find({
      userId: req.user.id,
      ...(courseId && { courseId })
    }).populate('courseId', 'title subject medium');

    const reportData = {
      studentName: req.user.name,
      generatedAt: new Date(),
      courses: enrollments.map(e => ({
        title: e.courseId.title,
        subject: e.courseId.subject,
        progress: e.progress,
        status: e.status,
        timeSpent: e.timeSpent,
        enrolledAt: e.enrolledAt,
        completedAt: e.completedAt
      })),
      summary: {
        totalCourses: enrollments.length,
        averageProgress: enrollments.reduce((sum, e) => sum + e.progress, 0) / (enrollments.length || 1),
        totalTimeSpent: enrollments.reduce((sum, e) => sum + e.timeSpent, 0)
      }
    };

    res.json({ success: true, report: reportData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== LEARNING GOALS ====================

// @desc    Set learning goal
// @route   POST /api/v1/analytics/goals
exports.setLearningGoal = async (req, res) => {
  try {
    const { goalType, targetValue, courseId, deadline } = req.body;

    // Goal types: daily_time, weekly_lessons, course_completion
    const goal = {
      userId: req.user.id,
      goalType,
      targetValue,
      courseId: courseId || null,
      deadline: deadline || null,
      currentValue: 0,
      status: 'active',
      createdAt: new Date()
    };

    // Store goal (would be in a Goal model)
    // For now, store in user document or separate collection

    res.status(201).json({ success: true, goal });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getLearningTimeline = async (req, res) => { res.status(501).json({ message: "Not implemented yet" }); };
exports.getAdminDashboard = async (req, res) => { res.status(501).json({ message: "Not implemented yet" }); };
exports.getEngagementMetrics = async (req, res) => { res.status(501).json({ message: "Not implemented yet" }); };
exports.getDropoutRisk = async (req, res) => { res.status(501).json({ message: "Not implemented yet" }); };
exports.exportData = async (req, res) => { res.status(501).json({ message: "Not implemented yet" }); };
exports.getGoals = async (req, res) => { res.status(501).json({ message: "Not implemented yet" }); };
exports.updateGoalProgress = async (req, res) => { res.status(501).json({ message: "Not implemented yet" }); };
exports.getGoalRecommendations = async (req, res) => { res.status(501).json({ message: "Not implemented yet" }); };