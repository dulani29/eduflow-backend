const Discussion = require('../models/Discussion');
const Reply = require('../models/Reply');
const Course = require('../models/Course');
const User = require('../models/User');

// @desc    Create discussion
// @route   POST /api/v1/discussions
exports.createDiscussion = async (req, res) => {
  try {
    const { courseId, title, content, category, tags } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const discussion = await Discussion.create({
      courseId,
      userId: req.user.id,
      title,
      content,
      category: category || 'general',
      tags: tags || []
    });

    res.status(201).json({ success: true, discussion });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all discussions
// @route   GET /api/v1/discussions
exports.getDiscussions = async (req, res) => {
  try {
    const { courseId, category, page = 1, limit = 20, search } = req.query;

    let query = {};
    if (courseId) query.courseId = courseId;
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    const discussions = await Discussion.find(query)
      .populate('userId', 'name profilePicture role')
      .populate('courseId', 'title subject')
      .sort({ isPinned: -1, lastActivityAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Discussion.countDocuments(query);

    res.json({
      success: true,
      discussions,
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

// @desc    Get single discussion with replies
// @route   GET /api/v1/discussions/:id
exports.getDiscussionById = async (req, res) => {
  try {
    const discussion = await Discussion.findById(req.params.id)
      .populate('userId', 'name profilePicture role')
      .populate('courseId', 'title subject')
      .populate('bestAnswerId');

    if (!discussion) {
      return res.status(404).json({ success: false, message: 'Discussion not found' });
    }

    // Increment view count
    discussion.viewsCount += 1;
    await discussion.save();

    const replies = await Reply.find({ discussionId: discussion._id })
      .populate('userId', 'name profilePicture role')
      .sort({ isBestAnswer: -1, upvotes: -1, createdAt: 1 });

    res.json({ success: true, discussion, replies });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update discussion
// @route   PUT /api/v1/discussions/:id
exports.updateDiscussion = async (req, res) => {
  try {
    let discussion = await Discussion.findById(req.params.id);

    if (!discussion) {
      return res.status(404).json({ success: false, message: 'Discussion not found' });
    }

    // Check ownership
    if (discussion.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    discussion = await Discussion.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    res.json({ success: true, discussion });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete discussion
// @route   DELETE /api/v1/discussions/:id
exports.deleteDiscussion = async (req, res) => {
  try {
    const discussion = await Discussion.findById(req.params.id);

    if (!discussion) {
      return res.status(404).json({ success: false, message: 'Discussion not found' });
    }

    // Check ownership
    if (discussion.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await Reply.deleteMany({ discussionId: discussion._id });
    await discussion.deleteOne();

    res.json({ success: true, message: 'Discussion deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Pin/Unpin discussion (Admin/Instructor only)
// @route   POST /api/v1/discussions/:id/pin
exports.pinDiscussion = async (req, res) => {
  try {
    const discussion = await Discussion.findById(req.params.id);

    if (!discussion) {
      return res.status(404).json({ success: false, message: 'Discussion not found' });
    }

    discussion.isPinned = !discussion.isPinned;
    await discussion.save();

    res.json({ success: true, isPinned: discussion.isPinned });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Close/Open discussion
// @route   POST /api/v1/discussions/:id/close
exports.closeDiscussion = async (req, res) => {
  try {
    const discussion = await Discussion.findById(req.params.id);

    if (!discussion) {
      return res.status(404).json({ success: false, message: 'Discussion not found' });
    }

    discussion.isClosed = !discussion.isClosed;
    await discussion.save();

    res.json({ success: true, isClosed: discussion.isClosed });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Upvote/Downvote discussion
// @route   POST /api/v1/discussions/:id/upvote
exports.upvoteDiscussion = async (req, res) => {
  try {
    const discussion = await Discussion.findById(req.params.id);

    if (!discussion) {
      return res.status(404).json({ success: false, message: 'Discussion not found' });
    }

    const hasUpvoted = discussion.upvotes.includes(req.user.id);

    if (hasUpvoted) {
      discussion.upvotes = discussion.upvotes.filter(
        id => id.toString() !== req.user.id
      );
    } else {
      discussion.upvotes.push(req.user.id);
    }

    await discussion.save();

    res.json({ success: true, upvotesCount: discussion.upvotes.length, hasUpvoted: !hasUpvoted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add reply to discussion
// @route   POST /api/v1/discussions/:id/replies
exports.addReply = async (req, res) => {
  try {
    const discussion = await Discussion.findById(req.params.id);

    if (!discussion) {
      return res.status(404).json({ success: false, message: 'Discussion not found' });
    }

    if (discussion.isClosed) {
      return res.status(400).json({ success: false, message: 'Discussion is closed' });
    }

    const reply = await Reply.create({
      discussionId: discussion._id,
      userId: req.user.id,
      content: req.body.content,
      parentReplyId: req.body.parentReplyId || null
    });

    await reply.populate('userId', 'name profilePicture role');

    res.status(201).json({ success: true, reply });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update reply
// @route   PUT /api/v1/replies/:id
exports.updateReply = async (req, res) => {
  try {
    let reply = await Reply.findById(req.params.id);

    if (!reply) {
      return res.status(404).json({ success: false, message: 'Reply not found' });
    }

    if (reply.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    reply.content = req.body.content;
    reply.isEdited = true;
    reply.editedAt = Date.now();
    await reply.save();

    res.json({ success: true, reply });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete reply
// @route   DELETE /api/v1/replies/:id
exports.deleteReply = async (req, res) => {
  try {
    const reply = await Reply.findById(req.params.id);

    if (!reply) {
      return res.status(404).json({ success: false, message: 'Reply not found' });
    }

    if (reply.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await reply.deleteOne();

    res.json({ success: true, message: 'Reply deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark reply as best answer
// @route   POST /api/v1/replies/:id/best-answer
exports.markBestAnswer = async (req, res) => {
  try {
    const reply = await Reply.findById(req.params.id);

    if (!reply) {
      return res.status(404).json({ success: false, message: 'Reply not found' });
    }

    const discussion = await Discussion.findById(reply.discussionId);

    if (!discussion) {
      return res.status(404).json({ success: false, message: 'Discussion not found' });
    }

    // Only discussion owner or instructor can mark best answer
    if (discussion.userId.toString() !== req.user.id && req.user.role !== 'tutor' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Remove previous best answer
    await Reply.updateMany(
      { discussionId: discussion._id, isBestAnswer: true },
      { isBestAnswer: false }
    );

    reply.isBestAnswer = true;
    await reply.save();

    discussion.bestAnswerId = reply._id;
    await discussion.save();

    res.json({ success: true, isBestAnswer: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Upvote reply
// @route   POST /api/v1/replies/:id/upvote
exports.upvoteReply = async (req, res) => {
  try {
    const reply = await Reply.findById(req.params.id);

    if (!reply) {
      return res.status(404).json({ success: false, message: 'Reply not found' });
    }

    const hasUpvoted = reply.upvotes.includes(req.user.id);

    if (hasUpvoted) {
      reply.upvotes = reply.upvotes.filter(id => id.toString() !== req.user.id);
    } else {
      reply.upvotes.push(req.user.id);
    }

    await reply.save();

    res.json({ success: true, upvotesCount: reply.upvotes.length, hasUpvoted: !hasUpvoted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get user's discussions
// @route   GET /api/v1/discussions/my/discussions
exports.getMyDiscussions = async (req, res) => {
  try {
    const discussions = await Discussion.find({ userId: req.user.id })
      .populate('courseId', 'title subject')
      .sort({ createdAt: -1 });

    res.json({ success: true, discussions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Search discussions
// @route   GET /api/v1/discussions/search
exports.searchDiscussions = async (req, res) => {
  try {
    const { q } = req.query;

    const discussions = await Discussion.find({
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { content: { $regex: q, $options: 'i' } },
        { tags: { $in: [new RegExp(q, 'i')] } }
      ]
    })
      .populate('userId', 'name profilePicture')
      .populate('courseId', 'title subject')
      .limit(50);

    res.json({ success: true, discussions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};