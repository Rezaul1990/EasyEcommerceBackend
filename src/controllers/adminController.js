const { permissionRegistry } = require("../constants/permissions");
const AuditLog = require("../models/AuditLog");
const adminService = require("../services/adminService");
const { writeAudit } = require("../services/auditService");
const { sendSuccess } = require("../utils/apiResponse");

async function permissions(req, res) {
  return sendSuccess(res, { message: "Permissions loaded", data: permissionRegistry });
}

async function dashboard(req, res) {
  const data = await adminService.dashboardSummary();
  return sendSuccess(res, { message: "Dashboard loaded", data });
}

async function listRoles(req, res) {
  const data = await adminService.listRoles();
  return sendSuccess(res, { message: "Roles loaded", data });
}

async function createRole(req, res) {
  const data = await adminService.createRole(req.body, req.user._id);
  await writeAudit({ req, action: "create", module: "roles", targetType: "Role", targetId: data._id, newValue: data });
  return sendSuccess(res, { statusCode: 201, message: "Role created", data });
}

async function updateRole(req, res) {
  const data = await adminService.updateRole(req.params.id, req.body, req.user._id);
  await writeAudit({ req, action: "update", module: "roles", targetType: "Role", targetId: data._id, newValue: data });
  return sendSuccess(res, { message: "Role updated", data });
}

async function listStaff(req, res) {
  const data = await adminService.listStaff();
  return sendSuccess(res, { message: "Staff loaded", data });
}

async function createStaff(req, res) {
  const data = await adminService.createStaff(req.body, req.user._id);
  await writeAudit({ req, action: "create", module: "staff", targetType: "User", targetId: data.id, newValue: data });
  return sendSuccess(res, { statusCode: 201, message: "Staff user created", data });
}

async function getSettings(req, res) {
  const data = await adminService.getSettings();
  return sendSuccess(res, { message: "Settings loaded", data });
}

async function updateSettings(req, res) {
  const data = await adminService.updateSettings(req.body, req.user._id);
  await writeAudit({ req, action: "update", module: "settings", targetType: "Setting", targetId: data._id, newValue: data });
  return sendSuccess(res, { message: "Settings updated", data });
}

async function auditLogs(req, res) {
  const data = await AuditLog.find().sort({ createdAt: -1 }).limit(100);
  return sendSuccess(res, { message: "Audit logs loaded", data });
}

module.exports = {
  permissions,
  dashboard,
  listRoles,
  createRole,
  updateRole,
  listStaff,
  createStaff,
  getSettings,
  updateSettings,
  auditLogs,
};
