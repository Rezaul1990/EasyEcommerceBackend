const mongoose = require("mongoose");
const Product = require("../models/Product");
const InventoryMovement = require("../models/InventoryMovement");
const StockImportHistory = require("../models/StockImportHistory");
const { AppError } = require("../utils/AppError");

function availableStock(stock, reservedStock) {
  return Math.max((stock || 0) - (reservedStock || 0), 0);
}

function stockStatus(row) {
  if (row.availableStock <= 0) return "out_of_stock";
  if (row.availableStock <= row.lowStockThreshold) return "low_stock";
  return "in_stock";
}

function productInventoryRows(product) {
  const category = product.categoryId || product.category || null;
  if (product.productType === "variant" && product.variants?.length) {
    return product.variants.map((variant) => {
      const row = {
        productId: product._id.toString(),
        productName: product.name,
        productStatus: product.status,
        productType: product.productType,
        variantId: variant._id.toString(),
        variantInfo: variant.variantName,
        sku: variant.sku,
        category,
        stock: variant.stock || 0,
        reservedStock: variant.reservedStock || 0,
        availableStock: availableStock(variant.stock, variant.reservedStock),
        lowStockThreshold: variant.lowStockThreshold || 0,
        updatedAt: product.updatedAt,
      };
      return { ...row, status: stockStatus(row) };
    });
  }

  const stock = product.stock ?? product.stockQuantity ?? 0;
  const row = {
    productId: product._id.toString(),
    productName: product.name,
    productStatus: product.status,
    productType: product.productType || "simple",
    variantId: null,
    variantInfo: "",
    sku: product.baseSku || product.sku,
    category,
    stock,
    reservedStock: product.reservedStock || 0,
    availableStock: availableStock(stock, product.reservedStock),
    lowStockThreshold: product.lowStockThreshold || 0,
    updatedAt: product.updatedAt,
  };
  return [{ ...row, status: stockStatus(row) }];
}

function summaryForRows(rows) {
  return rows.reduce(
    (summary, row) => {
      summary.totalItems += 1;
      summary.totalStock += row.stock;
      summary.reservedStock += row.reservedStock;
      summary.availableStock += row.availableStock;
      if (row.status === "low_stock") summary.lowStock += 1;
      if (row.status === "out_of_stock") summary.outOfStock += 1;
      if (row.reservedStock > 0) summary.reservedItems += 1;
      return summary;
    },
    { totalItems: 0, totalStock: 0, reservedStock: 0, availableStock: 0, lowStock: 0, outOfStock: 0, reservedItems: 0 },
  );
}

function sortRows(rows, sortBy = "updated_desc") {
  const sorters = {
    updated_desc: (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
    updated_asc: (a, b) => new Date(a.updatedAt) - new Date(b.updatedAt),
    name_asc: (a, b) => a.productName.localeCompare(b.productName),
    name_desc: (a, b) => b.productName.localeCompare(a.productName),
    stock_asc: (a, b) => a.stock - b.stock,
    stock_desc: (a, b) => b.stock - a.stock,
    available_asc: (a, b) => a.availableStock - b.availableStock,
    available_desc: (a, b) => b.availableStock - a.availableStock,
    reserved_desc: (a, b) => b.reservedStock - a.reservedStock,
  };
  return rows.sort(sorters[sortBy] || sorters.updated_desc);
}

async function listInventory(query = {}) {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);
  const productFilter = {};
  if (query.categoryId) productFilter.categoryId = query.categoryId;
  if (query.productType && query.productType !== "all") productFilter.productType = query.productType;

  const products = await Product.find(productFilter).populate("categoryId", "name slug").sort({ updatedAt: -1 });
  let rows = products.flatMap(productInventoryRows);

  if (query.stockStatus && query.stockStatus !== "all") {
    if (query.stockStatus === "reserved") rows = rows.filter((row) => row.reservedStock > 0);
    else rows = rows.filter((row) => row.status === query.stockStatus);
  }

  if (query.search) {
    const value = query.search.toLowerCase();
    rows = rows.filter((row) => row.productName.toLowerCase().includes(value) || row.sku.toLowerCase().includes(value) || row.variantInfo.toLowerCase().includes(value));
  }

  const summary = summaryForRows(rows);
  const sortedRows = sortRows(rows, query.sortBy);
  const total = sortedRows.length;
  const items = sortedRows.slice((page - 1) * limit, page * limit);

  return { items, meta: { page, limit, total, pages: Math.ceil(total / limit) || 1, summary } };
}

async function listMovements(query = {}) {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 50), 1), 100);
  const filter = {};
  if (query.productId) filter.product = query.productId;
  if (query.type) filter.type = query.type;
  const [items, total] = await Promise.all([
    InventoryMovement.find(filter)
      .populate("product", "name baseSku sku")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    InventoryMovement.countDocuments(filter),
  ]);
  return { items, meta: { page, limit, total, pages: Math.ceil(total / limit) || 1 } };
}

function toCsv(rows) {
  const header = ["Product name", "SKU", "Variant info", "Current stock", "Reserved stock", "Available stock", "Restock amount"];
  const lines = rows.map((row) =>
    [row.productName, row.sku, row.variantInfo, row.stock, row.reservedStock, row.availableStock, ""]
      .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}

async function demoCsv(type) {
  const normalizedType = type.replace("-", "_");
  const result = await listInventory({ stockStatus: normalizedType, limit: 100 });
  return toCsv(result.items);
}

function parseCsv(buffer) {
  const text = buffer.toString("utf8").trim();
  if (!text) return [];
  const [headerLine, ...lines] = text.split(/\r?\n/);
  const headers = headerLine.split(",").map((header) => header.replace(/^"|"$/g, "").trim().toLowerCase());
  return lines.map((line) => {
    const values = line.split(",").map((value) => value.replace(/^"|"$/g, "").trim());
    return headers.reduce((row, header, index) => ({ ...row, [header]: values[index] || "" }), {});
  });
}

async function restockImport({ file, importType, actorId }) {
  if (!file) throw new AppError("CSV file is required", 422);

  const rows = parseCsv(file.buffer);
  const errors = [];
  let successfulRows = 0;

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const sku = String(row.sku || "").toUpperCase();
    const restockAmount = Number(row["restock amount"] || row.restockAmount || 0);

    if (!sku) {
      errors.push({ row: index + 2, sku, message: "SKU is required" });
      continue;
    }
    if (!Number.isFinite(restockAmount) || restockAmount <= 0) {
      errors.push({ row: index + 2, sku, message: "Restock amount must be greater than zero" });
      continue;
    }

    try {
      await adjustStock({ sku, adjustmentType: "increase", quantity: restockAmount, note: `Restock import ${file.originalname}`, actorId, movementType: "import_restock" });
      successfulRows += 1;
    } catch (error) {
      errors.push({ row: index + 2, sku, message: error.message || "Import failed" });
    }
  }

  const history = await StockImportHistory.create({
    fileName: file.originalname,
    importType,
    totalRows: rows.length,
    successfulRows,
    failedRows: errors.length,
    errors,
    createdBy: actorId,
  });

  return { history, errors };
}

async function findInventoryTarget({ productId, variantId, sku }) {
  const filter = sku ? { $or: [{ baseSku: sku }, { sku }, { "variants.sku": sku }] } : { _id: productId };
  const product = await Product.findOne(filter);
  if (!product) throw new AppError("Product not found", 404);
  const variant = variantId ? product.variants.id(variantId) : sku ? product.variants.find((item) => item.sku === sku) : null;
  return { product, variant };
}

async function adjustStock({ productId, variantId = "", sku = "", adjustmentType, quantity, lowStockThreshold, note = "", actorId, movementType = "adjustment" }) {
  if (!sku && !mongoose.Types.ObjectId.isValid(productId)) throw new AppError("Valid product is required", 422);
  const { product, variant } = await findInventoryTarget({ productId, variantId, sku });
  const previousStock = variant ? variant.stock || 0 : product.stock ?? product.stockQuantity ?? 0;
  const previousReservedStock = variant ? variant.reservedStock || 0 : product.reservedStock || 0;

  let nextStock = previousStock;
  if (adjustmentType === "set") nextStock = quantity;
  if (adjustmentType === "increase") nextStock = previousStock + quantity;
  if (adjustmentType === "decrease") nextStock = previousStock - quantity;

  if (nextStock < 0) throw new AppError("Stock cannot be negative", 422);
  if (nextStock < previousReservedStock) throw new AppError("Stock cannot be lower than reserved stock", 422);

  if (variant) {
    variant.stock = nextStock;
    if (lowStockThreshold !== undefined) variant.lowStockThreshold = lowStockThreshold;
  } else {
    product.stock = nextStock;
    product.stockQuantity = nextStock;
    if (lowStockThreshold !== undefined) product.lowStockThreshold = lowStockThreshold;
  }
  product.updatedBy = actorId;
  await product.save();

  const movement = await InventoryMovement.create({
    product: product._id,
    variantSku: variant ? variant.sku : "",
    type: movementType,
    quantity: adjustmentType === "decrease" ? -quantity : quantity,
    previousStock,
    newStock: nextStock,
    previousReservedStock,
    newReservedStock: previousReservedStock,
    note: note || `${adjustmentType} stock`,
    createdBy: actorId,
  });

  const [row] = productInventoryRows(await product.populate("categoryId", "name slug")).filter((item) => (variant ? item.variantId === variant._id.toString() : !item.variantId));
  return { row, movement, productId: product._id };
}

async function importHistory() {
  return StockImportHistory.find().populate("createdBy", "name email").sort({ createdAt: -1 }).limit(100);
}

module.exports = { listInventory, listMovements, demoCsv, restockImport, adjustStock, importHistory };
