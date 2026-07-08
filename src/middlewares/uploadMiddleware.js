const multer = require("multer");
const { env } = require("../config/env");
const { AppError } = require("../utils/AppError");

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function imageFileFilter(req, file, cb) {
  if (!allowedMimeTypes.has(file.mimetype)) {
    return cb(new AppError("Only JPG, PNG, WEBP, and GIF images are allowed", 422));
  }

  return cb(null, true);
}

const uploadImages = multer({
  storage: multer.memoryStorage(),
  fileFilter: imageFileFilter,
  limits: { fileSize: env.storage.maxFileSizeMb * 1024 * 1024, files: env.storage.maxFiles },
});

const uploadImportFile = multer({
  storage: multer.memoryStorage(),
  fileFilter(req, file, cb) {
    const allowed = new Set(["text/csv", "application/vnd.ms-excel", "text/plain"]);
    if (!allowed.has(file.mimetype) && !file.originalname.toLowerCase().endsWith(".csv")) {
      return cb(new AppError("Only CSV import files are allowed", 422));
    }
    return cb(null, true);
  },
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
});

module.exports = { uploadImages, uploadImportFile };
