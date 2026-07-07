const jwt = require("jsonwebtoken");
const Role = require("../models/Role");
const User = require("../models/User");
const { allPermissions } = require("../constants/permissions");
const { env } = require("../config/env");
const { AppError } = require("../utils/AppError");

function signToken(user) {
  return jwt.sign({ sub: user._id.toString() }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

function sanitizeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    status: user.status,
    role: user.roleId
      ? {
          id: user.roleId._id,
          name: user.roleId.name,
          slug: user.roleId.slug,
          permissions: user.roleId.slug === "owner" ? allPermissions : user.roleId.permissions,
        }
      : null,
  };
}

async function login({ email, password }) {
  const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash").populate("roleId");
  if (!user || !(await user.comparePassword(password))) throw new AppError("Invalid email or password", 401);
  if (user.status !== "active") throw new AppError("This account is not active", 403);

  user.lastLoginAt = new Date();
  await user.save();

  return { token: signToken(user), user: sanitizeUser(user) };
}

async function currentUser(userId) {
  const user = await User.findById(userId).populate("roleId");
  if (!user) throw new AppError("User not found", 404);
  return sanitizeUser(user);
}

async function seedSystemRoles() {
  const baseRoles = [
    { name: "Owner", slug: "owner", description: "Full system owner", permissions: allPermissions, isSystemRole: true },
    {
      name: "Admin",
      slug: "admin",
      description: "Operational ecommerce admin",
      permissions: allPermissions.filter((key) => !key.startsWith("roles.") && !key.startsWith("staff.delete")),
      isSystemRole: true,
    },
    {
      name: "Staff",
      slug: "staff",
      description: "Catalog and order staff",
      permissions: ["dashboard.view", "products.view", "orders.view", "orders.update", "customers.view"],
      isSystemRole: true,
    },
  ];

  for (const role of baseRoles) {
    await Role.findOneAndUpdate({ slug: role.slug }, role, { upsert: true, new: true, setDefaultsOnInsert: true });
  }
}

async function createOwnerFromEnv() {
  const name = process.env.SEED_OWNER_NAME || "Store Owner";
  const email = process.env.SEED_OWNER_EMAIL || process.env.OWNER_EMAIL;
  const password = process.env.SEED_OWNER_PASSWORD || process.env.OWNER_PASSWORD;

  if (!name || !email || !password) {
    throw new AppError("SEED_OWNER_EMAIL and SEED_OWNER_PASSWORD are required for owner seed.", 400);
  }

  await seedSystemRoles();
  const ownerRole = await Role.findOne({ slug: "owner" });
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return { created: false, email };

  const passwordHash = await User.hashPassword(password);
  await User.create({ name, email, passwordHash, roleId: ownerRole._id, status: "active" });
  return { created: true, email };
}

module.exports = { login, currentUser, seedSystemRoles, createOwnerFromEnv, sanitizeUser };
