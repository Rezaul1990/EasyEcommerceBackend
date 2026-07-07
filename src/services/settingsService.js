const StoreSetting = require("../models/StoreSetting");
const PaymentMethodSetting = require("../models/PaymentMethodSetting");
const DeliveryArea = require("../models/DeliveryArea");
const Order = require("../models/Order");
const Product = require("../models/Product");
const Coupon = require("../models/Coupon");

async function getStoreSetting() {
  return (await StoreSetting.findOne().sort({ createdAt: -1 })) || StoreSetting.create({});
}

async function updateStoreSetting(payload, actorId) {
  const settings = await getStoreSetting();
  Object.assign(settings, payload, { updatedBy: actorId });
  await settings.save();
  return settings;
}

async function listPaymentMethods(publicOnly = false) {
  const existing = await PaymentMethodSetting.find(publicOnly ? { status: "active" } : {}).sort({ name: 1 });
  if (existing.length) return existing;
  const defaults = [
    { name: "Cash on Delivery", key: "cod", instructions: "Pay when the order arrives" },
    { name: "bKash", key: "bkash", instructions: "" },
    { name: "Nagad", key: "nagad", instructions: "" },
    { name: "Card", key: "card", instructions: "" },
  ];
  return PaymentMethodSetting.insertMany(defaults);
}

async function updatePaymentMethods(methods, actorId) {
  const updated = [];
  for (const method of methods) {
    updated.push(
      await PaymentMethodSetting.findOneAndUpdate(
        { key: method.key },
        { ...method, updatedBy: actorId },
        { upsert: true, new: true, runValidators: true },
      ),
    );
  }
  return updated;
}

async function listDeliveryAreas(publicOnly = false) {
  return DeliveryArea.find(publicOnly ? { status: "active" } : {}).sort({ district: 1, area: 1 });
}

async function createDeliveryArea(payload) {
  return DeliveryArea.create(payload);
}

async function updateDeliveryArea(id, payload) {
  return DeliveryArea.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
}

async function deleteDeliveryArea(id) {
  return DeliveryArea.findByIdAndDelete(id);
}

async function report(type) {
  const [orders, products, coupons] = await Promise.all([Order.find(), Product.find(), Coupon.find()]);
  const delivered = orders.filter((order) => order.status === "delivered");
  const paid = orders.filter((order) => order.paymentStatus === "paid");
  return {
    type,
    totals: {
      orders: orders.length,
      products: products.length,
      coupons: coupons.length,
      sales: delivered.reduce((sum, order) => sum + order.grandTotal, 0),
      paidAmount: paid.reduce((sum, order) => sum + (order.paidAmount || 0), 0),
      dueAmount: orders.reduce((sum, order) => sum + (order.dueAmount || 0), 0),
      refundAmount: orders.reduce((sum, order) => sum + (order.refundAmount || 0), 0),
      lowStock: products.filter((product) => (product.stock ?? product.stockQuantity ?? 0) <= product.lowStockThreshold).length,
      outOfStock: products.filter((product) => (product.stock ?? product.stockQuantity ?? 0) <= 0).length,
    },
    generatedAt: new Date(),
  };
}

module.exports = { getStoreSetting, updateStoreSetting, listPaymentMethods, updatePaymentMethods, listDeliveryAreas, createDeliveryArea, updateDeliveryArea, deleteDeliveryArea, report };
