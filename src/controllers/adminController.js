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

async function listAssignableRoles(req, res) {
  const data = await adminService.listAssignableRoles(req.user);
  return sendSuccess(res, { message: "Assignable roles loaded", data });
}

async function getRole(req, res) {
  const data = await adminService.getRole(req.params.id);
  return sendSuccess(res, { message: "Role loaded", data });
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

async function deleteRole(req, res) {
  const data = await adminService.deleteRole(req.params.id);
  await writeAudit({ req, action: "delete", module: "roles", targetType: "Role", targetId: data._id, oldValue: data });
  return sendSuccess(res, { message: "Role deleted", data });
}

async function listStaff(req, res) {
  const data = await adminService.listStaff();
  return sendSuccess(res, { message: "Staff loaded", data });
}

async function getStaff(req, res) {
  const data = await adminService.getStaff(req.params.id);
  return sendSuccess(res, { message: "Staff user loaded", data });
}

async function createStaff(req, res) {
  const data = await adminService.createStaff(req.body, req.user);
  await writeAudit({ req, action: "create", module: "staff", targetType: "User", targetId: data.user.id, newValue: data.user });
  return sendSuccess(res, { statusCode: 201, message: "Staff invite created", data });
}

async function updateStaff(req, res) {
  const data = await adminService.updateStaff(req.params.id, req.body, req.user);
  await writeAudit({ req, action: "update", module: "staff", targetType: "User", targetId: data.id, newValue: data });
  return sendSuccess(res, { message: "Staff user updated", data });
}

async function deleteStaff(req, res) {
  const data = await adminService.deleteStaff(req.params.id);
  await writeAudit({ req, action: "delete", module: "staff", targetType: "User", targetId: data.id, oldValue: data });
  return sendSuccess(res, { message: "Staff user deleted", data });
}

async function resendInvite(req, res) {
  const data = await adminService.resendInvite(req.params.id, req.user._id);
  await writeAudit({ req, action: "resend_invite", module: "staff", targetType: "User", targetId: req.params.id, newValue: { expiresInDays: data.expiresInDays } });
  return sendSuccess(res, { message: "Invite link created", data });
}

async function verifyInvite(req, res) {
  const data = await adminService.verifyInvite(req.params.token);
  return sendSuccess(res, { message: "Invite link is valid", data });
}

async function acceptInvite(req, res) {
  const data = await adminService.acceptInvite(req.body);
  return sendSuccess(res, { message: "Password setup complete", data });
}

async function myPermissions(req, res) {
  const data = adminService.currentPermissions(req.user);
  return sendSuccess(res, { message: "Permissions loaded", data });
}

async function mySidebar(req, res) {
  const data = adminService.sidebarForUser(req.user);
  return sendSuccess(res, { message: "Sidebar loaded", data });
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
  listAssignableRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
  listStaff,
  getStaff,
  createStaff,
  updateStaff,
  deleteStaff,
  resendInvite,
  verifyInvite,
  acceptInvite,
  myPermissions,
  mySidebar,
  getSettings,
  updateSettings,
  auditLogs,
};
