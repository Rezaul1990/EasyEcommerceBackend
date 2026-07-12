const { z } = require("zod");

const inventoryListSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    search: z.string().optional().default(""),
    stockStatus: z.enum(["all", "in_stock", "low_stock", "out_of_stock", "reserved"]).optional().default("all"),
    productType: z.enum(["all", "simple", "variant"]).optional().default("all"),
    categoryId: z.string().optional().default(""),
    sortBy: z.enum(["updated_desc", "updated_asc", "name_asc", "name_desc", "stock_asc", "stock_desc", "available_asc", "available_desc", "reserved_desc"]).optional().default("updated_desc"),
  }),
});

const movementListSchema = z.object({
  query: z.object({
    productId: z.string().optional().default(""),
    type: z.string().optional().default(""),
    search: z.string().optional().default(""),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(50),
  }),
});

const stockAdjustmentSchema = z.object({
  body: z.object({
    productId: z.string().min(1),
    variantId: z.string().optional().default(""),
    adjustmentType: z.enum(["set", "increase", "decrease"]),
    quantity: z.number().int().nonnegative(),
    lowStockThreshold: z.number().int().nonnegative().optional(),
    note: z.string().max(300).optional().default(""),
  }),
});

module.exports = { inventoryListSchema, movementListSchema, stockAdjustmentSchema };
