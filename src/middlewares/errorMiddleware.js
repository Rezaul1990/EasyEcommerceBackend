const { ZodError } = require("zod");
const { sendError } = require("../utils/apiResponse");

function notFound(req, res) {
  return sendError(res, { statusCode: 404, message: `Route not found: ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof ZodError) {
    return sendError(res, {
      statusCode: 422,
      message: "Validation failed",
      details: err.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    });
  }

  if (err.name === "MongoServerError" && err.code === 11000) {
    return sendError(res, { statusCode: 409, message: "Duplicate value already exists" });
  }

  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : "Internal server error";
  const details = err.isOperational ? err.details : null;

  if (statusCode >= 500) console.error(err);
  return sendError(res, { statusCode, message, details });
}

module.exports = { notFound, errorHandler };
