const settingsService = require("../services/settingsService");
const { sendSuccess } = require("../utils/apiResponse");

async function getStore(req, res) {
  return sendSuccess(res, { message: "Store settings loaded", data: await settingsService.getStoreSetting() });
}

async function updateStore(req, res) {
  return sendSuccess(res, { message: "Store settings updated", data: await settingsService.updateStoreSetting(req.body, req.user._id) });
}

async function paymentMethods(req, res) {
  return sendSuccess(res, { message: "Payment methods loaded", data: await settingsService.listPaymentMethods(false) });
}

async function updatePaymentMethods(req, res) {
  return sendSuccess(res, { message: "Payment methods updated", data: await settingsService.updatePaymentMethods(req.body.methods || [], req.user._id) });
}

async function deliveryAreas(req, res) {
  return sendSuccess(res, { message: "Delivery areas loaded", data: await settingsService.listDeliveryAreas(false) });
}

async function createDeliveryArea(req, res) {
  return sendSuccess(res, { statusCode: 201, message: "Delivery area created", data: await settingsService.createDeliveryArea(req.body) });
}

async function updateDeliveryArea(req, res) {
  return sendSuccess(res, { message: "Delivery area updated", data: await settingsService.updateDeliveryArea(req.params.id, req.body) });
}

async function deleteDeliveryArea(req, res) {
  return sendSuccess(res, { message: "Delivery area deleted", data: await settingsService.deleteDeliveryArea(req.params.id) });
}

async function publicStore(req, res) {
  return sendSuccess(res, { message: "Store settings loaded", data: await settingsService.getStoreSetting() });
}

async function publicPaymentMethods(req, res) {
  return sendSuccess(res, { message: "Payment methods loaded", data: await settingsService.listPaymentMethods(true) });
}

async function publicDeliveryAreas(req, res) {
  return sendSuccess(res, { message: "Delivery areas loaded", data: await settingsService.listDeliveryAreas(true) });
}

async function report(req, res) {
  return sendSuccess(res, { message: "Report loaded", data: await settingsService.report(req.params.type) });
}

module.exports = { getStore, updateStore, paymentMethods, updatePaymentMethods, deliveryAreas, createDeliveryArea, updateDeliveryArea, deleteDeliveryArea, publicStore, publicPaymentMethods, publicDeliveryAreas, report };
