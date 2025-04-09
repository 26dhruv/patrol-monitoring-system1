const { StatusCodes } = require('http-status-codes');
const { CustomAPIError } = require('../errors');

const errorHandlerMiddleware = (err, req, res, next) => {
  console.error(err);

  if (err instanceof CustomAPIError) {
    return res.status(err.statusCode).json({ 
      success: false, 
      msg: err.message 
    });
  }

  return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
    success: false, 
    msg: 'Something went wrong, please try again later' 
  });
};

module.exports = errorHandlerMiddleware; 