const mongoose = require("mongoose");

const deliveryAreaSchema = new mongoose.Schema(
  {
    district: { type: String, required: true, trim: true },
    area: { type: String, required: true, trim: true },
    upazila: { type: String, default: "", trim: true },
    charge: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
  },
  { timestamps: true },
);

deliveryAreaSchema.index({ district: 1, area: 1, upazila: 1 }, { unique: true });

module.exports = mongoose.model("DeliveryArea", deliveryAreaSchema);
