const { z } = require("zod");

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
  }),
});

const createStaffSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
    roleId: z.string().min(1),
    status: z.enum(["active", "inactive", "suspended"]).default("active"),
  }),
});

module.exports = { loginSchema, createStaffSchema };
