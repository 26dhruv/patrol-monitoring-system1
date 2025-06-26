const User = require('../models/User');

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin, Manager)
exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password');

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private (Admin, Manager, or the User themselves)
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: `User not found with id of ${req.params.id}`
      });
    }

    // Check authorization for non-admin/manager users
    if (
      req.user.role !== 'admin' &&
      req.user.role !== 'manager' &&
      req.user.userId !== req.params.id
    ) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this user data'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin or the User themselves)
exports.updateUser = async (req, res, next) => {
  try {
    // Prevent password update through this route
    if (req.body.password) {
      delete req.body.password;
    }

    // Prevent role change except for admins
    if (req.body.role && req.user.role !== 'admin') {
      delete req.body.role;
    }

    // Check if user exists
    let user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: `User not found with id of ${req.params.id}`
      });
    }

    // Check authorization for non-admin users updating other users
    if (req.user.role !== 'admin' && req.user.userId !== req.params.id) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to update this user'
      });
    }

    user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).select('-password');

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin)
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: `User not found with id of ${req.params.id}`
      });
    }

    // Only admin can delete users
    if (req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to delete users'
      });
    }

    await user.remove();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get all officers (users with role 'officer')
// @route   GET /api/users/officers
// @access  Private (Admin, Manager)
exports.getOfficers = async (req, res, next) => {
  try {
    const officers = await User.find({ role: 'officer' }).select('-password');

    res.status(200).json({
      success: true,
      count: officers.length,
      data: officers
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Update user status (active, on-duty, off-duty, inactive)
// @route   PUT /api/users/:id/status
// @access  Private (Admin, Manager, or the User themselves)
exports.updateUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a status'
      });
    }

    // Validate status
    const validStatuses = ['active', 'on-duty', 'off-duty', 'inactive'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Check if user exists
    let user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: `User not found with id of ${req.params.id}`
      });
    }

    // Check authorization
    if (
      req.user.role !== 'admin' &&
      req.user.role !== 'manager' &&
      req.user.userId !== req.params.id
    ) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to update this user status'
      });
    }

    // Perform status update
    user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      {
        new: true,
        runValidators: true
      }
    ).select('-password');

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
}; 