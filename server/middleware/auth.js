const jwt = require('jsonwebtoken');
const { UnauthenticatedError } = require('../errors');
const User = require('../models/User');

const authenticateUser = async (req, res, next) => {
  try {
    // Check for authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please login.'
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      
      // Attach user to request object
      const user = await User.findById(payload.id).select('-password');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User associated with this token no longer exists'
        });
      }
      
      req.user = {
        userId: user._id,
        name: user.name,
        role: user.role,
        id: user._id // Add id for consistency
      };
      
      next();
    } catch (jwtError) {
      // Handle specific JWT errors
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Session expired. Please login again.'
        });
      } else {
        return res.status(401).json({
          success: false,
          message: 'Invalid authentication token. Please login again.'
        });
      }
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication system error'
    });
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource'
      });
    }
    next();
  };
};

module.exports = {
  authenticateUser,
  authorizeRoles
}; 