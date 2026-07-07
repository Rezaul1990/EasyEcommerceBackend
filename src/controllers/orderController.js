const orderService = require("../services/orderService");
const { writeAudit } = require("../services/auditService");
const { sendSuccess } = require("../utils/apiResponse");

async function createOrder(req, res) {
  const data = await orderService.createOrder(req.body);
  return sendSuccess(res, { statusCode: 201, message: "Order placed", data });
}

async function listOrders(req, res) {
  const result = await orderService.listOrders(req.query);
  return sendSuccess(res, { message: "Orders loaded", data: result.items, meta: result.pagination });
}

async function updateOrderStatus(req, res) {
  const data = await orderService.updateOrderStatus(req.params.id, req.body.status, req.user._id);
  await writeAudit({ req, action: "status_update", module: "orders", targetType: "Order", targetId: data._id, newValue: { status: data.status } });
  return sendSuccess(res, { message: "Order status updated", data });
}

module.exports = { createOrder, listOrders, updateOrderStatus };
