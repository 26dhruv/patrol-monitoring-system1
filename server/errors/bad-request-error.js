const { StatusCodes } = require('http-status-codes');
const CustomAPIError = require('./custom-api-error');

class BadRequestError extends CustomAPIError {
  constructor(message) {
    super(message);
    this.statusCode = StatusCodes.BAD_REQUEST;
    this.name = 'BadRequestError';
  }
}

module.exports = BadRequestError; 