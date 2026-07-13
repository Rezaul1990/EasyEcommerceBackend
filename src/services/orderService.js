const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");
const Setting = require("../models/Setting");
const CourierCompany = require("../models/CourierCompany");
const InventoryMovement = require("../models/InventoryMovement");
const { env } = require("../config/env");
const { AppError } = require("../utils/AppError");

const ORDER_STATUSES = ["pending", "confirmed", "processing", "packed", "courier_assigned", "shipped", "delivered", "cancelled", "returned", "refunded"];
const PAYMENT_STATUSES = ["unpaid", "partial_paid", "paid", "pending_payment", "failed", "refunded", "partial_refunded"];
const PAYMENT_METHODS = ["cash", "cod", "cash_on_delivery", "manual", "manual_payment", "bkash", "nagad", "card", "bank_transfer"];

const STATUS_TRANSITIONS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "packed", "cancelled"],
  processing: ["packed", "cancelled"],
  packed: ["courier_assigned", "shipped", "cancelled"],
  courier_assigned: ["shipped", "cancelled"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"],
  returned: ["refunded"],
  refunded: [],
  cancelled: [],
};

const statusReasonRequired = new Set(["cancelled", "returned", "refunded"]);
const paymentAliases = {
  due: "partial_paid",
  pending: "pending_payment",
  cancelled_payment: "failed",
};

async function nextOrderNumber() {
  const suffix = Math.floor(100000 + Math.random() * 900000);
  return `EE-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${suffix}`;
}

function productAvailableStock(product) {
  return (product.stockQuantity ?? product.stock ?? 0) - (product.reservedStock || 0);
}

async function applySimpleProductStockChange({ productId, quantity, type, orderId, actorId = null, note = "" }) {
  const product = await Product.findById(productId);
  if (!product) throw new AppError("Product not found while updating stock", 404);

  const previousStock = product.stockQuantity ?? product.stock ?? 0;
  const previousReservedStock = product.reservedStock || 0;

  if (type === "reserve") {
    if (previousStock - previousReservedStock < quantity) throw new AppError(`${product.name} does not have enough available stock`, 422);
    product.reservedStock = previousReservedStock + quantity;
  }

  if (type === "release_reserve") product.reservedStock = Math.max(previousReservedStock - quantity, 0);

  if (type === "confirm_reduce") {
    product.stockQuantity = Math.max(previousStock - quantity, 0);
    product.stock = Math.max((product.stock ?? previousStock) - quantity, 0);
    product.reservedStock = Math.max(previousReservedStock - quantity, 0);
  }

  if (type === "cancel_return") {
    product.stockQuantity = previousStock + quantity;
    product.stock = (product.stock ?? previousStock) + quantity;
  }

  await product.save();
  await InventoryMovement.create({
    product: product._id,
    type,
    quantity,
    previousStock,
    newStock: product.stockQuantity ?? product.stock ?? 0,
    previousReservedStock,
    newReservedStock: product.reservedStock || 0,
    order: orderId,
    note,
    createdBy: actorId,
  });

  return product;
}

async function reserveOrderStock(order) {
  for (const item of order.items) {
    await applySimpleProductStockChange({ productId: item.productId, quantity: item.quantity, type: "reserve", orderId: order._id, note: "Order placed" });
  }
  order.stockState = "reserved";
  order.stockReservedAt = new Date();
  await order.save();
  return order;
}

async function confirmReservedStock(order, actorId) {
  if (order.stockState !== "reserved") return order;
  for (const item of order.items) {
    await applySimpleProductStockChange({ productId: item.productId, quantity: item.quantity, type: "confirm_reduce", orderId: order._id, actorId, note: "Order confirmed" });
  }
  order.stockState = "reduced";
  order.stockReducedAt = new Date();
  return order;
}

async function releaseReservedStock(order, actorId) {
  if (order.stockState !== "reserved") return order;
  for (const item of order.items) {
    await applySimpleProductStockChange({ productId: item.productId, quantity: item.quantity, type: "release_reserve", orderId: order._id, actorId, note: "Pending order cancelled" });
  }
  order.stockState = "released";
  order.stockReleasedAt = new Date();
  return order;
}

async function restockReducedOrder(order, actorId) {
  if (order.stockState !== "reduced") return order;
  for (const item of order.items) {
    await applySimpleProductStockChange({ productId: item.productId, quantity: item.quantity, type: "cancel_return", orderId: order._id, actorId, note: "Order returned" });
  }
  order.stockState = "restocked";
  order.stockRestockedAt = new Date();
  return order;
}

function getTimezoneParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  return Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
}

function zonedDateToUtc(year, month, day, timeZone) {
  const guess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const parts = getTimezoneParts(guess, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  const offset = asUtc - guess.getTime();
  return new Date(guess.getTime() - offset);
}

function addDaysYmd(ymd, days) {
  const date = new Date(Date.UTC(ymd.year, ymd.month - 1, ymd.day + days));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

function startOfMonthYmd(ymd, offset = 0) {
  const date = new Date(Date.UTC(ymd.year, ymd.month - 1 + offset, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: 1 };
}

function getOrderDateRange(query = {}) {
  const key = query.date || "today";
  if (key === "all-time") return null;
  const timeZone = env.storeTimezone || "Asia/Dhaka";
  const today = getTimezoneParts(new Date(), timeZone);
  let start = null;
  let end = null;

  if (key === "custom") {
    if (!query.startDate || !query.endDate) return null;
    const [sy, sm, sd] = query.startDate.split("-").map(Number);
    const [ey, em, ed] = query.endDate.split("-").map(Number);
    start = { year: sy, month: sm, day: sd };
    end = addDaysYmd({ year: ey, month: em, day: ed }, 1);
  } else if (key === "tomorrow") {
    start = addDaysYmd(today, 1);
    end = addDaysYmd(today, 2);
  } else if (key === "yesterday") {
    start = addDaysYmd(today, -1);
    end = { year: today.year, month: today.month, day: today.day };
  } else if (key === "this-week" || key === "last-week") {
    const localNow = new Date(Date.UTC(today.year, today.month - 1, today.day));
    const day = localNow.getUTCDay();
    const weekStartsOn = Number.isInteger(env.weekStartsOn) ? env.weekStartsOn : 1;
    const diff = (day - weekStartsOn + 7) % 7;
    const thisWeekStart = addDaysYmd(today, -diff);
    start = key === "last-week" ? addDaysYmd(thisWeekStart, -7) : thisWeekStart;
    end = key === "last-week" ? thisWeekStart : addDaysYmd(thisWeekStart, 7);
  } else if (key === "this-month" || key === "last-month") {
    start = key === "last-month" ? startOfMonthYmd(today, -1) : startOfMonthYmd(today);
    end = key === "last-month" ? startOfMonthYmd(today) : startOfMonthYmd(today, 1);
  } else if (key === "last-7-days") {
    start = addDaysYmd(today, -6);
    end = addDaysYmd(today, 1);
  } else if (key === "last-30-days") {
    start = addDaysYmd(today, -29);
    end = addDaysYmd(today, 1);
  } else {
    start = { year: today.year, month: today.month, day: today.day };
    end = addDaysYmd(today, 1);
  }

  return { $gte: zonedDateToUtc(start.year, start.month, start.day, timeZone), $lt: zonedDateToUtc(end.year, end.month, end.day, timeZone) };
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizePaymentStatus(status) {
  return paymentAliases[status] || status;
}

function calculatePaymentTotals(order) {
  const transactions = order.paymentTransactions || [];
  const transactionPaid = transactions.filter((item) => item.type === "payment").reduce((sum, item) => sum + (item.amount || 0), 0);
  const transactionRefunded = transactions.filter((item) => item.type === "refund").reduce((sum, item) => sum + (item.amount || 0), 0);
  const legacyPaid = transactions.length ? 0 : order.paidAmount || 0;
  const legacyRefunded = transactions.length ? 0 : order.refundAmount || 0;
  const paidAmount = Math.min(transactionPaid + legacyPaid, order.grandTotal);
  const refundAmount = Math.min(transactionRefunded + legacyRefunded, paidAmount);
  const netPaid = Math.max(paidAmount - refundAmount, 0);
  const dueAmount = Math.max(order.grandTotal - netPaid, 0);
  let paymentStatus = "unpaid";
  if (refundAmount > 0 && refundAmount >= paidAmount && paidAmount > 0) paymentStatus = "refunded";
  else if (refundAmount > 0) paymentStatus = "partial_refunded";
  else if (netPaid >= order.grandTotal) paymentStatus = "paid";
  else if (netPaid > 0) paymentStatus = "partial_paid";
  return { paidAmount, refundAmount, dueAmount, netPaid, paymentStatus };
}

function syncPaymentTotals(order) {
  const totals = calculatePaymentTotals(order);
  order.paidAmount = totals.paidAmount;
  order.refundAmount = totals.refundAmount;
  order.dueAmount = totals.dueAmount;
  order.paymentStatus = totals.paymentStatus;
  return totals;
}

async function createOrder(payload) {
  const productIds = payload.items.map((item) => item.productId);
  const invalidProductIds = productIds.filter((productId) => !mongoose.Types.ObjectId.isValid(productId));
  if (invalidProductIds.length) {
    throw new AppError("Your cart has old product data. Please remove those items and add products again.", 422);
  }
  const products = await Product.find({ _id: { $in: productIds }, status: "active" });
  const productMap = new Map(products.map((product) => [product._id.toString(), product]));

  const items = payload.items.map((item) => {
    const product = productMap.get(item.productId);
    if (!product) throw new AppError("One or more products are unavailable", 422);
    if (productAvailableStock(product) < item.quantity) throw new AppError(`${product.name} does not have enough stock`, 422);
    return {
      productId: product._id,
      name: product.name,
      sku: product.sku,
      imageUrl: product.imageUrls?.[0] || product.imageAssets?.[0]?.url || "",
      quantity: item.quantity,
      unitPrice: product.price,
      subtotal: product.price * item.quantity,
    };
  });

  const settings = await Setting.findOne().sort({ createdAt: -1 });
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const shippingFee = settings?.shippingFee || 0;
  const grandTotal = subtotal + shippingFee;

  const order = await Order.create({
    orderNumber: await nextOrderNumber(),
    customer: payload.customer,
    items,
    subtotal,
    shippingFee,
    grandTotal,
    paymentMethod: payload.paymentMethod,
    notes: payload.notes,
    dueAmount: grandTotal,
    source: "website",
    statusHistory: [{ status: "pending", note: "Order placed" }],
    staffActivity: [{ action: "order_created", note: "Order placed" }],
  });

  return reserveOrderStock(order);
}

function buildOrderFilter(query = {}) {
  const filter = {};
  const dateRange = getOrderDateRange(query);
  if (dateRange) filter.createdAt = dateRange;
  if (query.status && ORDER_STATUSES.includes(query.status)) filter.status = query.status;
  if (query.paymentStatus && PAYMENT_STATUSES.includes(normalizePaymentStatus(query.paymentStatus))) filter.paymentStatus = normalizePaymentStatus(query.paymentStatus);
  if (query.paymentMethod && PAYMENT_METHODS.includes(query.paymentMethod)) filter.paymentMethod = query.paymentMethod;
  if (query.source) filter.source = query.source;
  if (query.courier === "unassigned") filter.$or = [{ courier: null }, { courier: { $exists: false } }];
  else if (query.courier && mongoose.Types.ObjectId.isValid(query.courier)) filter.courier = query.courier;

  if (query.paymentState === "fully_paid") filter.dueAmount = { $lte: 0 };
  if (query.paymentState === "has_due") filter.dueAmount = { $gt: 0 };
  if (query.paymentState === "no_payment") filter.paidAmount = { $lte: 0 };
  if (query.paymentState === "refunded") filter.refundAmount = { $gt: 0 };
  if (query.paymentState === "high_value") filter.grandTotal = { $gte: Number(query.highValueAmount || 5000) };

  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), "i");
    filter.$and = filter.$and || [];
    filter.$and.push({
      $or: [
        { orderNumber: regex },
        { "customer.phone": regex },
        { "customer.email": regex },
        { "customer.name": regex },
        { "items.name": regex },
        { "items.sku": regex },
        { trackingNumber: regex },
        { "paymentTransactions.reference": regex },
        { "paymentTransactions.transactionId": regex },
        { "paymentTransactions.method": regex },
      ],
    });
  }

  return filter;
}

function getSort(query = {}) {
  const direction = query.sortOrder === "asc" ? 1 : -1;
  if (query.sortBy === "oldest") return { createdAt: 1 };
  if (query.sortBy === "highest_total") return { grandTotal: -1 };
  if (query.sortBy === "lowest_total") return { grandTotal: 1 };
  if (query.sortBy === "highest_due") return { dueAmount: -1 };
  if (query.sortBy === "recently_updated") return { updatedAt: -1 };
  return { createdAt: direction };
}

async function orderSummary(filter) {
  const [summary] = await Order.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
        confirmed: { $sum: { $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0] } },
        processing: { $sum: { $cond: [{ $eq: ["$status", "processing"] }, 1, 0] } },
        shipped: { $sum: { $cond: [{ $eq: ["$status", "shipped"] }, 1, 0] } },
        delivered: { $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
        totalDue: { $sum: "$dueAmount" },
      },
    },
  ]);
  return summary || { total: 0, pending: 0, confirmed: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0, totalDue: 0 };
}

async function listOrders(query = {}) {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 20), 1), 50);
  const filter = buildOrderFilter(query);
  const sort = getSort(query);
  const [items, total, summary] = await Promise.all([
    Order.find(filter)
      .populate("courier", "name phone defaultCharge")
      .populate("updatedBy", "name email")
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit),
    Order.countDocuments(filter),
    orderSummary(filter),
  ]);
  return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1, summary } };
}

async function updateOrderStatus(id, status, actorId, note = "") {
  const order = await Order.findById(id);
  if (!order) throw new AppError("Order not found", 404);
  const nextStatuses = STATUS_TRANSITIONS[order.status] || [];
  if (!nextStatuses.includes(status)) throw new AppError(`Cannot change order from ${order.status} to ${status}`, 422);
  if (statusReasonRequired.has(status) && !note.trim()) throw new AppError("Reason or note is required for this status change", 422);

  if (status === "confirmed") await confirmReservedStock(order, actorId);
  if (status === "cancelled") await releaseReservedStock(order, actorId);
  if (status === "returned") await restockReducedOrder(order, actorId);

  const previous = order.status;
  order.status = status;
  order.updatedBy = actorId;
  order.statusHistory.push({ status, note, updatedBy: actorId });
  order.staffActivity.push({ action: "status_changed", note: `${previous} to ${status}${note ? `: ${note}` : ""}`, updatedBy: actorId });
  await order.save();
  return getOrder(id);
}

async function getOrder(id) {
  const order = await Order.findById(id)
    .populate("courier", "name phone defaultCharge")
    .populate("updatedBy", "name email")
    .populate("staffActivity.updatedBy", "name email")
    .populate("statusHistory.updatedBy", "name email")
    .populate("internalNotes.updatedBy", "name email")
    .populate("paymentTransactions.processedBy", "name email")
    .populate("paymentTransactions.updatedBy", "name email")
    .populate("courierHistory.updatedBy", "name email");
  if (!order) throw new AppError("Order not found", 404);
  return order;
}

async function updatePayment(id, payload, actorId) {
  const order = await Order.findById(id);
  if (!order) throw new AppError("Order not found", 404);
  if (!order.paymentTransactions.length) {
    if ((order.paidAmount || 0) > 0) {
      order.paymentTransactions.push({
        type: "payment",
        method: order.paymentMethod || "manual",
        amount: order.paidAmount,
        note: "Legacy paid amount",
        processedAt: order.updatedAt || order.createdAt || new Date(),
        updatedAt: order.updatedAt || order.createdAt || new Date(),
      });
    }
    if ((order.refundAmount || 0) > 0) {
      order.paymentTransactions.push({
        type: "refund",
        method: order.paymentMethod || "manual",
        amount: order.refundAmount,
        note: "Legacy refund amount",
        processedAt: order.updatedAt || order.createdAt || new Date(),
        updatedAt: order.updatedAt || order.createdAt || new Date(),
      });
    }
  }

  const type = payload.type || "payment";
  const amount = Number(payload.amount ?? payload.paidAmount ?? 0);
  if (amount <= 0) throw new AppError("Amount must be greater than zero", 422);
  if (type === "payment" && (order.paidAmount || 0) + amount > order.grandTotal) throw new AppError("Payment cannot exceed the order total", 422);
  if (type === "refund" && amount > Math.max((order.paidAmount || 0) - (order.refundAmount || 0), 0)) throw new AppError("Refund cannot exceed the refundable amount", 422);
  if (type === "refund" && !String(payload.reason || "").trim()) throw new AppError("Refund reason is required", 422);

  const method = payload.method || payload.paymentMethod || order.paymentMethod || "manual";
  if (!PAYMENT_METHODS.includes(method)) throw new AppError("Unsupported payment method", 422);
  order.paymentMethod = method;
  order.paymentTransactions.push({
    type,
    method,
    amount,
    reference: payload.reference || "",
    transactionId: payload.transactionId || "",
    senderPhone: payload.senderPhone || "",
    note: payload.note || "",
    reason: payload.reason || "",
    processedBy: actorId,
    processedAt: payload.processedAt ? new Date(payload.processedAt) : new Date(),
    updatedBy: actorId,
  });
  const totals = syncPaymentTotals(order);
  if (type === "refund" && totals.paymentStatus === "refunded" && order.status === "returned") order.status = "refunded";
  order.paymentHistory.push({ type, paymentStatus: order.paymentStatus, method, amount, paidAmount: order.paidAmount, dueAmount: order.dueAmount, refundAmount: order.refundAmount, reference: payload.reference, transactionId: payload.transactionId, note: payload.note || payload.reason || "", updatedBy: actorId });
  order.staffActivity.push({ action: type === "refund" ? "refund_issued" : "payment_added", note: `${method} ${amount}`, updatedBy: actorId });
  order.updatedBy = actorId;
  await order.save();
  return getOrder(id);
}

async function updateCourier(id, payload, actorId) {
  const order = await Order.findById(id);
  if (!order) throw new AppError("Order not found", 404);
  let courier = null;
  if (payload.courier) {
    if (!mongoose.Types.ObjectId.isValid(payload.courier)) throw new AppError("Invalid courier", 422);
    courier = await CourierCompany.findOne({ _id: payload.courier, status: "active" });
    if (!courier) throw new AppError("Courier not found or inactive", 404);
  }

  order.courier = courier?._id || null;
  order.courierCharge = Number(payload.courierCharge ?? courier?.defaultCharge ?? 0);
  order.trackingNumber = payload.trackingNumber || "";
  order.dispatchDate = payload.dispatchDate ? new Date(payload.dispatchDate) : null;
  order.estimatedDeliveryDate = payload.estimatedDeliveryDate ? new Date(payload.estimatedDeliveryDate) : null;
  order.fulfilmentNote = payload.fulfilmentNote || "";
  order.updatedBy = actorId;
  if (courier && order.status === "packed") order.status = "courier_assigned";
  order.courierHistory.push({ courier: courier?._id || null, courierName: courier?.name || "No courier", trackingNumber: order.trackingNumber, courierCharge: order.courierCharge, note: payload.fulfilmentNote || "", updatedBy: actorId });
  order.staffActivity.push({ action: courier ? "courier_assigned" : "courier_removed", note: order.trackingNumber || courier?.name || "No courier", updatedBy: actorId });
  await order.save();
  return getOrder(id);
}

async function updateNote(id, internalNote, actorId) {
  const order = await Order.findById(id);
  if (!order) throw new AppError("Order not found", 404);
  order.internalNote = internalNote;
  if (internalNote.trim()) order.internalNotes.push({ note: internalNote.trim(), updatedBy: actorId });
  order.updatedBy = actorId;
  order.staffActivity.push({ action: "note_added", note: internalNote, updatedBy: actorId });
  await order.save();
  return getOrder(id);
}

async function trackOrder({ orderNumber, phone }) {
  const filter = {};
  const cleanOrderNumber = String(orderNumber || "").trim();
  const cleanPhone = String(phone || "").trim();

  if (cleanOrderNumber) filter.orderNumber = cleanOrderNumber;
  if (cleanPhone) filter["customer.phone"] = cleanPhone;
  if (!Object.keys(filter).length) throw new AppError("Enter an order ID or phone number", 422);

  const orders = await Order.find(filter).populate("courier", "name phone").sort({ createdAt: -1 }).limit(20);
  if (!orders.length) throw new AppError("No order found for the provided details", 404);
  return orders;
}

async function listCouriers() {
  return CourierCompany.find().sort({ name: 1 });
}

async function createCourier(payload) {
  return CourierCompany.create(payload);
}

async function updateCourierCompany(id, payload) {
  const courier = await CourierCompany.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
  if (!courier) throw new AppError("Courier not found", 404);
  return courier;
}

async function deleteCourier(id) {
  const courier = await CourierCompany.findByIdAndDelete(id);
  if (!courier) throw new AppError("Courier not found", 404);
  return courier;
}

module.exports = {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  PAYMENT_METHODS,
  STATUS_TRANSITIONS,
  createOrder,
  listOrders,
  getOrder,
  updateOrderStatus,
  updatePayment,
  updateCourier,
  updateNote,
  trackOrder,
  listCouriers,
  createCourier,
  updateCourierCompany,
  deleteCourier,
};
