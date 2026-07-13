const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    sku: { type: String, required: true },
    imageUrl: { type: String, default: "" },
    variant: { type: String, default: "" },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const paymentTransactionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["payment", "refund"], default: "payment" },
    method: { type: String, default: "" },
    amount: { type: Number, min: 0, default: 0 },
    reference: { type: String, default: "" },
    transactionId: { type: String, default: "" },
    senderPhone: { type: String, default: "" },
    note: { type: String, default: "" },
    reason: { type: String, default: "" },
    status: { type: String, default: "completed" },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    processedAt: { type: Date, default: Date.now },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    customer: {
      name: { type: String, required: true },
      email: { type: String, default: "", lowercase: true, trim: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
      city: { type: String, required: true },
      area: { type: String, default: "" },
      postalCode: { type: String, default: "" },
    },
    items: [orderItemSchema],
    subtotal: { type: Number, required: true, min: 0 },
    shippingFee: { type: Number, default: 0, min: 0 },
    discountTotal: { type: Number, default: 0, min: 0 },
    couponDiscount: { type: Number, default: 0, min: 0 },
    courierCharge: { type: Number, min: 0, default: 0 },
    taxTotal: { type: Number, default: 0, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "confirmed", "processing", "packed", "courier_assigned", "shipped", "delivered", "cancelled", "returned", "refunded"],
      default: "pending",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "partial_paid", "paid", "pending_payment", "failed", "refunded", "partial_refunded", "due", "cancelled_payment", "pending"],
      default: "unpaid",
    },
    paymentMethod: { type: String, enum: ["cash", "cod", "cash_on_delivery", "manual", "manual_payment", "bkash", "nagad", "card", "bank_transfer"], default: "cod" },
    paidAmount: { type: Number, min: 0, default: 0 },
    dueAmount: { type: Number, min: 0, default: 0 },
    refundAmount: { type: Number, min: 0, default: 0 },
    courier: { type: mongoose.Schema.Types.ObjectId, ref: "CourierCompany", default: null },
    trackingNumber: { type: String, default: "" },
    dispatchDate: { type: Date, default: null },
    estimatedDeliveryDate: { type: Date, default: null },
    fulfilmentNote: { type: String, default: "" },
    source: { type: String, enum: ["website", "admin", "staff", "pos", "phone_order", "manual_order"], default: "website", index: true },
    notes: { type: String, default: "" },
    internalNote: { type: String, default: "" },
    internalNotes: [
      {
        note: String,
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
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
        type: { type: String, default: "legacy" },
        paymentStatus: String,
        paidAmount: Number,
        dueAmount: Number,
        refundAmount: Number,
        method: String,
        amount: Number,
        reference: String,
        transactionId: String,
        senderPhone: String,
        reason: String,
        note: String,
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    paymentTransactions: [paymentTransactionSchema],
    courierHistory: [
      {
        courier: { type: mongoose.Schema.Types.ObjectId, ref: "CourierCompany", default: null },
        courierName: String,
        trackingNumber: String,
        courierCharge: Number,
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
orderSchema.index({ paymentStatus: 1, paymentMethod: 1, createdAt: -1 });
orderSchema.index({ trackingNumber: 1 });
orderSchema.index({ "items.name": 1, "items.sku": 1 });

module.exports = mongoose.model("Order", orderSchema);
