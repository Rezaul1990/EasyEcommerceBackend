const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    action: { type: String, required: true },
    module: { type: String, required: true, index: true },
    targetType: { type: String, required: true },
    targetId: { type: String, default: "" },
    oldValue: { type: mongoose.Schema.Types.Mixed, default: null },
    newValue: { type: mongoose.Schema.Types.Mixed, default: null },
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
  },
  { timestamps: true },
);

auditLogSchema.index({ createdAt: -1, module: 1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
