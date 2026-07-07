const slugify = require("slugify");
const Category = require("../models/Category");
const Product = require("../models/Product");
const { AppError } = require("../utils/AppError");

function makeSlug(value) {
  return slugify(value, { lower: true, strict: true, trim: true });
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
  return Product.create({ ...payload, slug: makeSlug(payload.name), createdBy: actorId, updatedBy: actorId });
}

async function updateProduct(id, payload, actorId) {
  const product = await Product.findByIdAndUpdate(
    id,
    { ...payload, slug: makeSlug(payload.name), updatedBy: actorId },
    { new: true, runValidators: true },
  );
  if (!product) throw new AppError("Product not found", 404);
  return product;
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
};
