const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    discountType: { type: String, enum: ["fixed", "percentage"], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    minimumOrderAmount: { type: Number, min: 0, default: 0 },
    expiryDate: { type: Date, required: true, index: true },
    status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Coupon", couponSchema);
