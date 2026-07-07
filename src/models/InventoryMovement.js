const mongoose = require("mongoose");

const inventoryMovementSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    variantSku: { type: String, trim: true, uppercase: true, default: "" },
    type: {
      type: String,
      enum: ["reserve", "release_reserve", "confirm_reduce", "cancel_return", "manual_restock", "import_restock", "adjustment"],
      required: true,
      index: true,
    },
    quantity: { type: Number, required: true },
    previousStock: { type: Number, required: true },
    newStock: { type: Number, required: true },
    previousReservedStock: { type: Number, required: true },
    newReservedStock: { type: Number, required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },
    note: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("InventoryMovement", inventoryMovementSchema);
