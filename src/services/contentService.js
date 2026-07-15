const PageContent = require("../models/PageContent");

const editablePages = [
  { pageKey: "home", label: "Home", path: "/", sections: [{ id: "hero", type: "hero" }, { id: "featured-products", type: "featured-products" }] },
  { pageKey: "products", label: "Products", path: "/products", sections: [{ id: "page-header", type: "page-header" }] },
  { pageKey: "checkout", label: "Checkout", path: "/checkout", sections: [{ id: "page-header", type: "page-header" }] },
  { pageKey: "track-order", label: "Track Order", path: "/track-order", sections: [{ id: "page-header", type: "page-header" }] },
  { pageKey: "cart", label: "Cart", path: "/cart", sections: [{ id: "page-header", type: "page-header" }] },
  { pageKey: "wishlist", label: "Wishlist", path: "/wishlist", sections: [{ id: "page-header", type: "page-header" }] },
];

function normalizeContent(content = {}) {
  return Object.entries(content).reduce((result, [key, value]) => {
    if (typeof key !== "string") return result;
    result[key] = typeof value === "string" ? value : String(value ?? "");
    return result;
  }, {});
}

function normalizeSectionSettings(settings = {}) {
  return Object.entries(settings).reduce((result, [sectionId, values]) => {
    if (typeof sectionId !== "string" || !values || typeof values !== "object" || Array.isArray(values)) return result;
    result[sectionId] = Object.fromEntries(Object.entries(values).filter(([, value]) => typeof value === "string" && value.trim()));
    return result;
  }, {});
}

function normalizeSections(pageKey, sections = []) {
  const page = editablePages.find((item) => item.pageKey === pageKey.toLowerCase());
  const allowed = new Map((page?.sections || []).map((section) => [section.id, section.type]));
  return sections
    .filter((section) => section && typeof section === "object" && section.pageId === pageKey.toLowerCase() && allowed.has(section.sourceId))
    .map((section, index) => ({
      id: section.id,
      pageId: pageKey.toLowerCase(),
      type: allowed.get(section.sourceId),
      sourceId: section.sourceId,
      internalName: String(section.internalName || section.sourceId).slice(0, 120),
      sortOrder: Number.isInteger(section.sortOrder) ? section.sortOrder : index,
      isActive: section.isActive !== false,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((section, index) => ({ ...section, sortOrder: index }));
}

function toPayload(doc) {
  if (!doc) return null;
  return {
    pageKey: doc.pageKey,
    content: Object.fromEntries(doc.content || []),
    styles: Object.fromEntries(doc.styles || []),
    layout: Object.fromEntries(doc.layout || []),
    sections: doc.sections || [],
    status: doc.status,
    updatedAt: doc.updatedAt,
    publishedAt: doc.publishedAt,
  };
}

async function listPages() {
  const stored = await PageContent.find({}).select("pageKey updatedAt publishedAt status").lean();
  const storedByKey = new Map(stored.map((item) => [item.pageKey, item]));
  return editablePages.map((page) => ({ ...page, status: storedByKey.get(page.pageKey)?.status || "published", updatedAt: storedByKey.get(page.pageKey)?.updatedAt || null }));
}

async function getPage(pageKey) {
  const doc = await PageContent.findOne({ pageKey: pageKey.toLowerCase() });
  return toPayload(doc) || { pageKey, content: {}, styles: {}, layout: {}, sections: [], status: "published", updatedAt: null, publishedAt: null };
}

async function getPublishedPage(pageKey) {
  const doc = await PageContent.findOne({ pageKey: pageKey.toLowerCase(), status: "published" });
  return toPayload(doc) || { pageKey, content: {}, styles: {}, layout: {}, sections: [], status: "published", updatedAt: null, publishedAt: null };
}

async function updatePage(pageKey, payload, actorId) {
  const content = normalizeContent(payload.content);
  const styles = normalizeSectionSettings(payload.styles);
  const layout = normalizeSectionSettings(payload.layout);
  const sections = normalizeSections(pageKey, payload.sections);
  const status = payload.status || "published";
  const update = {
    pageKey: pageKey.toLowerCase(),
    content,
    styles,
    layout,
    sections,
    status,
    updatedBy: actorId,
    ...(status === "published" ? { publishedAt: new Date() } : {}),
  };
  const doc = await PageContent.findOneAndUpdate({ pageKey: pageKey.toLowerCase() }, update, { upsert: true, new: true, setDefaultsOnInsert: true });
  return toPayload(doc);
}

module.exports = { editablePages, getPage, getPublishedPage, listPages, updatePage };
