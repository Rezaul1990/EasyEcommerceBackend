const cloudinary = require("cloudinary").v2;
const { env } = require("../../config/env");
const { AppError } = require("../../utils/AppError");

function assertConfigured() {
  const { cloudName, apiKey, apiSecret } = env.storage.cloudinary;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new AppError("Cloudinary storage is not configured", 503);
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

function optimizedDeliveryUrl(url) {
  if (!url || !url.includes("/upload/")) return url;
  return url.replace("/upload/", "/upload/f_auto,q_auto/");
}

async function uploadImage(file) {
  assertConfigured();

  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: env.storage.folder,
        resource_type: "image",
        overwrite: false,
        use_filename: true,
        unique_filename: true,
      },
      (error, uploadResult) => {
        if (error) return reject(error);
        return resolve(uploadResult);
      },
    );

    stream.end(file.buffer);
  });

  const url = optimizedDeliveryUrl(result.secure_url);

  return {
    url,
    secureUrl: url,
    originalUrl: result.secure_url,
    publicId: result.public_id,
    provider: "cloudinary",
    width: result.width,
    height: result.height,
    format: result.format,
    bytes: result.bytes,
    fileName: file.originalname,
    size: file.size,
    mimeType: file.mimetype,
  };
}

async function deleteImage(publicId) {
  assertConfigured();
  if (!publicId) return { deleted: false };
  const result = await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  return { deleted: result.result === "ok", result: result.result };
}

module.exports = { uploadImage, deleteImage };
