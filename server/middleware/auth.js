const jwt = require('jsonwebtoken');
const { UnauthenticatedError } = require('../errors');
const User = require('../models/User');

const authenticateUser = async (req, res, next) => {
  // Check for authorization header
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthenticatedError('Authentication invalid');
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach user to request object
    const user = await User.findById(payload.id).select('-password');
    
    if (!user) {
      throw new UnauthenticatedError('User not found');
    }
    
    req.user = {
      userId: user._id,
      name: user.name,
      role: user.role
    };
    
    next();
  } catch (error) {
    throw new UnauthenticatedError('Authentication invalid');
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new UnauthenticatedError('Not authorized to access this route');
    }
    next();
  };
};

module.exports = {
  authenticateUser,
  authorizeRoles
}; 