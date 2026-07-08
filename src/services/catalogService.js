const Category = require("../models/Category");
const Product = require("../models/Product");
const Coupon = require("../models/Coupon");
const { AppError } = require("../utils/AppError");
const { makeSlug } = require("../utils/slug");

function calculateDiscountedPrice(price, discountType = "none", discountValue = 0) {
  if (discountType === "fixed") return Math.max(price - discountValue, 0);
  if (discountType === "percentage") return Math.max(price - price * (discountValue / 100), 0);
  return price;
}

function normalizeProductPayload(payload) {
  const basePrice = payload.basePrice ?? payload.price;
  const baseSku = payload.baseSku || payload.sku;
  const stock = payload.stock ?? payload.stockQuantity ?? 0;
  const imageAssets = payload.imageAssets || [];
  const imageUrls = imageAssets.length ? imageAssets.map((asset) => asset.url) : payload.imageUrls || [];
  const galleryImages = payload.galleryImages?.length ? payload.galleryImages : imageUrls;
  const discountType = payload.discountType || "none";
  const discountValue = payload.discountValue || 0;
  const finalPrice = calculateDiscountedPrice(basePrice, discountType, discountValue);

  return {
    ...payload,
    category: payload.category || payload.categoryId,
    categoryId: payload.categoryId || payload.category,
    baseSku,
    basePrice,
    price: basePrice,
    sku: baseSku,
    stock,
    stockQuantity: stock,
    galleryImages,
    imageUrls,
    imageAssets,
    discountType,
    discountValue,
    finalPrice,
    variants: (payload.variants || []).map((variant) => ({
      ...variant,
      finalPrice: calculateDiscountedPrice(variant.price, variant.discountType || "none", variant.discountValue || 0),
    })),
  };
}

async function listCategories({ publicOnly = false } = {}) {
  const filter = publicOnly ? { isActive: true } : {};
  return Category.find(filter).sort({ sortOrder: 1, name: 1 });
}

async function createCategory(payload, actorId) {
  return Category.create({ ...payload, slug: makeSlug(payload.name), createdBy: actorId, updatedBy: actorId });
}

async function updateCategory(id, payload, actorId) {
  const category = await Category.findByIdAndUpdate(
    id,
    { ...payload, slug: makeSlug(payload.name), updatedBy: actorId },
    { new: true, runValidators: true },
  );
  if (!category) throw new AppError("Category not found", 404);
  return category;
}

async function deleteCategory(id) {
  const productCount = await Product.countDocuments({ categoryId: id });
  if (productCount > 0) throw new AppError("Category has products and cannot be deleted", 409);
  const deleted = await Category.findByIdAndDelete(id);
  if (!deleted) throw new AppError("Category not found", 404);
  return deleted;
}

async function listProducts(query, { publicOnly = false } = {}) {
  const page = Number(query.page || 1);
  const limit = Number(query.limit || 12);
  const skip = (page - 1) * limit;
  const filter = {};

  if (publicOnly) filter.status = "active";
  if (!publicOnly && query.status) filter.status = query.status;
  if (query.categoryId) filter.categoryId = query.categoryId;
  if (query.search) filter.$text = { $search: query.search };

  const sortMap = {
    newest: { createdAt: -1 },
    "price-asc": { price: 1 },
    "price-desc": { price: -1 },
    name: { name: 1 },
  };

  const [items, total] = await Promise.all([
    Product.find(filter).populate("categoryId", "name slug").sort(sortMap[query.sort] || sortMap.newest).skip(skip).limit(limit),
    Product.countDocuments(filter),
  ]);

  return {
    items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  };
}

async function getProductBySlug(slug) {
  const product = await Product.findOne({ slug, status: "active" }).populate("categoryId", "name slug");
  if (!product) throw new AppError("Product not found", 404);
  return product;
}

async function createProduct(payload, actorId) {
  return Product.create({ ...normalizeProductPayload(payload), slug: makeSlug(payload.name), createdBy: actorId, updatedBy: actorId });
}

async function updateProduct(id, payload, actorId) {
  const product = await Product.findByIdAndUpdate(
    id,
    { ...normalizeProductPayload(payload), slug: makeSlug(payload.name), updatedBy: actorId },
    { new: true, runValidators: true },
  );
  if (!product) throw new AppError("Product not found", 404);
  return product;
}

async function listCoupons() {
  return Coupon.find().populate("products", "name slug baseSku sku").sort({ createdAt: -1 });
}

async function createCoupon(payload, actorId) {
  return Coupon.create({ ...payload, code: payload.code.toUpperCase(), createdBy: actorId, updatedBy: actorId });
}

async function getCoupon(id) {
  const coupon = await Coupon.findById(id).populate("products", "name slug baseSku sku");
  if (!coupon) throw new AppError("Coupon not found", 404);
  return coupon;
}

async function updateCoupon(id, payload, actorId) {
  const coupon = await Coupon.findByIdAndUpdate(
    id,
    { ...payload, code: payload.code.toUpperCase(), updatedBy: actorId },
    { new: true, runValidators: true },
  ).populate("products", "name slug baseSku sku");
  if (!coupon) throw new AppError("Coupon not found", 404);
  return coupon;
}

async function deleteCoupon(id) {
  const coupon = await Coupon.findByIdAndDelete(id);
  if (!coupon) throw new AppError("Coupon not found", 404);
  return coupon;
}

async function productCoupons(slug) {
  const product = await Product.findOne({ slug, status: "active" });
  if (!product) throw new AppError("Product not found", 404);
  const now = new Date();
  return Coupon.find({
    status: "active",
    expiryDate: { $gt: now },
    $or: [{ products: { $size: 0 } }, { products: product._id }],
  }).sort({ discountValue: -1 });
}

async function validateCoupon({ code, subtotal = 0, productIds = [] }) {
  const coupon = await Coupon.findOne({ code: code.toUpperCase() });
  if (!coupon) throw new AppError("Coupon code is invalid", 404);
  if (coupon.status !== "active") throw new AppError("Coupon is inactive", 422);
  if (coupon.expiryDate <= new Date()) throw new AppError("Coupon has expired", 422);
  if (subtotal < coupon.minimumOrderAmount) throw new AppError(`Minimum order amount is ${coupon.minimumOrderAmount}`, 422);

  if (coupon.products.length) {
    const allowed = new Set(coupon.products.map((id) => id.toString()));
    const hasEligibleProduct = productIds.some((id) => allowed.has(id));
    if (!hasEligibleProduct) throw new AppError("Coupon is not valid for selected products", 422);
  }

  const discountAmount = coupon.discountType === "fixed" ? Math.min(coupon.discountValue, subtotal) : Math.min(subtotal * (coupon.discountValue / 100), subtotal);
  return {
    coupon,
    discountAmount,
    finalTotal: Math.max(subtotal - discountAmount, 0),
  };
}

async function deleteProduct(id) {
  const product = await Product.findByIdAndUpdate(id, { status: "archived" }, { new: true });
  if (!product) throw new AppError("Product not found", 404);
  return product;
}

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listProducts,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
  listCoupons,
  createCoupon,
  getCoupon,
  updateCoupon,
  deleteCoupon,
  productCoupons,
  validateCoupon,
};
