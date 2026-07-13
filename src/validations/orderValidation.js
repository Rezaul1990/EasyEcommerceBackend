const { z } = require("zod");

const createOrderSchema = z.object({
  body: z.object({
    customer: z.object({
      name: z.string().min(2),
      email: z.union([z.string().email(), z.literal("")]).optional().default(""),
      phone: z.string().min(5),
      address: z.string().min(5),
      city: z.string().min(2),
      area: z.string().min(2),
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
    paymentMethod: z.enum(["cod", "manual", "bkash", "nagad", "card"]).default("cod"),
    notes: z.string().optional().default(""),
  }),
});

const updateOrderStatusSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    status: z.enum(["pending", "confirmed", "processing", "packed", "courier_assigned", "shipped", "delivered", "cancelled", "returned", "refunded"]),
    note: z.string().optional().default(""),
  }),
});

const updatePaymentSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    type: z.enum(["payment", "refund"]).optional().default("payment"),
    method: z.enum(["cash", "cod", "cash_on_delivery", "manual", "manual_payment", "bkash", "nagad", "card", "bank_transfer"]).optional(),
    paymentMethod: z.enum(["cash", "cod", "cash_on_delivery", "manual", "manual_payment", "bkash", "nagad", "card", "bank_transfer"]).optional(),
    amount: z.number().nonnegative().optional(),
    paidAmount: z.number().nonnegative().optional(),
    reference: z.string().max(120).optional().default(""),
    transactionId: z.string().max(120).optional().default(""),
    senderPhone: z.string().max(40).optional().default(""),
    reason: z.string().max(300).optional().default(""),
    note: z.string().optional().default(""),
    processedAt: z.string().optional(),
  }),
});

const updateCourierSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    courier: z.string().optional().default(""),
    courierCharge: z.number().nonnegative().default(0),
    trackingNumber: z.string().optional().default(""),
    dispatchDate: z.string().optional().default(""),
    estimatedDeliveryDate: z.string().optional().default(""),
    fulfilmentNote: z.string().optional().default(""),
  }),
});

const noteSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({ internalNote: z.string().default("") }),
});

const trackOrderSchema = z.object({
  body: z
    .object({
      orderNumber: z.string().trim().optional().default(""),
      phone: z.string().trim().optional().default(""),
    })
    .superRefine((body, ctx) => {
      if (!body.orderNumber && !body.phone) {
        ctx.addIssue({ code: "custom", message: "Enter an order ID or phone number", path: ["orderNumber"] });
      }
      if (body.orderNumber && body.orderNumber.length < 3) {
        ctx.addIssue({ code: "custom", message: "Order ID must be at least 3 characters", path: ["orderNumber"] });
      }
      if (body.phone && body.phone.length < 5) {
        ctx.addIssue({ code: "custom", message: "Phone number must be at least 5 characters", path: ["phone"] });
      }
    }),
});

module.exports = { createOrderSchema, updateOrderStatusSchema, updatePaymentSchema, updateCourierSchema, noteSchema, trackOrderSchema };
