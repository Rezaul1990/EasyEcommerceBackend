const mongoose = require("mongoose");

const courierCompanySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, default: "", trim: true },
    contactPerson: { type: String, default: "", trim: true },
    supportedAreas: [{ type: mongoose.Schema.Types.ObjectId, ref: "DeliveryArea" }],
    defaultCharge: { type: Number, min: 0, default: 0 },
    status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("CourierCompany", courierCompanySchema);
