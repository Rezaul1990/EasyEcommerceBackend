const { env } = require("../config/env");
const { AppError } = require("../utils/AppError");

function requireDb(req, res, next) {
  if (!env.mongoUri) {
    return next(new AppError("Database is not configured. Add MONGODB_URI to backend/.env.", 503));
  }
  return next();
}

module.exports = { requireDb };
