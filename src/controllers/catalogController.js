const catalogService = require("../services/catalogService");
const { writeAudit } = require("../services/auditService");
const { sendSuccess } = require("../utils/apiResponse");

async function publicCategories(req, res) {
  const data = await catalogService.listCategories({ publicOnly: true });
  return sendSuccess(res, { message: "Categories loaded", data });
}

async function adminCategories(req, res) {
  const data = await catalogService.listCategories();
  return sendSuccess(res, { message: "Categories loaded", data });
}

async function createCategory(req, res) {
  const data = await catalogService.createCategory(req.body, req.user._id);
  await writeAudit({ req, action: "create", module: "categories", targetType: "Category", targetId: data._id, newValue: data });
  return sendSuccess(res, { statusCode: 201, message: "Category created", data });
}

async function updateCategory(req, res) {
  const data = await catalogService.updateCategory(req.params.id, req.body, req.user._id);
  await writeAudit({ req, action: "update", module: "categories", targetType: "Category", targetId: data._id, newValue: data });
  return sendSuccess(res, { message: "Category updated", data });
}

async function deleteCategory(req, res) {
  const data = await catalogService.deleteCategory(req.params.id);
  await writeAudit({ req, action: "delete", module: "categories", targetType: "Category", targetId: data._id });
  return sendSuccess(res, { message: "Category deleted", data });
}

async function publicProducts(req, res) {
  const result = await catalogService.listProducts(req.query, { publicOnly: true });
  return sendSuccess(res, { message: "Products loaded", data: result.items, meta: result.pagination });
}

async function adminProducts(req, res) {
  const result = await catalogService.listProducts(req.query);
  return sendSuccess(res, { message: "Products loaded", data: result.items, meta: result.pagination });
}

async function productBySlug(req, res) {
  const data = await catalogService.getProductBySlug(req.params.slug);
  return sendSuccess(res, { message: "Product loaded", data });
}

async function createProduct(req, res) {
  const data = await catalogService.createProduct(req.body, req.user._id);
  await writeAudit({ req, action: "create", module: "products", targetType: "Product", targetId: data._id, newValue: data });
  return sendSuccess(res, { statusCode: 201, message: "Product created", data });
}

async function updateProduct(req, res) {
  const data = await catalogService.updateProduct(req.params.id, req.body, req.user._id);
  await writeAudit({ req, action: "update", module: "products", targetType: "Product", targetId: data._id, newValue: data });
  return sendSuccess(res, { message: "Product updated", data });
}

async function deleteProduct(req, res) {
  const data = await catalogService.deleteProduct(req.params.id);
  await writeAudit({ req, action: "delete", module: "products", targetType: "Product", targetId: data._id });
  return sendSuccess(res, { message: "Product archived", data });
}

module.exports = {
  publicCategories,
  adminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  publicProducts,
  adminProducts,
  productBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
};
