const mongoose = require("mongoose");

const settingSchema = new mongoose.Schema(
  {
    businessName: { type: String, default: "EasyEcommerce" },
    logoUrl: { type: String, default: "" },
    contactEmail: { type: String, default: "" },
    contactPhone: { type: String, default: "" },
    address: { type: String, default: "" },
    currency: { type: String, default: "BDT" },
    timezone: { type: String, default: "UTC" },
    shippingFee: { type: Number, default: 0, min: 0 },
    notifications: {
      orderEmailEnabled: { type: Boolean, default: false },
      lowStockEmailEnabled: { type: Boolean, default: false },
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Setting", settingSchema);
