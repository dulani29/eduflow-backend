const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const Enrollment = require('../models/Enrollment');

// @desc    Create course
// @route   POST /api/v1/courses
exports.createCourse = async (req, res) => {
  try {
    const { title, subject, medium, description, whatYouWillLearn, requirements } = req.body;
    
    const course = await Course.create({
      title,
      subject,
      medium,
      description,
      instructorId: req.user.id,
      whatYouWillLearn,
      requirements,
      isPublished: false
    });
    
    res.status(201).json({ success: true, course });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all courses
// @route   GET /api/v1/courses
exports.getCourses = async (req, res) => {
  try {
    const { page = 1, limit = 10, subject, medium, search } = req.query;
    
    let query = { isPublished: true };
    if (subject) query.subject = subject;
    if (medium) query.medium = medium;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    const courses = await Course.find(query)
      .populate('instructorId', 'name')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });
    
    const total = await Course.countDocuments(query);
    
    res.json({
      success: true,
      courses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single course
// @route   GET /api/v1/courses/:id
exports.getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('instructorId', 'name profilePicture');
    
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    
    const lessons = await Lesson.find({ courseId: course._id }).sort('order');
    
    res.json({ success: true, course, lessons });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update course
// @route   PUT /api/v1/courses/:id
exports.updateCourse = async (req, res) => {
  try {
    let course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    
    if (course.instructorId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    
    course = await Course.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    
    res.json({ success: true, course });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete course
// @route   DELETE /api/v1/courses/:id
exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    
    if (course.instructorId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    
    await Lesson.deleteMany({ courseId: course._id });
    await course.deleteOne();
    
    res.json({ success: true, message: 'Course deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add lesson to course
// @route   POST /api/v1/courses/:id/lessons
exports.addLesson = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    
    const lessonCount = await Lesson.countDocuments({ courseId: course._id });
    
    const lesson = await Lesson.create({
      ...req.body,
      courseId: course._id,
      order: lessonCount + 1
    });
    
    await Course.findByIdAndUpdate(course._id, {
      $inc: { totalLessons: 1 }
    });
    
    res.status(201).json({ success: true, lesson });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.publishCourse = async (req, res) => { res.status(501).json({ message: "Not implemented yet" }); };
exports.getMyCourses = async (req, res) => { res.status(501).json({ message: "Not implemented yet" }); };
exports.getEnrolledCourses = async (req, res) => { res.status(501).json({ message: "Not implemented yet" }); };
exports.updateLesson = async (req, res) => { res.status(501).json({ message: "Not implemented yet" }); };
exports.deleteLesson = async (req, res) => { res.status(501).json({ message: "Not implemented yet" }); };
exports.reorderLessons = async (req, res) => { res.status(501).json({ message: "Not implemented yet" }); };
exports.getLessons = async (req, res) => { res.status(501).json({ message: "Not implemented yet" }); };
exports.enrollInCourse = async (req, res) => { res.status(501).json({ message: "Not implemented yet" }); };
exports.checkEnrollment = async (req, res) => { res.status(501).json({ message: "Not implemented yet" }); };
exports.unenrollCourse = async (req, res) => { res.status(501).json({ message: "Not implemented yet" }); };
exports.updateLessonProgress = async (req, res) => { res.status(501).json({ message: "Not implemented yet" }); };