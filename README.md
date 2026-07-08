# EasyEcommerce Backend

Express, MongoDB, and Mongoose REST API for EasyEcommerce.

## Scripts

- `npm run dev` starts the API with nodemon.
- `npm start` starts the API with Node.
- `npm run check` runs syntax checks.
- `npm run seed:owner` creates system roles and the first owner from local `.env`.

## Required Environment

Copy `.env.example` to `.env` and set the values. Keep real secrets in `.env` only.

For product image uploads, keep the storage provider configurable through `.env`:

- `STORAGE_DRIVER=cloudinary` for Cloudinary uploads, or `local` for local development.
- `STORAGE_FOLDER=easy-ecommerce/products` controls the provider folder/path.
- `STORAGE_MAX_FILE_SIZE_MB=5` and `STORAGE_MAX_FILES=10` keep uploads safe for the free plan.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` are required only when `STORAGE_DRIVER=cloudinary`.
