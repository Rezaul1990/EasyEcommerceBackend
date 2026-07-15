const { z } = require("zod");
const { sectionLayoutRecordSchema, sectionSettingsRecordSchema } = require("./visualCmsValidation");

const pageKeyParamsSchema = z.object({
  params: z.object({
    pageKey: z.string().min(2).regex(/^[a-z0-9-]+$/),
  }),
});

const pageContentSchema = z.object({
  body: z.object({
    content: z.record(z.string(), z.string()).default({}),
    styles: sectionSettingsRecordSchema.optional().default({}),
    layout: sectionLayoutRecordSchema.optional().default({}),
    status: z.enum(["draft", "published"]).optional().default("published"),
  }),
});

module.exports = { pageContentSchema, pageKeyParamsSchema };
