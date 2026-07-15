const crypto = require("crypto");
const Role = require("../models/Role");
const User = require("../models/User");
const InviteToken = require("../models/InviteToken");
const Setting = require("../models/Setting");
const Product = require("../models/Product");
const Order = require("../models/Order");
const { allPermissions } = require("../constants/permissions");
const { AppError } = require("../utils/AppError");
const { sanitizeUser } = require("./authService");
const { env } = require("../config/env");

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function buildInviteLink(token) {
  return `${env.corsOrigin.replace(/\/$/, "")}/admin/invites/accept?token=${token}`;
}

async function listRoles() {
  return Role.find().sort({ isSystemRole: -1, name: 1 });
}

function canNonOwnerAssignRole(role, actorPermissions, actorRoleId) {
  if (role.slug === "owner") return false;
  if (String(role._id) === String(actorRoleId)) return false;
  const delegatedStaffPermissions = new Set(["staff.create", "staff.update", "staff.edit", "staff.delete", "staff.manage"]);
  const canManageAccess = role.permissions.some((permission) => permission.startsWith("roles.") || delegatedStaffPermissions.has(permission));
  if (canManageAccess) return false;
  return role.permissions.every((permission) => actorPermissions.has(permission));
}

async function listAssignableRoles(actor) {
  const query = { slug: { $ne: "owner" }, status: "active" };
  const roles = await Role.find(query).sort({ isSystemRole: -1, name: 1 });
  if (actor.roleId?.slug === "owner") return roles;

  const actorPermissions = new Set(currentPermissions(actor));
  return roles.filter((role) => canNonOwnerAssignRole(role, actorPermissions, actor.roleId?._id));
}

async function ensureRoleAssignable(roleId, actor) {
  const role = await Role.findById(roleId);
  if (!role) throw new AppError("Role not found", 404);
  if (role.slug === "owner") throw new AppError("Owner role cannot be assigned to staff", 403);
  if (actor.roleId?.slug === "owner") return role;

  const actorPermissions = new Set(currentPermissions(actor));
  const canAssign = canNonOwnerAssignRole(role, actorPermissions, actor.roleId?._id);
  if (!canAssign) throw new AppError("You cannot assign a role with permissions you do not have", 403);
  return role;
}

async function getRole(id) {
  const role = await Role.findById(id);
  if (!role) throw new AppError("Role not found", 404);
  return role;
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

async function deleteRole(id) {
  const role = await Role.findById(id);
  if (!role) throw new AppError("Role not found", 404);
  if (role.slug === "owner") throw new AppError("Owner role cannot be deleted", 403);

  const usersWithRole = await User.countDocuments({ roleId: id });
  if (usersWithRole > 0) throw new AppError("Role is assigned to users and cannot be deleted", 409);

  await role.deleteOne();
  return role;
}

async function listStaff() {
  const users = await User.find().populate("roleId", "name slug permissions").sort({ createdAt: -1 });
  return users.map((user) => sanitizeUser(user));
}

async function createStaff(payload, actor) {
  const role = await ensureRoleAssignable(payload.roleId, actor);
  const duplicate = await User.findOne({ email: payload.email.toLowerCase() });
  if (duplicate) throw new AppError("A user with this email already exists", 409);

  const token = crypto.randomBytes(32).toString("hex");
  const passwordHash = await User.hashPassword(crypto.randomBytes(32).toString("hex"));
  const user = await User.create({
    ...payload,
    email: payload.email.toLowerCase(),
    passwordHash,
    status: "pending",
    inviteStatus: "pending",
    createdBy: actor._id,
    updatedBy: actor._id,
  });

  await InviteToken.create({
    user: user._id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdBy: actor._id,
  });

  await user.populate("roleId");
  return { user: sanitizeUser(user), inviteLink: buildInviteLink(token), expiresInDays: 7 };
}

async function getStaff(id) {
  const user = await User.findById(id).populate("roleId", "name slug permissions");
  if (!user) throw new AppError("User not found", 404);
  return sanitizeUser(user);
}

async function updateStaff(id, payload, actor) {
  const user = await User.findById(id).populate("roleId");
  if (!user) throw new AppError("User not found", 404);

  if (payload.roleId) {
    const role = await ensureRoleAssignable(payload.roleId, actor);
    user.roleId = role._id;
  }

  if (payload.name) user.name = payload.name;
  if (payload.status) user.status = payload.status;
  user.updatedBy = actor._id;
  await user.save();
  await user.populate("roleId");
  return sanitizeUser(user);
}

async function deleteStaff(id) {
  const user = await User.findById(id).populate("roleId");
  if (!user) throw new AppError("User not found", 404);
  if (user.roleId?.slug === "owner") throw new AppError("Owner user cannot be deleted", 403);
  await user.deleteOne();
  return sanitizeUser(user);
}

async function resendInvite(id, actorId) {
  const user = await User.findById(id);
  if (!user) throw new AppError("User not found", 404);
  if (user.status === "active" && user.inviteStatus === "accepted") throw new AppError("This user already accepted the invite", 409);

  await InviteToken.updateMany({ user: user._id, status: "pending" }, { status: "expired" });
  const token = crypto.randomBytes(32).toString("hex");
  await InviteToken.create({
    user: user._id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdBy: actorId,
  });

  user.status = "pending";
  user.inviteStatus = "pending";
  user.updatedBy = actorId;
  await user.save();

  return { inviteLink: buildInviteLink(token), expiresInDays: 7 };
}

async function verifyInvite(token) {
  const invite = await InviteToken.findOne({ tokenHash: hashToken(token), status: "pending" }).populate({
    path: "user",
    populate: { path: "roleId", select: "name slug" },
  });

  if (!invite) throw new AppError("Invite link is invalid or already used", 404);
  if (invite.expiresAt <= new Date()) {
    invite.status = "expired";
    await invite.save();
    if (invite.user) {
      invite.user.inviteStatus = "expired";
      await invite.user.save();
    }
    throw new AppError("Invite link has expired", 410);
  }

  return {
    email: invite.user.email,
    name: invite.user.name,
    role: invite.user.roleId ? { name: invite.user.roleId.name, slug: invite.user.roleId.slug } : null,
    expiresAt: invite.expiresAt,
  };
}

async function acceptInvite({ token, password }) {
  const invite = await InviteToken.findOne({ tokenHash: hashToken(token), status: "pending" }).select("+tokenHash").populate("user");
  if (!invite) throw new AppError("Invite link is invalid or already used", 404);
  if (invite.expiresAt <= new Date()) {
    invite.status = "expired";
    await invite.save();
    throw new AppError("Invite link has expired", 410);
  }

  const user = invite.user;
  if (!user) throw new AppError("Invite user no longer exists", 404);
  user.passwordHash = await User.hashPassword(password);
  user.status = "active";
  user.inviteStatus = "accepted";
  await user.save();

  invite.status = "accepted";
  invite.usedAt = new Date();
  await invite.save();

  await user.populate("roleId");
  return sanitizeUser(user);
}

function currentPermissions(user) {
  if (!user.roleId) return [];
  return user.roleId.slug === "owner" ? allPermissions : user.roleId.permissions;
}

function sidebarForUser(user) {
  const permissions = new Set(currentPermissions(user));
  const menu = [
    { label: "Dashboard", href: "/admin", module: "dashboard" },
    { label: "Products", href: "/admin/products", module: "products" },
    { label: "Categories", href: "/admin/categories", module: "categories" },
    { label: "Orders", href: "/admin/orders", module: "orders" },
    { label: "Coupons", href: "/admin/coupons", module: "coupons" },
    { label: "Visual Editor", href: "/admin/visual-editor", module: "content" },
    { label: "Inventory", href: "/admin/inventory", module: "inventory" },
    { label: "Reports", href: "/admin/reports", module: "reports" },
    { label: "Settings", href: "/admin/settings", module: "settings" },
    { label: "Users", href: "/admin/users", module: "staff" },
    { label: "Roles & Permissions", href: "/admin/roles", module: "roles" },
  ];

  return menu.filter((item) => permissions.has(`${item.module}.view`));
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
  const [totalProducts, lowStockProducts, totalOrders, todayOrders, pendingOrders, deliveredOrders, cancelledOrders, revenueAgg, paymentAgg, recentOrders, lowStockList, topProducts] = await Promise.all([
    Product.countDocuments({ status: "active" }),
    Product.countDocuments({
      status: "active",
      $or: [{ stockQuantity: { $lte: 5 } }, { stock: { $lte: 5 } }],
    }),
    Order.countDocuments(),
    Order.countDocuments({ createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } }),
    Order.countDocuments({ status: "pending" }),
    Order.countDocuments({ status: "delivered" }),
    Order.countDocuments({ status: "cancelled" }),
    Order.aggregate([{ $match: { status: { $ne: "cancelled" } } }, { $group: { _id: null, revenue: { $sum: "$grandTotal" }, due: { $sum: "$dueAmount" }, refund: { $sum: "$refundAmount" } } }]),
    Order.aggregate([{ $group: { _id: "$paymentStatus", amount: { $sum: "$grandTotal" }, count: { $sum: 1 } } }]),
    Order.find().sort({ createdAt: -1 }).limit(6).select("orderNumber orderCode customer grandTotal status paymentStatus createdAt"),
    Product.find({ status: "active", $or: [{ stockQuantity: { $lte: 5 } }, { stock: { $lte: 5 } }] })
      .sort({ updatedAt: -1 })
      .limit(6)
      .select("name sku baseSku stockQuantity stock reservedStock lowStockThreshold"),
    Product.find({ status: "active" }).sort({ bestSellingScore: -1, updatedAt: -1 }).limit(6).select("name sku baseSku bestSellingScore price finalPrice"),
  ]);

  const totals = revenueAgg[0] || {};

  return {
    cards: {
      totalOrders,
      totalSales: totals.revenue || 0,
      totalProducts,
      lowStockCount: lowStockProducts,
      todayOrders,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
      dueAmount: totals.due || 0,
      refundAmount: totals.refund || 0,
    },
    paymentSummary: paymentAgg.map((item) => ({
      status: item._id || "unknown",
      amount: item.amount,
      count: item.count,
    })),
    recentOrders,
    lowStockList,
    topSellingProducts: topProducts,
    activeProducts: totalProducts,
    lowStockProducts,
    pendingOrders,
    totalRevenue: totals.revenue || 0,
  };
}

module.exports = {
  listRoles,
  listAssignableRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
  listStaff,
  createStaff,
  getStaff,
  updateStaff,
  deleteStaff,
  resendInvite,
  verifyInvite,
  acceptInvite,
  currentPermissions,
  sidebarForUser,
  getSettings,
  updateSettings,
  dashboardSummary,
};
