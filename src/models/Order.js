const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    sku: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    customer: {
      name: { type: String, required: true },
      email: { type: String, required: true, lowercase: true, trim: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, default: "" },
    },
    items: [orderItemSchema],
    subtotal: { type: Number, required: true, min: 0 },
    shippingFee: { type: Number, default: 0, min: 0 },
    discountTotal: { type: Number, default: 0, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "confirmed", "packed", "courier_assigned", "shipped", "delivered", "cancelled", "returned", "refunded"],
      default: "pending",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "partial_paid", "due", "refunded", "cancelled_payment", "pending", "failed"],
      default: "unpaid",
    },
    paymentMethod: { type: String, enum: ["cod", "manual", "bkash", "nagad", "card"], default: "cod" },
    paidAmount: { type: Number, min: 0, default: 0 },
    dueAmount: { type: Number, min: 0, default: 0 },
    refundAmount: { type: Number, min: 0, default: 0 },
    courier: { type: mongoose.Schema.Types.ObjectId, ref: "CourierCompany", default: null },
    courierCharge: { type: Number, min: 0, default: 0 },
    trackingNumber: { type: String, default: "" },
    notes: { type: String, default: "" },
    internalNote: { type: String, default: "" },
    statusHistory: [
      {
        status: String,
        note: String,
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    paymentHistory: [
      {
        paymentStatus: String,
        paidAmount: Number,
        dueAmount: Number,
        refundAmount: Number,
        note: String,
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    staffActivity: [
      {
        action: String,
        note: String,
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    stockState: {
      type: String,
      enum: ["reserved", "reduced", "released", "restocked"],
      default: "reserved",
      index: true,
    },
    stockReservedAt: { type: Date, default: null },
    stockReducedAt: { type: Date, default: null },
    stockReleasedAt: { type: Date, default: null },
    stockRestockedAt: { type: Date, default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

orderSchema.index({ "customer.email": 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("Order", orderSchema);
