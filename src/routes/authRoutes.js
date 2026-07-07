const express = require("express");
const rateLimit = require("express-rate-limit");
const authController = require("../controllers/authController");
const { requireAuth } = require("../middlewares/authMiddleware");
const { validate } = require("../middlewares/validate");
const { loginSchema } = require("../validations/authValidation");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/login", loginLimiter, validate(loginSchema), asyncHandler(authController.login));
router.get("/me", requireAuth, asyncHandler(authController.me));

module.exports = router;
