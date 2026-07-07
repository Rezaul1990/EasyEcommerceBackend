const mongoose = require("mongoose");

const stockImportHistorySchema = new mongoose.Schema(
  {
    fileName: { type: String, required: true },
    importType: { type: String, enum: ["low_stock", "out_of_stock"], required: true },
    totalRows: { type: Number, min: 0, default: 0 },
    successfulRows: { type: Number, min: 0, default: 0 },
    failedRows: { type: Number, min: 0, default: 0 },
    errors: [
      {
        row: { type: Number, required: true },
        sku: { type: String, default: "" },
        message: { type: String, required: true },
      },
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true, suppressReservedKeysWarning: true },
);

module.exports = mongoose.model("StockImportHistory", stockImportHistorySchema);
