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
    roleId: z.string().min(1),
    status: z.enum(["active", "inactive", "pending", "suspended"]).default("pending"),
  }),
});

const updateUserSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    roleId: z.string().min(1).optional(),
    status: z.enum(["active", "inactive", "pending", "suspended"]).optional(),
  }),
});

const inviteTokenParamsSchema = z.object({
  params: z.object({
    token: z.string().min(32),
  }),
});

const acceptInviteSchema = z.object({
  body: z.object({
    token: z.string().min(32),
    password: z.string().min(8).regex(/[A-Z]/, "Password must include an uppercase letter").regex(/[a-z]/, "Password must include a lowercase letter").regex(/[0-9]/, "Password must include a number"),
  }),
});

module.exports = { loginSchema, createStaffSchema, updateUserSchema, inviteTokenParamsSchema, acceptInviteSchema };
