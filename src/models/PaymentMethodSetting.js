const mongoose = require("mongoose");

const paymentMethodSettingSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    key: { type: String, required: true, unique: true, trim: true, lowercase: true },
    instructions: { type: String, default: "" },
    status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("PaymentMethodSetting", paymentMethodSettingSchema);
