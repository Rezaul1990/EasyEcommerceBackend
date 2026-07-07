const Role = require("../models/Role");
const User = require("../models/User");
const Setting = require("../models/Setting");
const Product = require("../models/Product");
const Order = require("../models/Order");
const { allPermissions } = require("../constants/permissions");
const { AppError } = require("../utils/AppError");
const { sanitizeUser } = require("./authService");

async function listRoles() {
  return Role.find().sort({ isSystemRole: -1, name: 1 });
}

async function createRole(payload, actorId) {
  const permissions = payload.permissions.filter((permission) => allPermissions.includes(permission));
  return Role.create({ ...payload, permissions, createdBy: actorId, updatedBy: actorId });
}

async function updateRole(id, payload, actorId) {
  const role = await Role.findById(id);
  if (!role) throw new AppError("Role not found", 404);
  if (role.slug === "owner") throw new AppError("Owner role cannot be edited from the API", 403);

  role.name = payload.name;
  role.slug = payload.slug;
  role.description = payload.description;
  role.permissions = payload.permissions.filter((permission) => allPermissions.includes(permission));
  role.updatedBy = actorId;
  await role.save();
  return role;
}

async function listStaff() {
  return User.find().populate("roleId", "name slug").sort({ createdAt: -1 });
}

async function createStaff(payload, actorId) {
  const role = await Role.findById(payload.roleId);
  if (!role) throw new AppError("Role not found", 404);
  const passwordHash = await User.hashPassword(payload.password);
  const user = await User.create({ ...payload, passwordHash, createdBy: actorId, updatedBy: actorId });
  await user.populate("roleId");
  return sanitizeUser(user);
}

async function getSettings() {
  const settings = await Setting.findOne().sort({ createdAt: -1 });
  if (settings) return settings;
  return Setting.create({});
}

async function updateSettings(payload, actorId) {
  const settings = await getSettings();
  Object.assign(settings, payload, { updatedBy: actorId });
  await settings.save();
  return settings;
}

async function dashboardSummary() {
  const [products, lowStockProducts, pendingOrders, revenueAgg] = await Promise.all([
    Product.countDocuments({ status: "active" }),
    Product.countDocuments({ status: "active", stockQuantity: { $lte: 5 } }),
    Order.countDocuments({ status: "pending" }),
    Order.aggregate([{ $match: { status: { $ne: "cancelled" } } }, { $group: { _id: null, revenue: { $sum: "$grandTotal" } } }]),
  ]);

  return {
    activeProducts: products,
    lowStockProducts,
    pendingOrders,
    totalRevenue: revenueAgg[0]?.revenue || 0,
  };
}

module.exports = { listRoles, createRole, updateRole, listStaff, createStaff, getSettings, updateSettings, dashboardSummary };
