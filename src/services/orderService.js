const Order = require("../models/Order");
const Product = require("../models/Product");
const Setting = require("../models/Setting");
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
    Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Order.countDocuments(filter),
  ]);
  return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } };
}

async function updateOrderStatus(id, status, actorId) {
  const order = await Order.findByIdAndUpdate(id, { status, updatedBy: actorId }, { new: true });
  if (!order) throw new AppError("Order not found", 404);
  return order;
}

module.exports = { createOrder, listOrders, updateOrderStatus };
