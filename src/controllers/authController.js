const authService = require("../services/authService");
const { sendSuccess } = require("../utils/apiResponse");

async function login(req, res) {
  const data = await authService.login(req.body);
  return sendSuccess(res, { message: "Login successful", data });
}

async function me(req, res) {
  const data = await authService.currentUser(req.user._id);
  return sendSuccess(res, { message: "Current user loaded", data });
}

module.exports = { login, me };
