const contentService = require("../services/contentService");
const { writeAudit } = require("../services/auditService");
const { sendSuccess } = require("../utils/apiResponse");

async function listPages(req, res) {
  const data = await contentService.listPages();
  return sendSuccess(res, { message: "Editable pages loaded", data });
}

async function getAdminPage(req, res) {
  const data = await contentService.getPage(req.params.pageKey);
  return sendSuccess(res, { message: "Page content loaded", data });
}

async function updatePage(req, res) {
  const data = await contentService.updatePage(req.params.pageKey, req.body, req.user._id);
  await writeAudit({ req, action: "update", module: "content", targetType: "PageContent", targetId: data.pageKey, newValue: data });
  return sendSuccess(res, { message: "Page content saved", data });
}

async function getPublicPage(req, res) {
  const data = await contentService.getPublishedPage(req.params.pageKey);
  return sendSuccess(res, { message: "Page content loaded", data });
}

module.exports = { getAdminPage, getPublicPage, listPages, updatePage };
