const cloudinary = require("cloudinary").v2;
const { env } = require("../../config/env");
const { AppError } = require("../../utils/AppError");

function assertConfigured() {
  const { url, cloudName, apiKey, apiSecret } = env.storage.cloudinary;
  if (url.trim()) {
    try {
      const parsedUrl = new URL(url.trim());
      cloudinary.config({
        cloud_name: parsedUrl.hostname.trim(),
        api_key: decodeURIComponent(parsedUrl.username),
        api_secret: decodeURIComponent(parsedUrl.password),
        secure: true,
      });
      return;
    } catch {
      throw new AppError("Cloudinary URL is invalid", 503);
    }
  }

  if (!cloudName.trim() || !apiKey.trim() || !apiSecret.trim()) {
    throw new AppError("Cloudinary storage is not configured", 503);
  }

  cloudinary.config({
    cloud_name: cloudName.trim(),
    api_key: apiKey.trim(),
    api_secret: apiSecret.trim(),
    secure: true,
  });
}

function isCredentialError(message) {
  const value = message.toLowerCase();
  return value.includes("invalid signature") || value.includes("api_secret mismatch") || value.includes("unknown api_key") || value.includes("invalid api_key");
}

function optimizedDeliveryUrl(url) {
  if (!url || !url.includes("/upload/")) return url;
  return url.replace("/upload/", "/upload/f_auto,q_auto/");
}

async function uploadImage(file) {
  assertConfigured();

  let result;
  try {
    result = await new Promise((resolve, reject) => {
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
  } catch (error) {
    const message = String(error?.message || "");
    if (isCredentialError(message)) {
      throw new AppError("Cloudinary credentials are invalid. Update CLOUDINARY_URL or CLOUDINARY_API_SECRET in the backend environment, then redeploy.", 503, { providerMessage: message });
    }
    throw new AppError("Cloudinary image upload failed", 502, { providerMessage: message || "Unknown Cloudinary error" });
  }

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
  try {
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
    return { deleted: result.result === "ok", result: result.result };
  } catch (error) {
    const message = String(error?.message || "");
    if (isCredentialError(message)) {
      throw new AppError("Cloudinary credentials are invalid. Update CLOUDINARY_URL or CLOUDINARY_API_SECRET in the backend environment, then redeploy.", 503, { providerMessage: message });
    }
    throw new AppError("Cloudinary image delete failed", 502, { providerMessage: message || "Unknown Cloudinary error" });
  }
}

module.exports = { uploadImage, deleteImage };
