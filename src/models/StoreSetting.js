const mongoose = require("mongoose");

const storeSettingSchema = new mongoose.Schema(
  {
    shopName: { type: String, default: "EasyEcommerce" },
    logo: { type: String, default: "" },
    currency: { type: String, default: "BDT", trim: true, uppercase: true },
    contactPhone: { type: String, default: "" },
    email: { type: String, default: "" },
    address: { type: String, default: "" },
    deliveryCharges: {
      dhaka: { type: Number, min: 0, default: 0 },
      outsideDhaka: { type: Number, min: 0, default: 0 },
    },
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
