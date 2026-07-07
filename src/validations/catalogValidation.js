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
    imageUrl: z.string().url().optional().or(z.literal("")).default(""),
    isActive: z.boolean().default(true),
    sortOrder: z.number().default(0),
  }),
});

const productSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    description: z.string().min(10),
    shortDescription: z.string().optional().default(""),
    categoryId: z.string().min(1),
    price: z.number().nonnegative(),
    compareAtPrice: z.number().nonnegative().nullable().optional(),
    sku: z.string().min(2),
    stockQuantity: z.number().int().nonnegative().default(0),
    lowStockThreshold: z.number().int().nonnegative().default(5),
    imageUrls: z.array(z.string().url()).default([]),
    tags: z.array(z.string()).default([]),
    status: z.enum(["draft", "active", "archived"]).default("draft"),
    isFeatured: z.boolean().default(false),
  }),
});

const listProductsSchema = z.object({ query: listQuery });
const idParamsSchema = z.object({ params: z.object({ id: z.string().min(1) }) });
const slugParamsSchema = z.object({ params: z.object({ slug: z.string().min(1) }) });

module.exports = { categorySchema, productSchema, listProductsSchema, idParamsSchema, slugParamsSchema };
