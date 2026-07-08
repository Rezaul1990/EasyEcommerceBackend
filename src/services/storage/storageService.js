const { env } = require("../../config/env");
const { AppError } = require("../../utils/AppError");
const localStorageProvider = require("./localStorageProvider");
const cloudinaryStorageProvider = require("./cloudinaryStorageProvider");

function getProvider(driver = env.storage.driver) {
  if (driver === "cloudinary") return cloudinaryStorageProvider;
  if (driver === "local") return localStorageProvider;
  throw new AppError(`Unsupported storage driver: ${driver}`, 500);
}

async function uploadImages(files = []) {
  const provider = getProvider();
  return Promise.all(files.map((file) => provider.uploadImage(file)));
}

async function deleteImage({ publicId, provider }) {
  return getProvider(provider).deleteImage(publicId);
}

module.exports = { uploadImages, deleteImage };
