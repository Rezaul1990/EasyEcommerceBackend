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
  if (product.productType === "variant" && product.variants?.length) {
    return product.variants.map((variant) => {
      const row = {
        productId: product._id,
        productName: product.name,
        productType: product.productType,
        variantId: variant._id,
        variantInfo: variant.variantName,
        sku: variant.sku,
        category: product.categoryId || product.category,
        stock: variant.stock || 0,
        reservedStock: variant.reservedStock || 0,
        availableStock: availableStock(variant.stock, variant.reservedStock),
        lowStockThreshold: variant.lowStockThreshold || 0,
        updatedAt: product.updatedAt,
      };
      return { ...row, status: stockStatus(row) };
    });
  }

  const row = {
    productId: product._id,
    productName: product.name,
    productType: product.productType || "simple",
    variantId: null,
    variantInfo: "",
    sku: product.baseSku || product.sku,
    category: product.categoryId || product.category,
    stock: product.stock ?? product.stockQuantity ?? 0,
    reservedStock: product.reservedStock || 0,
    availableStock: availableStock(product.stock ?? product.stockQuantity, product.reservedStock),
    lowStockThreshold: product.lowStockThreshold || 0,
    updatedAt: product.updatedAt,
  };
  return [{ ...row, status: stockStatus(row) }];
}

async function listInventory(query = {}) {
  const filter = {};
  if (query.categoryId) filter.categoryId = query.categoryId;
  if (query.search) filter.$text = { $search: query.search };

  const products = await Product.find(filter).populate("categoryId", "name slug").sort({ updatedAt: -1 });
  let rows = products.flatMap(productInventoryRows);

  if (query.stockStatus) rows = rows.filter((row) => row.status === query.stockStatus);
  if (query.search) {
    const value = query.search.toLowerCase();
    rows = rows.filter((row) => row.productName.toLowerCase().includes(value) || row.sku.toLowerCase().includes(value));
  }

  return rows;
}

async function listMovements(query = {}) {
  const filter = {};
  if (query.productId) filter.product = query.productId;
  if (query.type) filter.type = query.type;
  return InventoryMovement.find(filter).populate("product", "name baseSku sku").populate("createdBy", "name email").sort({ createdAt: -1 }).limit(200);
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
  const rows = await listInventory({ stockStatus: normalizedType });
  return toCsv(rows);
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

    const product = await Product.findOne({ $or: [{ baseSku: sku }, { sku }, { "variants.sku": sku }] });
    if (!product) {
      errors.push({ row: index + 2, sku, message: "SKU not found" });
      continue;
    }

    const variant = product.variants.find((item) => item.sku === sku);
    const previousStock = variant ? variant.stock || 0 : product.stock ?? product.stockQuantity ?? 0;
    const previousReservedStock = variant ? variant.reservedStock || 0 : product.reservedStock || 0;

    if (variant) {
      variant.stock = previousStock + restockAmount;
    } else {
      product.stock = previousStock + restockAmount;
      product.stockQuantity = previousStock + restockAmount;
    }
    await product.save();

    await InventoryMovement.create({
      product: product._id,
      variantSku: variant ? sku : "",
      type: "import_restock",
      quantity: restockAmount,
      previousStock,
      newStock: previousStock + restockAmount,
      previousReservedStock,
      newReservedStock: previousReservedStock,
      note: `Restock import ${file.originalname}`,
      createdBy: actorId,
    });

    successfulRows += 1;
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

async function importHistory() {
  return StockImportHistory.find().populate("createdBy", "name email").sort({ createdAt: -1 }).limit(100);
}

module.exports = { listInventory, listMovements, demoCsv, restockImport, importHistory };
