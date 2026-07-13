const express = require("express");
const adminController = require("../controllers/adminController");
const catalogController = require("../controllers/catalogController");
const contentController = require("../controllers/contentController");
const inventoryController = require("../controllers/inventoryController");
const orderController = require("../controllers/orderController");
const settingsController = require("../controllers/settingsController");
const { requireAnyPermission, requireAuth, requireOwner, requirePermission } = require("../middlewares/authMiddleware");
const { uploadImages, uploadImportFile } = require("../middlewares/uploadMiddleware");
const { validate } = require("../middlewares/validate");
const { categorySchema, productSchema, listProductsSchema, idParamsSchema, couponSchema } = require("../validations/catalogValidation");
const { pageContentSchema, pageKeyParamsSchema } = require("../validations/contentValidation");
const { inventoryListSchema, movementListSchema, stockAdjustmentSchema } = require("../validations/inventoryValidation");
const { updateOrderStatusSchema, updatePaymentSchema, updateCourierSchema, noteSchema } = require("../validations/orderValidation");
const { roleSchema } = require("../validations/roleValidation");
const { createStaffSchema, updateUserSchema, inviteTokenParamsSchema, acceptInviteSchema } = require("../validations/authValidation");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.get("/invites/verify/:token", validate(inviteTokenParamsSchema), asyncHandler(adminController.verifyInvite));
router.post("/invites/accept", validate(acceptInviteSchema), asyncHandler(adminController.acceptInvite));

router.use(requireAuth);

router.get("/dashboard", requirePermission("dashboard.view"), asyncHandler(adminController.dashboard));
router.get("/dashboard/summary", requirePermission("dashboard.view"), asyncHandler(adminController.dashboard));
router.get("/permissions", requireOwner, asyncHandler(adminController.permissions));
router.get("/me/permissions", asyncHandler(adminController.myPermissions));
router.get("/me/sidebar", asyncHandler(adminController.mySidebar));

router.get("/content/pages", requirePermission("content.view"), asyncHandler(contentController.listPages));
router.get("/content/:pageKey", requirePermission("content.view"), validate(pageKeyParamsSchema), asyncHandler(contentController.getAdminPage));
router.put("/content/:pageKey", requirePermission("content.update"), validate(pageKeyParamsSchema), validate(pageContentSchema), asyncHandler(contentController.updatePage));

router.get("/categories", requirePermission("categories.view"), asyncHandler(catalogController.adminCategories));
router.post("/categories", requirePermission("categories.create"), validate(categorySchema), asyncHandler(catalogController.createCategory));
router.put("/categories/:id", requirePermission("categories.update"), validate(idParamsSchema), validate(categorySchema), asyncHandler(catalogController.updateCategory));
router.delete("/categories/:id", requirePermission("categories.delete"), validate(idParamsSchema), asyncHandler(catalogController.deleteCategory));

router.get("/products", requirePermission("products.view"), validate(listProductsSchema), asyncHandler(catalogController.adminProducts));
router.post("/products", requirePermission("products.create"), validate(productSchema), asyncHandler(catalogController.createProduct));
router.put("/products/:id", requirePermission("products.update"), validate(idParamsSchema), validate(productSchema), asyncHandler(catalogController.updateProduct));
router.delete("/products/:id", requirePermission("products.delete"), validate(idParamsSchema), asyncHandler(catalogController.deleteProduct));

router.get("/coupons", requirePermission("coupons.view"), asyncHandler(catalogController.adminCoupons));
router.post("/coupons", requirePermission("coupons.create"), validate(couponSchema), asyncHandler(catalogController.createCoupon));
router.get("/coupons/:id", requirePermission("coupons.view"), validate(idParamsSchema), asyncHandler(catalogController.getCoupon));
router.put("/coupons/:id", requirePermission("coupons.update"), validate(idParamsSchema), validate(couponSchema), asyncHandler(catalogController.updateCoupon));
router.delete("/coupons/:id", requirePermission("coupons.delete"), validate(idParamsSchema), asyncHandler(catalogController.deleteCoupon));

router.post("/uploads/images", requireAnyPermission(["products.create", "products.update"]), uploadImages.array("images", 10), asyncHandler(catalogController.uploadImages));
router.delete("/uploads/images", requireAnyPermission(["products.create", "products.update"]), asyncHandler(catalogController.deleteUploadedImage));

router.get("/inventory", requirePermission("inventory.view"), validate(inventoryListSchema), asyncHandler(inventoryController.listInventory));
router.get("/inventory/low-stock", requirePermission("inventory.view"), validate(inventoryListSchema), asyncHandler(inventoryController.lowStock));
router.get("/inventory/out-of-stock", requirePermission("inventory.view"), validate(inventoryListSchema), asyncHandler(inventoryController.outOfStock));
router.get("/inventory/movements", requirePermission("inventory.view"), validate(movementListSchema), asyncHandler(inventoryController.movements));
router.post("/inventory/adjust", requirePermission("inventory.update"), validate(stockAdjustmentSchema), asyncHandler(inventoryController.adjustStock));
router.get("/inventory/:type/demo-download", requirePermission("inventory.view"), asyncHandler(inventoryController.demoDownload));
router.post("/inventory/restock-import", requirePermission("inventory.update"), uploadImportFile.single("file"), asyncHandler(inventoryController.restockImport));
router.get("/inventory/import-history", requirePermission("inventory.view"), asyncHandler(inventoryController.importHistory));

router.get("/orders", requirePermission("orders.view"), asyncHandler(orderController.listOrders));
router.get("/orders/:id", requirePermission("orders.view"), validate(idParamsSchema), asyncHandler(orderController.getOrder));
router.patch("/orders/:id/status", requirePermission("orders.update"), validate(updateOrderStatusSchema), asyncHandler(orderController.updateOrderStatus));
router.put("/orders/:id/status", requirePermission("orders.update"), validate(updateOrderStatusSchema), asyncHandler(orderController.updateOrderStatus));
router.put("/orders/:id/payment", requirePermission("orders.update"), validate(updatePaymentSchema), asyncHandler(orderController.updatePayment));
router.put("/orders/:id/courier", requirePermission("orders.update"), validate(updateCourierSchema), asyncHandler(orderController.updateCourier));
router.put("/orders/:id/note", requirePermission("orders.update"), validate(noteSchema), asyncHandler(orderController.updateNote));

router.get("/couriers", requirePermission("orders.view"), asyncHandler(orderController.listCouriers));
router.post("/couriers", requirePermission("orders.update"), asyncHandler(orderController.createCourier));
router.put("/couriers/:id", requirePermission("orders.update"), validate(idParamsSchema), asyncHandler(orderController.updateCourierCompany));
router.delete("/couriers/:id", requirePermission("orders.update"), validate(idParamsSchema), asyncHandler(orderController.deleteCourier));

router.get("/roles", requireOwner, asyncHandler(adminController.listRoles));
router.post("/roles", requireOwner, validate(roleSchema), asyncHandler(adminController.createRole));
router.get("/roles/:id", requireOwner, validate(idParamsSchema), asyncHandler(adminController.getRole));
router.put("/roles/:id", requireOwner, validate(idParamsSchema), validate(roleSchema), asyncHandler(adminController.updateRole));
router.delete("/roles/:id", requireOwner, validate(idParamsSchema), asyncHandler(adminController.deleteRole));

router.get("/staff", requirePermission("staff.view"), asyncHandler(adminController.listStaff));
router.get("/staff/roles", requirePermission("staff.create"), asyncHandler(adminController.listAssignableRoles));
router.post("/staff", requirePermission("staff.create"), validate(createStaffSchema), asyncHandler(adminController.createStaff));
router.get("/staff/:id", requirePermission("staff.view"), validate(idParamsSchema), asyncHandler(adminController.getStaff));
router.put("/staff/:id", requirePermission("staff.update"), validate(idParamsSchema), validate(updateUserSchema), asyncHandler(adminController.updateStaff));
router.delete("/staff/:id", requirePermission("staff.delete"), validate(idParamsSchema), asyncHandler(adminController.deleteStaff));

router.get("/users", requirePermission("staff.view"), asyncHandler(adminController.listStaff));
router.post("/users", requirePermission("staff.create"), validate(createStaffSchema), asyncHandler(adminController.createStaff));
router.post("/users/:id/resend-invite", requirePermission("staff.create"), validate(idParamsSchema), asyncHandler(adminController.resendInvite));
router.get("/users/:id", requirePermission("staff.view"), validate(idParamsSchema), asyncHandler(adminController.getStaff));
router.put("/users/:id", requirePermission("staff.update"), validate(idParamsSchema), validate(updateUserSchema), asyncHandler(adminController.updateStaff));
router.delete("/users/:id", requirePermission("staff.delete"), validate(idParamsSchema), asyncHandler(adminController.deleteStaff));

router.get("/settings", requirePermission("settings.view"), asyncHandler(adminController.getSettings));
router.put("/settings", requirePermission("settings.update"), asyncHandler(adminController.updateSettings));
router.get("/settings/store", requirePermission("settings.view"), asyncHandler(settingsController.getStore));
router.put("/settings/store", requirePermission("settings.update"), asyncHandler(settingsController.updateStore));
router.get("/settings/payment-methods", requirePermission("settings.view"), asyncHandler(settingsController.paymentMethods));
router.put("/settings/payment-methods", requirePermission("settings.update"), asyncHandler(settingsController.updatePaymentMethods));
router.get("/settings/delivery-areas", requirePermission("settings.view"), asyncHandler(settingsController.deliveryAreas));
router.post("/settings/delivery-areas", requirePermission("settings.update"), asyncHandler(settingsController.createDeliveryArea));
router.put("/settings/delivery-areas/:id", requirePermission("settings.update"), validate(idParamsSchema), asyncHandler(settingsController.updateDeliveryArea));
router.delete("/settings/delivery-areas/:id", requirePermission("settings.update"), validate(idParamsSchema), asyncHandler(settingsController.deleteDeliveryArea));
router.get("/reports/:type", requirePermission("reports.view"), asyncHandler(settingsController.report));
router.get("/audit-logs", requirePermission("auditLogs.view"), asyncHandler(adminController.auditLogs));

module.exports = router;
