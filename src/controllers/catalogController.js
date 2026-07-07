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

async function adminCoupons(req, res) {
  const data = await catalogService.listCoupons();
  return sendSuccess(res, { message: "Coupons loaded", data });
}

async function createCoupon(req, res) {
  const data = await catalogService.createCoupon(req.body, req.user._id);
  await writeAudit({ req, action: "create", module: "coupons", targetType: "Coupon", targetId: data._id, newValue: data });
  return sendSuccess(res, { statusCode: 201, message: "Coupon created", data });
}

async function getCoupon(req, res) {
  const data = await catalogService.getCoupon(req.params.id);
  return sendSuccess(res, { message: "Coupon loaded", data });
}

async function updateCoupon(req, res) {
  const data = await catalogService.updateCoupon(req.params.id, req.body, req.user._id);
  await writeAudit({ req, action: "update", module: "coupons", targetType: "Coupon", targetId: data._id, newValue: data });
  return sendSuccess(res, { message: "Coupon updated", data });
}

async function deleteCoupon(req, res) {
  const data = await catalogService.deleteCoupon(req.params.id);
  await writeAudit({ req, action: "delete", module: "coupons", targetType: "Coupon", targetId: data._id });
  return sendSuccess(res, { message: "Coupon deleted", data });
}

async function productCoupons(req, res) {
  const data = await catalogService.productCoupons(req.params.slug);
  return sendSuccess(res, { message: "Product coupons loaded", data });
}

async function validateCoupon(req, res) {
  const data = await catalogService.validateCoupon(req.body);
  return sendSuccess(res, { message: "Coupon validated", data });
}

async function uploadImages(req, res) {
  const files = req.files || [];
  const data = files.map((file) => ({
    fileName: file.filename,
    url: `/uploads/${file.filename}`,
    size: file.size,
    mimeType: file.mimetype,
  }));
  return sendSuccess(res, { statusCode: 201, message: "Images uploaded", data });
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
  adminCoupons,
  createCoupon,
  getCoupon,
  updateCoupon,
  deleteCoupon,
  productCoupons,
  validateCoupon,
  uploadImages,
};
