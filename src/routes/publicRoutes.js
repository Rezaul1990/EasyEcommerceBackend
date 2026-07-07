const express = require("express");
const catalogController = require("../controllers/catalogController");
const orderController = require("../controllers/orderController");
const { validate } = require("../middlewares/validate");
const { listProductsSchema, slugParamsSchema } = require("../validations/catalogValidation");
const { createOrderSchema } = require("../validations/orderValidation");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.get("/categories", asyncHandler(catalogController.publicCategories));
router.get("/products", validate(listProductsSchema), asyncHandler(catalogController.publicProducts));
router.get("/products/:slug", validate(slugParamsSchema), asyncHandler(catalogController.productBySlug));
router.post("/orders", validate(createOrderSchema), asyncHandler(orderController.createOrder));

module.exports = router;
