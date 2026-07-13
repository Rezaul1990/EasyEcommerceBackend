const express = require("express");
const catalogController = require("../controllers/catalogController");
const orderController = require("../controllers/orderController");
const settingsController = require("../controllers/settingsController");
const { validate } = require("../middlewares/validate");
const { listProductsSchema, slugParamsSchema } = require("../validations/catalogValidation");
const { createOrderSchema, trackOrderSchema } = require("../validations/orderValidation");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.get("/categories", asyncHandler(catalogController.publicCategories));
router.get("/products", validate(listProductsSchema), asyncHandler(catalogController.publicProducts));
router.get("/products/:slug", validate(slugParamsSchema), asyncHandler(catalogController.productBySlug));
router.get("/products/:slug/coupons", validate(slugParamsSchema), asyncHandler(catalogController.productCoupons));
router.get("/coupons", asyncHandler(catalogController.publicCoupons));
router.post("/coupons/validate", asyncHandler(catalogController.validateCoupon));
router.post("/orders", validate(createOrderSchema), asyncHandler(orderController.createOrder));
router.post("/orders/track", validate(trackOrderSchema), asyncHandler(orderController.trackOrder));
router.get("/settings/store", asyncHandler(settingsController.publicStore));
router.get("/delivery-areas", asyncHandler(settingsController.publicDeliveryAreas));
router.get("/payment-methods", asyncHandler(settingsController.publicPaymentMethods));

module.exports = router;
