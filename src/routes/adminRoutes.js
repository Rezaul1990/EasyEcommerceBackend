const express = require("express");
const adminController = require("../controllers/adminController");
const catalogController = require("../controllers/catalogController");
const orderController = require("../controllers/orderController");
const { requireAuth, requirePermission } = require("../middlewares/authMiddleware");
const { validate } = require("../middlewares/validate");
const { categorySchema, productSchema, listProductsSchema, idParamsSchema } = require("../validations/catalogValidation");
const { updateOrderStatusSchema } = require("../validations/orderValidation");
const { roleSchema } = require("../validations/roleValidation");
const { createStaffSchema } = require("../validations/authValidation");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.use(requireAuth);

router.get("/dashboard", requirePermission("dashboard.view"), asyncHandler(adminController.dashboard));
router.get("/permissions", requirePermission("roles.view"), asyncHandler(adminController.permissions));

router.get("/categories", requirePermission("categories.view"), asyncHandler(catalogController.adminCategories));
router.post("/categories", requirePermission("categories.create"), validate(categorySchema), asyncHandler(catalogController.createCategory));
router.put("/categories/:id", requirePermission("categories.update"), validate(idParamsSchema), validate(categorySchema), asyncHandler(catalogController.updateCategory));
router.delete("/categories/:id", requirePermission("categories.delete"), validate(idParamsSchema), asyncHandler(catalogController.deleteCategory));

router.get("/products", requirePermission("products.view"), validate(listProductsSchema), asyncHandler(catalogController.adminProducts));
router.post("/products", requirePermission("products.create"), validate(productSchema), asyncHandler(catalogController.createProduct));
router.put("/products/:id", requirePermission("products.update"), validate(idParamsSchema), validate(productSchema), asyncHandler(catalogController.updateProduct));
router.delete("/products/:id", requirePermission("products.delete"), validate(idParamsSchema), asyncHandler(catalogController.deleteProduct));

router.get("/orders", requirePermission("orders.view"), asyncHandler(orderController.listOrders));
router.patch("/orders/:id/status", requirePermission("orders.update"), validate(updateOrderStatusSchema), asyncHandler(orderController.updateOrderStatus));

router.get("/roles", requirePermission("roles.view"), asyncHandler(adminController.listRoles));
router.post("/roles", requirePermission("roles.create"), validate(roleSchema), asyncHandler(adminController.createRole));
router.put("/roles/:id", requirePermission("roles.update"), validate(idParamsSchema), validate(roleSchema), asyncHandler(adminController.updateRole));

router.get("/staff", requirePermission("staff.view"), asyncHandler(adminController.listStaff));
router.post("/staff", requirePermission("staff.create"), validate(createStaffSchema), asyncHandler(adminController.createStaff));

router.get("/settings", requirePermission("settings.view"), asyncHandler(adminController.getSettings));
router.put("/settings", requirePermission("settings.update"), asyncHandler(adminController.updateSettings));
router.get("/audit-logs", requirePermission("auditLogs.view"), asyncHandler(adminController.auditLogs));

module.exports = router;
