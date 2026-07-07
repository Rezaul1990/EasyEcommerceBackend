const mongoose = require("mongoose");

const storeSettingSchema = new mongoose.Schema(
  {
    shopName: { type: String, default: "EasyEcommerce" },
    logo: { type: String, default: "" },
    contactPhone: { type: String, default: "" },
    email: { type: String, default: "" },
    address: { type: String, default: "" },
    socialLinks: {
      facebook: { type: String, default: "" },
      instagram: { type: String, default: "" },
      youtube: { type: String, default: "" },
      tiktok: { type: String, default: "" },
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("StoreSetting", storeSettingSchema);
