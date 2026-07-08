const { z } = require("zod");

const listQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(12),
  search: z.string().optional(),
  status: z.string().optional(),
  categoryId: z.string().optional(),
  sort: z.enum(["newest", "price-asc", "price-desc", "name"]).default("newest"),
});

const categorySchema = z.object({
  body: z.object({
    name: z.string().min(2),
    description: z.string().optional().default(""),
    status: z.enum(["active", "inactive"]).optional().default("active"),
    isActive: z.boolean().default(true),
    sortOrder: z.number().default(0),
  }),
});

const variantSchema = z.object({
  variantName: z.string().min(1),
  options: z.record(z.string(), z.string()).default({}),
  sku: z.string().min(2),
  price: z.number().nonnegative(),
  discountType: z.enum(["none", "fixed", "percentage"]).default("none"),
  discountValue: z.number().nonnegative().default(0),
  stock: z.number().int().nonnegative().default(0),
  reservedStock: z.number().int().nonnegative().default(0),
  lowStockThreshold: z.number().int().nonnegative().default(5),
  image: z.string().optional().default(""),
  status: z.enum(["active", "inactive"]).default("active"),
});

const imageAssetSchema = z.object({
  url: z.string().url(),
  publicId: z.string().optional().default(""),
  provider: z.string().optional().default("local"),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
  format: z.string().optional().default(""),
  bytes: z.number().nullable().optional(),
});

const productSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    description: z.string().min(10),
    shortDescription: z.string().optional().default(""),
    categoryId: z.string().min(1),
    productType: z.enum(["simple", "variant"]).default("simple"),
    price: z.number().nonnegative(),
    basePrice: z.number().nonnegative().optional(),
    compareAtPrice: z.number().nonnegative().nullable().optional(),
    sku: z.string().min(2),
    baseSku: z.string().min(2).optional(),
    stockQuantity: z.number().int().nonnegative().default(0),
    stock: z.number().int().nonnegative().optional(),
    reservedStock: z.number().int().nonnegative().default(0),
    lowStockThreshold: z.number().int().nonnegative().default(5),
    imageUrls: z.array(z.string().url()).default([]),
    galleryImages: z.array(z.string()).default([]),
    imageAssets: z.array(imageAssetSchema).default([]),
    discountType: z.enum(["none", "fixed", "percentage"]).default("none"),
    discountValue: z.number().nonnegative().default(0),
    variants: z.array(variantSchema).default([]),
    tags: z.array(z.string()).default([]),
    status: z.enum(["draft", "active", "inactive", "archived"]).default("draft"),
    isFeatured: z.boolean().default(false),
  }),
});

const couponSchema = z.object({
  body: z.object({
    code: z.string().min(2),
    title: z.string().min(2),
    description: z.string().optional().default(""),
    discountType: z.enum(["fixed", "percentage"]),
    discountValue: z.number().positive(),
    minimumOrderAmount: z.number().nonnegative().default(0),
    expiryDate: z.coerce.date(),
    status: z.enum(["active", "inactive"]).default("active"),
    products: z.array(z.string()).default([]),
  }),
});

const listProductsSchema = z.object({ query: listQuery });
const idParamsSchema = z.object({ params: z.object({ id: z.string().min(1) }) });
const slugParamsSchema = z.object({ params: z.object({ slug: z.string().min(1) }) });

module.exports = { categorySchema, productSchema, couponSchema, listProductsSchema, idParamsSchema, slugParamsSchema };
