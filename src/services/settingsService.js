const StoreSetting = require("../models/StoreSetting");
const PaymentMethodSetting = require("../models/PaymentMethodSetting");
const DeliveryArea = require("../models/DeliveryArea");
const Order = require("../models/Order");
const Product = require("../models/Product");
const Coupon = require("../models/Coupon");

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function buildDateRange(query = {}) {
  const now = new Date();
  let startDate = query.startDate ? startOfDay(new Date(query.startDate)) : null;
  let endDate = query.endDate ? addDays(new Date(query.endDate), 1) : null;

  if (query.quickDate === "today") {
    startDate = startOfDay(now);
    endDate = addDays(now, 1);
  }

  if (query.quickDate === "yesterday") {
    startDate = addDays(now, -1);
    endDate = startOfDay(now);
  }

  if (query.quickDate === "tomorrow") {
    startDate = addDays(now, 1);
    endDate = addDays(now, 2);
  }

  if (query.quickDate === "this_week") {
    const mondayOffset = (now.getDay() + 6) % 7;
    startDate = addDays(now, -mondayOffset);
    endDate = addDays(startDate, 7);
  }

  if (query.quickDate === "this_month") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }

  const range = {};
  if (startDate && !Number.isNaN(startDate.valueOf())) range.$gte = startDate;
  if (endDate && !Number.isNaN(endDate.valueOf())) range.$lt = endDate;
  return Object.keys(range).length ? range : null;
}

function money(value = 0) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function groupCount(items, keyGetter) {
  return items.reduce((groups, item) => {
    const key = keyGetter(item) || "unknown";
    groups[key] = (groups[key] || 0) + 1;
    return groups;
  }, {});
}

function toBreakdownRows(groups, labelMap = {}) {
  return Object.entries(groups)
    .map(([key, value]) => ({ key, label: labelMap[key] || key.replace(/_/g, " "), value }))
    .sort((a, b) => b.value - a.value);
}

function sum(items, keyGetter) {
  return money(items.reduce((total, item) => total + (Number(keyGetter(item)) || 0), 0));
}

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

async function report(type, query = {}) {
  const dateRange = buildDateRange(query);
  const orderFilter = {};
  const productFilter = {};
  const couponFilter = {};

  if (dateRange) {
    orderFilter.createdAt = dateRange;
    productFilter.createdAt = dateRange;
    couponFilter.createdAt = dateRange;
  }

  if (query.status) orderFilter.status = query.status;
  if (query.paymentStatus) orderFilter.paymentStatus = query.paymentStatus;
  if (query.paymentMethod) orderFilter.paymentMethod = query.paymentMethod;
  if (query.courier) orderFilter.courier = query.courier;
  if (query.categoryId) productFilter.categoryId = query.categoryId;

  const [orders, products, coupons] = await Promise.all([
    Order.find(orderFilter).populate("courier", "name").sort({ createdAt: -1 }).limit(250),
    Product.find(productFilter).populate("categoryId", "name").sort({ createdAt: -1 }).limit(250),
    Coupon.find(couponFilter).sort({ createdAt: -1 }).limit(250),
  ]);

  const delivered = orders.filter((order) => order.status === "delivered");
  const paid = orders.filter((order) => order.paymentStatus === "paid");
  const cancelled = orders.filter((order) => order.status === "cancelled");
  const returned = orders.filter((order) => order.status === "returned");
  const refunded = orders.filter((order) => order.status === "refunded" || order.paymentStatus === "refunded");
  const activeCoupons = coupons.filter((coupon) => coupon.status === "active" && coupon.expiryDate > new Date());
  const lowStockProducts = products.filter((product) => {
    const availableStock = (product.stock ?? product.stockQuantity ?? 0) - (product.reservedStock || 0);
    return availableStock <= product.lowStockThreshold && availableStock > 0;
  });
  const outOfStockProducts = products.filter((product) => ((product.stock ?? product.stockQuantity ?? 0) - (product.reservedStock || 0)) <= 0);
  const grossSales = sum(orders, (order) => order.grandTotal);
  const deliveredSales = sum(delivered, (order) => order.grandTotal);
  const paidAmount = sum(paid, (order) => order.paidAmount);
  const dueAmount = sum(orders, (order) => order.dueAmount);
  const refundAmount = sum(orders, (order) => order.refundAmount);
  const averageOrderValue = orders.length ? money(grossSales / orders.length) : 0;
  const paymentMethods = toBreakdownRows(groupCount(orders, (order) => order.paymentMethod));
  const orderStatuses = toBreakdownRows(groupCount(orders, (order) => order.status));
  const paymentStatuses = toBreakdownRows(groupCount(orders, (order) => order.paymentStatus));
  const courierRows = toBreakdownRows(groupCount(orders, (order) => order.courier?.name || (order.courier ? "Assigned courier" : "No courier")));
  const categoryRows = toBreakdownRows(groupCount(products, (product) => product.categoryId?.name || "Uncategorized"));

  return {
    type,
    filters: {
      quickDate: query.quickDate || "",
      startDate: query.startDate || "",
      endDate: query.endDate || "",
      status: query.status || "",
      paymentStatus: query.paymentStatus || "",
      paymentMethod: query.paymentMethod || "",
      courier: query.courier || "",
      categoryId: query.categoryId || "",
    },
    totals: {
      orders: orders.length,
      products: products.length,
      coupons: coupons.length,
      grossSales,
      sales: deliveredSales,
      paidAmount,
      dueAmount,
      refundAmount,
      averageOrderValue,
      deliveredOrders: delivered.length,
      cancelledOrders: cancelled.length,
      returnedOrders: returned.length,
      refundedOrders: refunded.length,
      activeCoupons: activeCoupons.length,
      lowStock: lowStockProducts.length,
      outOfStock: outOfStockProducts.length,
      totalStock: products.reduce((total, product) => total + (product.stock ?? product.stockQuantity ?? 0), 0),
      reservedStock: products.reduce((total, product) => total + (product.reservedStock || 0), 0),
    },
    breakdowns: {
      orderStatuses,
      paymentStatuses,
      paymentMethods,
      couriers: courierRows,
      categories: categoryRows,
    },
    rows: {
      recentOrders: orders.slice(0, 10).map((order) => ({
        id: order._id,
        orderNumber: order.orderNumber,
        customer: order.customer?.name || "",
        phone: order.customer?.phone || "",
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        courier: order.courier?.name || "",
        grandTotal: order.grandTotal,
        paidAmount: order.paidAmount || 0,
        dueAmount: order.dueAmount || 0,
        refundAmount: order.refundAmount || 0,
        createdAt: order.createdAt,
      })),
      products: products.slice(0, 10).map((product) => ({
        id: product._id,
        name: product.name,
        sku: product.sku || product.baseSku,
        category: product.categoryId?.name || "",
        status: product.status,
        stock: product.stock ?? product.stockQuantity ?? 0,
        reservedStock: product.reservedStock || 0,
        lowStockThreshold: product.lowStockThreshold || 0,
        price: product.finalPrice || product.price || 0,
        bestSellingScore: product.bestSellingScore || 0,
      })),
      coupons: coupons.slice(0, 10).map((coupon) => ({
        id: coupon._id,
        code: coupon.code,
        title: coupon.title,
        status: coupon.status,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minimumOrderAmount: coupon.minimumOrderAmount,
        expiryDate: coupon.expiryDate,
      })),
    },
    generatedAt: new Date(),
  };
}

module.exports = { getStoreSetting, updateStoreSetting, listPaymentMethods, updatePaymentMethods, listDeliveryAreas, createDeliveryArea, updateDeliveryArea, deleteDeliveryArea, report };
