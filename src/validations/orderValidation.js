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
    status: z.enum(["pending", "confirmed", "packed", "courier_assigned", "shipped", "delivered", "cancelled", "returned", "refunded"]),
    note: z.string().optional().default(""),
  }),
});

const updatePaymentSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    paymentStatus: z.enum(["unpaid", "paid", "partial_paid", "due", "refunded", "cancelled_payment"]),
    paidAmount: z.number().nonnegative().default(0),
    dueAmount: z.number().nonnegative().default(0),
    refundAmount: z.number().nonnegative().default(0),
    note: z.string().optional().default(""),
  }),
});

const updateCourierSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    courier: z.string().optional().default(""),
    courierCharge: z.number().nonnegative().default(0),
    trackingNumber: z.string().optional().default(""),
  }),
});

const noteSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({ internalNote: z.string().default("") }),
});

const trackOrderSchema = z.object({
  body: z.object({
    orderNumber: z.string().min(3),
    phone: z.string().min(5),
  }),
});

module.exports = { createOrderSchema, updateOrderStatusSchema, updatePaymentSchema, updateCourierSchema, noteSchema, trackOrderSchema };
