const mongoose = require("mongoose");

const discountSchema = {
  type: { type: String, enum: ["none", "fixed", "percentage"], default: "none" },
  value: { type: Number, min: 0, default: 0 },
};

const productVariantSchema = new mongoose.Schema(
  {
    variantName: { type: String, required: true, trim: true },
    options: { type: Map, of: String, default: {} },
    sku: { type: String, required: true, trim: true, uppercase: true },
    price: { type: Number, required: true, min: 0 },
    discountType: discountSchema.type,
    discountValue: discountSchema.value,
    finalPrice: { type: Number, required: true, min: 0 },
    stock: { type: Number, min: 0, default: 0 },
    reservedStock: { type: Number, min: 0, default: 0 },
    lowStockThreshold: { type: Number, min: 0, default: 5 },
    image: { type: String, default: "" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { _id: true },
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    description: { type: String, required: true },
    shortDescription: { type: String, default: "" },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true, index: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null, index: true },
    productType: { type: String, enum: ["simple", "variant"], default: "simple", index: true },
    galleryImages: [{ type: String }],
    baseSku: { type: String, trim: true, uppercase: true, default: "" },
    basePrice: { type: Number, min: 0, default: 0 },
    discountType: discountSchema.type,
    discountValue: discountSchema.value,
    finalPrice: { type: Number, min: 0, default: 0 },
    stock: { type: Number, min: 0, default: 0 },
    reservedStock: { type: Number, min: 0, default: 0 },
    variants: [productVariantSchema],
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0, default: null },
    sku: { type: String, required: true, unique: true, trim: true, uppercase: true },
    stockQuantity: { type: Number, required: true, min: 0, default: 0 },
    lowStockThreshold: { type: Number, min: 0, default: 5 },
    imageUrls: [{ type: String }],
    tags: [{ type: String, trim: true, lowercase: true }],
    status: {
      type: String,
      enum: ["draft", "active", "inactive", "archived"],
      default: "draft",
      index: true,
    },
    isFeatured: { type: Boolean, default: false, index: true },
    bestSellingScore: { type: Number, default: 0, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

productSchema.index({ name: "text", description: "text", sku: "text", tags: "text" });
productSchema.index({ price: 1, status: 1 });
productSchema.index({ "variants.sku": 1 }, { sparse: true });

module.exports = mongoose.model("Product", productSchema);
