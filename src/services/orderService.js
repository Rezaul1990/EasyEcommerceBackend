const Order = require("../models/Order");
const Product = require("../models/Product");
const Setting = require("../models/Setting");
const CourierCompany = require("../models/CourierCompany");
const { AppError } = require("../utils/AppError");

async function nextOrderNumber() {
  const suffix = Math.floor(100000 + Math.random() * 900000);
  return `EE-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${suffix}`;
}

async function createOrder(payload) {
  const productIds = payload.items.map((item) => item.productId);
  const products = await Product.find({ _id: { $in: productIds }, status: "active" });
  const productMap = new Map(products.map((product) => [product._id.toString(), product]));

  const items = payload.items.map((item) => {
    const product = productMap.get(item.productId);
    if (!product) throw new AppError("One or more products are unavailable", 422);
    if (product.stockQuantity < item.quantity) throw new AppError(`${product.name} does not have enough stock`, 422);
    return {
      productId: product._id,
      name: product.name,
      sku: product.sku,
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
    statusHistory: [{ status: "pending", note: "Order placed" }],
  });

  for (const item of items) {
    await Product.findByIdAndUpdate(item.productId, { $inc: { stockQuantity: -item.quantity } });
  }

  return order;
}

async function listOrders(query = {}) {
  const page = Number(query.page || 1);
  const limit = Number(query.limit || 20);
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.search) {
    filter.$or = [
      { orderNumber: new RegExp(query.search, "i") },
      { "customer.email": new RegExp(query.search, "i") },
      { "customer.name": new RegExp(query.search, "i") },
    ];
  }
  const [items, total] = await Promise.all([
    Order.find(filter).populate("courier", "name phone defaultCharge").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Order.countDocuments(filter),
  ]);
  return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } };
}

async function updateOrderStatus(id, status, actorId) {
  const order = await Order.findById(id);
  if (!order) throw new AppError("Order not found", 404);
  order.status = status;
  order.updatedBy = actorId;
  order.statusHistory.push({ status, updatedBy: actorId });
  order.staffActivity.push({ action: "status_update", note: status, updatedBy: actorId });
  await order.save();
  return order;
}

async function getOrder(id) {
  const order = await Order.findById(id).populate("courier", "name phone defaultCharge").populate("staffActivity.updatedBy", "name email");
  if (!order) throw new AppError("Order not found", 404);
  return order;
}

async function updatePayment(id, payload, actorId) {
  const order = await Order.findById(id);
  if (!order) throw new AppError("Order not found", 404);
  Object.assign(order, {
    paymentStatus: payload.paymentStatus,
    paidAmount: payload.paidAmount,
    dueAmount: payload.dueAmount,
    refundAmount: payload.refundAmount,
    updatedBy: actorId,
  });
  order.paymentHistory.push({ ...payload, updatedBy: actorId });
  order.staffActivity.push({ action: "payment_update", note: payload.paymentStatus, updatedBy: actorId });
  await order.save();
  return order;
}

async function updateCourier(id, payload, actorId) {
  const order = await Order.findById(id);
  if (!order) throw new AppError("Order not found", 404);
  order.courier = payload.courier || null;
  order.courierCharge = payload.courierCharge;
  order.trackingNumber = payload.trackingNumber;
  order.updatedBy = actorId;
  if (payload.courier && order.status === "packed") order.status = "courier_assigned";
  order.staffActivity.push({ action: "courier_update", note: payload.trackingNumber, updatedBy: actorId });
  await order.save();
  return order.populate("courier", "name phone defaultCharge");
}

async function updateNote(id, internalNote, actorId) {
  const order = await Order.findById(id);
  if (!order) throw new AppError("Order not found", 404);
  order.internalNote = internalNote;
  order.updatedBy = actorId;
  order.staffActivity.push({ action: "note_update", note: internalNote, updatedBy: actorId });
  await order.save();
  return order;
}

async function trackOrder({ orderNumber, phone }) {
  const order = await Order.findOne({ orderNumber, "customer.phone": phone }).populate("courier", "name phone");
  if (!order) throw new AppError("Order ID and phone number do not match", 404);
  return order;
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

module.exports = { createOrder, listOrders, getOrder, updateOrderStatus, updatePayment, updateCourier, updateNote, trackOrder, listCouriers, createCourier, updateCourierCompany, deleteCourier };
