const { z } = require("zod");

const sectionTypes = ["hero", "featured-products", "page-header", "content", "cta"];
const styleKeys = [
  "backgroundColor",
  "headingColor",
  "textColor",
  "buttonBackgroundColor",
  "buttonTextColor",
  "borderColor",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
  "borderWidth",
  "borderRadius",
  "shadow",
];
const layoutKeys = ["container", "alignment", "spacingY", "contentWidth", "gap", "minHeight"];

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
    borderColor: colorSchema.optional(),
    fontSize: z.enum(["sm", "base", "lg", "xl", "2xl", "3xl", "4xl", "5xl"]).optional(),
    fontWeight: z.enum(["normal", "medium", "semibold", "bold"]).optional(),
    lineHeight: z.enum(["tight", "normal", "relaxed"]).optional(),
    letterSpacing: z.enum(["normal", "wide"]).optional(),
    borderWidth: z.enum(["none", "thin", "medium"]).optional(),
    borderRadius: z.enum(["none", "sm", "md", "lg"]).optional(),
    shadow: z.enum(["none", "sm", "md", "lg"]).optional(),
  })
  .strict()
  .default({});

const visualCmsLayoutSchema = z
  .object({
    container: z.enum(["contained", "wide", "full"]).optional(),
    alignment: z.enum(["left", "center", "right"]).optional(),
    spacingY: z.enum(["compact", "normal", "spacious"]).optional(),
    contentWidth: z.enum(["narrow", "normal", "wide"]).optional(),
    gap: z.enum(["tight", "normal", "loose"]).optional(),
    minHeight: z.enum(["none", "sm", "md", "lg"]).optional(),
  })
  .strict()
  .default({});

const pageSectionSchema = z
  .object({
    id: z.string().min(3).max(80).regex(/^[a-zA-Z0-9_-]+$/),
    pageId: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
    type: z.enum(sectionTypes),
    sourceId: z.string().min(3).max(80).regex(/^[a-z0-9-]+$/),
    internalName: z.string().min(1).max(120),
    sortOrder: z.number().int().min(0).max(1000),
    isActive: z.boolean().default(true),
    content: visualCmsContentSchema.default({}),
    styles: visualCmsStylesSchema,
    layout: visualCmsLayoutSchema,
  })
  .strict();

const pageSectionsSchema = z.array(pageSectionSchema).max(30).default([]);

const sectionSettingsRecordSchema = z.record(
  z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
  visualCmsStylesSchema,
);

const sectionLayoutRecordSchema = z.record(
  z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
  visualCmsLayoutSchema,
);

module.exports = {
  layoutKeys,
  pageSectionSchema,
  pageSectionsSchema,
  sectionTypes,
  sectionLayoutRecordSchema,
  sectionSettingsRecordSchema,
  styleKeys,
  visualCmsContentSchema,
  visualCmsLayoutSchema,
  visualCmsStylesSchema,
};
