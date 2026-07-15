const { z } = require("zod");

const sectionTypes = ["hero", "featured-products", "content", "cta"];
const styleKeys = ["backgroundColor", "headingColor", "textColor", "buttonBackgroundColor", "buttonTextColor"];
const layoutKeys = ["container", "alignment", "spacingY"];

const colorSchema = z.string().regex(/^#(?:[0-9a-fA-F]{3}){1,2}$/);

const visualCmsContentSchema = z.record(
  z.string().min(1).max(80),
  z.union([z.string().max(2000), z.number(), z.boolean(), z.null()]),
);

const visualCmsStylesSchema = z
  .object({
    backgroundColor: colorSchema.optional(),
    headingColor: colorSchema.optional(),
    textColor: colorSchema.optional(),
    buttonBackgroundColor: colorSchema.optional(),
    buttonTextColor: colorSchema.optional(),
  })
  .strict()
  .default({});

const visualCmsLayoutSchema = z
  .object({
    container: z.enum(["contained", "full"]).optional(),
    alignment: z.enum(["left", "center", "right"]).optional(),
    spacingY: z.enum(["compact", "normal", "spacious"]).optional(),
  })
  .strict()
  .default({});

const pageSectionSchema = z
  .object({
    id: z.string().min(3).max(80).regex(/^[a-zA-Z0-9_-]+$/),
    pageId: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
    type: z.enum(sectionTypes),
    internalName: z.string().min(1).max(120),
    sortOrder: z.number().int().min(0).max(1000),
    isActive: z.boolean().default(true),
    content: visualCmsContentSchema.default({}),
    styles: visualCmsStylesSchema,
    layout: visualCmsLayoutSchema,
  })
  .strict();

module.exports = {
  layoutKeys,
  pageSectionSchema,
  sectionTypes,
  styleKeys,
  visualCmsContentSchema,
  visualCmsLayoutSchema,
  visualCmsStylesSchema,
};
