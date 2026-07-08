const dotenv = require("dotenv");

dotenv.config();

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGODB_URI || "",
  jwtSecret: process.env.JWT_SECRET || "development-only-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
  publicUrl: process.env.API_PUBLIC_URL || `http://localhost:${Number(process.env.PORT || 5000)}`,
  uploadDir: process.env.UPLOAD_DIR || "uploads",
  storage: {
    driver: process.env.STORAGE_DRIVER || "local",
    folder: process.env.STORAGE_FOLDER || "easy-ecommerce/products",
    maxFileSizeMb: Number(process.env.STORAGE_MAX_FILE_SIZE_MB || 5),
    maxFiles: Number(process.env.STORAGE_MAX_FILES || 10),
    cloudinary: {
      url: process.env.CLOUDINARY_URL || "",
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
      apiKey: process.env.CLOUDINARY_API_KEY || "",
      apiSecret: process.env.CLOUDINARY_API_SECRET || "",
    },
  },
};

module.exports = { env };
