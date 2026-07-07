const inventoryService = require("../services/inventoryService");
const { sendSuccess } = require("../utils/apiResponse");

async function listInventory(req, res) {
  const data = await inventoryService.listInventory(req.query);
  return sendSuccess(res, { message: "Inventory loaded", data });
}

async function lowStock(req, res) {
  const data = await inventoryService.listInventory({ ...req.query, stockStatus: "low_stock" });
  return sendSuccess(res, { message: "Low stock loaded", data });
}

async function outOfStock(req, res) {
  const data = await inventoryService.listInventory({ ...req.query, stockStatus: "out_of_stock" });
  return sendSuccess(res, { message: "Out of stock loaded", data });
}

async function movements(req, res) {
  const data = await inventoryService.listMovements(req.query);
  return sendSuccess(res, { message: "Inventory movements loaded", data });
}

async function demoDownload(req, res) {
  const csv = await inventoryService.demoCsv(req.params.type);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${req.params.type}-restock-demo.csv"`);
  return res.send(csv);
}

async function restockImport(req, res) {
  const data = await inventoryService.restockImport({
    file: req.file,
    importType: req.body.importType || "low_stock",
    actorId: req.user._id,
  });
  return sendSuccess(res, { statusCode: 201, message: "Restock import processed", data });
}

async function importHistory(req, res) {
  const data = await inventoryService.importHistory();
  return sendSuccess(res, { message: "Import history loaded", data });
}

module.exports = { listInventory, lowStock, outOfStock, movements, demoDownload, restockImport, importHistory };
