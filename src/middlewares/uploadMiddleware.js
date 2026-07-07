const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { env } = require("../config/env");
const { AppError } = require("../utils/AppError");

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const uploadPath = path.resolve(process.cwd(), env.uploadDir);
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9-_]+/gi, "-").toLowerCase();
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});

function imageFileFilter(req, file, cb) {
  if (!allowedMimeTypes.has(file.mimetype)) {
    return cb(new AppError("Only JPG, PNG, WEBP, and GIF images are allowed", 422));
  }

  return cb(null, true);
}

const uploadImages = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
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
