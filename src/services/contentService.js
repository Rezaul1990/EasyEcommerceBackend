const PageContent = require("../models/PageContent");

const editablePages = [
  { pageKey: "home", label: "Home", path: "/" },
  { pageKey: "products", label: "Products", path: "/products" },
  { pageKey: "checkout", label: "Checkout", path: "/checkout" },
  { pageKey: "track-order", label: "Track Order", path: "/track-order" },
  { pageKey: "cart", label: "Cart", path: "/cart" },
  { pageKey: "wishlist", label: "Wishlist", path: "/wishlist" },
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

function toPayload(doc) {
  if (!doc) return null;
  return {
    pageKey: doc.pageKey,
    content: Object.fromEntries(doc.content || []),
    styles: Object.fromEntries(doc.styles || []),
    layout: Object.fromEntries(doc.layout || []),
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
  return toPayload(doc) || { pageKey, content: {}, styles: {}, layout: {}, status: "published", updatedAt: null, publishedAt: null };
}

async function updatePage(pageKey, payload, actorId) {
  const content = normalizeContent(payload.content);
  const styles = normalizeSectionSettings(payload.styles);
  const layout = normalizeSectionSettings(payload.layout);
  const status = payload.status || "published";
  const update = {
    pageKey: pageKey.toLowerCase(),
    content,
    styles,
    layout,
    status,
    updatedBy: actorId,
    ...(status === "published" ? { publishedAt: new Date() } : {}),
  };
  const doc = await PageContent.findOneAndUpdate({ pageKey: pageKey.toLowerCase() }, update, { upsert: true, new: true, setDefaultsOnInsert: true });
  return toPayload(doc);
}

module.exports = { editablePages, getPage, listPages, updatePage };
