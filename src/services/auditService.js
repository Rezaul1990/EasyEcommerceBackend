const AuditLog = require("../models/AuditLog");

async function writeAudit({ req, action, module, targetType, targetId = "", oldValue = null, newValue = null }) {
  try {
    await AuditLog.create({
      actorUserId: req.user?._id || null,
      action,
      module,
      targetType,
      targetId: String(targetId || ""),
      oldValue,
      newValue,
      ip: req.ip || "",
      userAgent: req.headers["user-agent"] || "",
    });
  } catch (err) {
    console.error("Audit log write failed", err);
  }
}

module.exports = { writeAudit };
