const fs = require("fs");
const path = require("path");
const { env } = require("../../config/env");

function safeFileName(originalName = "image") {
  const ext = path.extname(originalName).toLowerCase();
  const base = path.basename(originalName, ext).replace(/[^a-z0-9-_]+/gi, "-").toLowerCase() || "image";
  return `${Date.now()}-${base}${ext}`;
}

async function uploadImage(file) {
  const fileName = safeFileName(file.originalname);
  const uploadPath = path.resolve(process.cwd(), env.uploadDir);
  fs.mkdirSync(uploadPath, { recursive: true });
  await fs.promises.writeFile(path.join(uploadPath, fileName), file.buffer);
  const url = `${env.publicUrl.replace(/\/$/, "")}/uploads/${fileName}`;

  return {
    url,
    secureUrl: url,
    publicId: fileName,
    provider: "local",
    fileName,
    size: file.size,
    mimeType: file.mimetype,
  };
}

async function deleteImage(publicId) {
  if (!publicId) return { deleted: false };
  const filePath = path.resolve(process.cwd(), env.uploadDir, publicId);
  if (!filePath.startsWith(path.resolve(process.cwd(), env.uploadDir))) {
    return { deleted: false };
  }
  await fs.promises.rm(filePath, { force: true });
  return { deleted: true };
}

module.exports = { uploadImage, deleteImage };
