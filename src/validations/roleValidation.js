const { z } = require("zod");

const roleSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
    description: z.string().optional().default(""),
    permissions: z.array(z.string()).default([]),
  }),
});

module.exports = { roleSchema };
