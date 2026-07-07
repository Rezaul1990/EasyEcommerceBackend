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

async function getOrder(req, res) {
  const data = await orderService.getOrder(req.params.id);
  return sendSuccess(res, { message: "Order loaded", data });
}

async function updatePayment(req, res) {
  const data = await orderService.updatePayment(req.params.id, req.body, req.user._id);
  await writeAudit({ req, action: "payment_update", module: "orders", targetType: "Order", targetId: data._id, newValue: req.body });
  return sendSuccess(res, { message: "Payment updated", data });
}

async function updateCourier(req, res) {
  const data = await orderService.updateCourier(req.params.id, req.body, req.user._id);
  await writeAudit({ req, action: "courier_update", module: "orders", targetType: "Order", targetId: data._id, newValue: req.body });
  return sendSuccess(res, { message: "Courier updated", data });
}

async function updateNote(req, res) {
  const data = await orderService.updateNote(req.params.id, req.body.internalNote, req.user._id);
  return sendSuccess(res, { message: "Order note updated", data });
}

async function trackOrder(req, res) {
  const data = await orderService.trackOrder(req.body);
  return sendSuccess(res, { message: "Order tracking loaded", data });
}

async function listCouriers(req, res) {
  const data = await orderService.listCouriers();
  return sendSuccess(res, { message: "Couriers loaded", data });
}

async function createCourier(req, res) {
  const data = await orderService.createCourier(req.body);
  return sendSuccess(res, { statusCode: 201, message: "Courier created", data });
}

async function updateCourierCompany(req, res) {
  const data = await orderService.updateCourierCompany(req.params.id, req.body);
  return sendSuccess(res, { message: "Courier updated", data });
}

async function deleteCourier(req, res) {
  const data = await orderService.deleteCourier(req.params.id);
  return sendSuccess(res, { message: "Courier deleted", data });
}

module.exports = { createOrder, listOrders, getOrder, updateOrderStatus, updatePayment, updateCourier, updateNote, trackOrder, listCouriers, createCourier, updateCourierCompany, deleteCourier };
