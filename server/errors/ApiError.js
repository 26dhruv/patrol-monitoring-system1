const CustomAPIError = require('./custom-api-error');

class ApiError extends CustomAPIError {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode || 500;
    this.name = 'ApiError';
  }
}

module.exports = { ApiError }; 