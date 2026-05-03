const Tutor = require('../models/Tutor');
const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');

// ==================== TUTOR PROFILE CRUD ====================

// @desc    Create/Register as tutor
// @route   POST /api/v1/tutors/register
exports.registerTutor = async (req, res) => {
  try {
    const { bio, expertise, qualifications, hourlyRate, bankAccount, languages } = req.body;

    // Check if already a tutor
    const existingTutor = await Tutor.findOne({ userId: req.user.id });
    if (existingTutor) {
      return res.status(400).json({
        success: false,
        message: 'You are already registered as a tutor'
      });
    }

    const tutor = await Tutor.create({
      userId: req.user.id,
      bio,
      expertise,
      qualifications,
      hourlyRate,
      bankAccount,
      languages
    });

    // Update user role to tutor
    await User.findByIdAndUpdate(req.user.id, { role: 'tutor' });

    res.status(201).json({ success: true, tutor });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get tutor profile
// @route   GET /api/v1/tutors/profile
exports.getTutorProfile = async (req, res) => {
  try {
    const tutor = await Tutor.findOne({ userId: req.user.id })
      .populate('userId', 'name email profilePicture');

    if (!tutor) {
      return res.status(404).json({
        success: false,
        message: 'Tutor profile not found'
      });
    }

    res.json({ success: true, tutor });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get public tutor profile
// @route   GET /api/v1/tutors/:id
exports.getPublicTutorProfile = async (req, res) => {
  try {
    const tutor = await Tutor.findOne({ userId: req.params.id })
      .populate('userId', 'name email profilePicture');

    if (!tutor) {
      return res.status(404).json({
        success: false,
        message: 'Tutor not found'
      });
    }

    // Get tutor's courses
    const courses = await Course.find({
      instructorId: req.params.id,
      isPublished: true
    }).select('title subject thumbnail price enrollmentCount rating');

    res.json({
      success: true,
      tutor,
      courses,
      stats: {
        totalCourses: courses.length,
        totalStudents: tutor.totalStudents,
        rating: tutor.rating
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update tutor profile
// @route   PUT /api/v1/tutors/profile
exports.updateTutorProfile = async (req, res) => {
  try {
    const { bio, expertise, qualifications, hourlyRate, bankAccount, languages } = req.body;

    const tutor = await Tutor.findOneAndUpdate(
      { userId: req.user.id },
      { bio, expertise, qualifications, hourlyRate, bankAccount, languages },
      { new: true, runValidators: true }
    );

    if (!tutor) {
      return res.status(404).json({
        success: false,
        message: 'Tutor profile not found'
      });
    }

    res.json({ success: true, tutor });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== TUTOR STATISTICS ====================

// @desc    Get tutor dashboard stats
// @route   GET /api/v1/tutors/stats
exports.getTutorStats = async (req, res) => {
  try {
    // Get tutor's courses
    const courses = await Course.find({ instructorId: req.user.id });

    const courseIds = courses.map(c => c._id);

    // Get enrollments for tutor's courses
    const enrollments = await Enrollment.find({
      courseId: { $in: courseIds }
    });

    // Calculate statistics
    const totalStudents = enrollments.length;
    const completedStudents = enrollments.filter(e => e.status === 'completed').length;
    const averageProgress = enrollments.reduce((sum, e) => sum + e.progress, 0) / (enrollments.length || 1);

    // Calculate total revenue (假设每个学生的课程价格)
    const totalRevenue = courses.reduce((sum, c) => sum + (c.price * c.enrollmentCount), 0);

    // Recent activity
    const recentEnrollments = await Enrollment.find({
      courseId: { $in: courseIds }
    })
      .sort({ enrolledAt: -1 })
      .limit(10)
      .populate('userId', 'name')
      .populate('courseId', 'title');

    res.json({
      success: true,
      stats: {
        totalCourses: courses.length,
        totalStudents,
        completedStudents,
        averageProgress: Math.round(averageProgress),
        totalRevenue,
        pendingPayout: totalRevenue * 0.7, // 70% to tutor, 30% platform fee
        averageRating: courses.reduce((sum, c) => sum + c.rating, 0) / (courses.length || 1)
      },
      recentEnrollments
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get top tutors leaderboard
// @route   GET /api/v1/tutors/top
exports.getTopTutors = async (req, res) => {
  try {
    const tutors = await Tutor.find({ isVerified: true })
      .populate('userId', 'name profilePicture')
      .sort({ totalStudents: -1, rating: -1 })
      .limit(20);

    res.json({ success: true, tutors });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Search tutors by subject/expertise
// @route   GET /api/v1/tutors/search
exports.searchTutors = async (req, res) => {
  try {
    const { q, subject } = req.query;

    let query = { isVerified: true };

    if (subject) {
      query['expertise.subject'] = subject;
    }

    let tutors = await Tutor.find(query)
      .populate('userId', 'name profilePicture');

    if (q) {
      tutors = tutors.filter(t =>
        t.userId.name.toLowerCase().includes(q.toLowerCase()) ||
        t.expertise.some(e => e.subject.toLowerCase().includes(q.toLowerCase()))
      );
    }

    res.json({ success: true, tutors });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== PAYOUT CRUD ====================

// @desc    Get payout summary
// @route   GET /api/v1/tutors/payouts/summary
exports.getPayoutSummary = async (req, res) => {
  try {
    const tutor = await Tutor.findOne({ userId: req.user.id });

    if (!tutor) {
      return res.status(404).json({
        success: false,
        message: 'Tutor profile not found'
      });
    }

    // Calculate available balance
    const courses = await Course.find({ instructorId: req.user.id });
    const totalEarnings = courses.reduce((sum, c) => sum + (c.price * c.enrollmentCount * 0.7), 0);

    res.json({
      success: true,
      summary: {
        totalEarnings: tutor.totalEarnings,
        pendingPayout: tutor.pendingPayout,
        availableBalance: tutor.totalEarnings - tutor.pendingPayout,
        nextPayoutDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Request payout
// @route   POST /api/v1/tutors/payouts/request
exports.requestPayout = async (req, res) => {
  try {
    const { amount } = req.body;

    const tutor = await Tutor.findOne({ userId: req.user.id });

    if (!tutor) {
      return res.status(404).json({
        success: false,
        message: 'Tutor profile not found'
      });
    }

    const available = tutor.totalEarnings - tutor.pendingPayout;

    if (amount > available) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }

    if (amount < 1000) {
      return res.status(400).json({
        success: false,
        message: 'Minimum payout amount is Rs. 1,000'
      });
    }

    tutor.pendingPayout += amount;
    await tutor.save();

    // Create payout request record (would store in separate collection)
    // For now, just update the tutor record

    res.json({
      success: true,
      message: 'Payout request submitted successfully',
      pendingPayout: tutor.pendingPayout
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update payout method
// @route   PUT /api/v1/tutors/payout-method
exports.updatePayoutMethod = async (req, res) => {
  try {
    const { bankAccount } = req.body;

    const tutor = await Tutor.findOneAndUpdate(
      { userId: req.user.id },
      { bankAccount },
      { new: true }
    );

    if (!tutor) {
      return res.status(404).json({
        success: false,
        message: 'Tutor profile not found'
      });
    }

    res.json({ success: true, bankAccount: tutor.bankAccount });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPayoutHistory = async (req, res) => { res.status(501).json({ message: "Not implemented yet" }); };