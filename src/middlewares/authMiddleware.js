const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { env } = require("../config/env");
const { AppError } = require("../utils/AppError");

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) throw new AppError("Authentication required", 401);

    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.sub).populate("roleId");
    if (!user || user.status !== "active") throw new AppError("User is not allowed to access this system", 403);

    req.user = user;
    req.role = user.roleId;
    next();
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return next(new AppError("Invalid or expired authentication token", 401));
    }
    return next(err);
  }
}

function requirePermission(permission) {
  return function permissionMiddleware(req, res, next) {
    const role = req.role;
    if (!role) return next(new AppError("Permission check requires authentication", 500));
    if (role.slug === "owner" || role.permissions.includes(permission)) return next();
    return next(new AppError("You do not have permission to perform this action", 403));
  };
}

function requireOwner(req, res, next) {
  const role = req.role;
  if (!role) return next(new AppError("Owner check requires authentication", 500));
  if (role.slug === "owner") return next();
  return next(new AppError("Only the store owner can perform this action", 403));
}

module.exports = { requireAuth, requireOwner, requirePermission };
