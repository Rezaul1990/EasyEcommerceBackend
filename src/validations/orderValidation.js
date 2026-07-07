const { z } = require("zod");

const createOrderSchema = z.object({
  body: z.object({
    customer: z.object({
      name: z.string().min(2),
      email: z.string().email(),
      phone: z.string().min(5),
      address: z.string().min(5),
      city: z.string().min(2),
      postalCode: z.string().optional().default(""),
    }),
    items: z
      .array(
        z.object({
          productId: z.string().min(1),
          quantity: z.number().int().positive(),
        }),
      )
      .min(1),
    paymentMethod: z.enum(["cod", "manual"]).default("cod"),
    notes: z.string().optional().default(""),
  }),
});

const updateOrderStatusSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    status: z.enum(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]),
  }),
});

module.exports = { createOrderSchema, updateOrderStatusSchema };
