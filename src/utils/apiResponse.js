function sendSuccess(res, { statusCode = 200, message = "Success", data = null, meta = null }) {
  return res.status(statusCode).json({ success: true, message, data, meta });
}

function sendError(res, { statusCode = 500, message = "Something went wrong", details = null }) {
  return res.status(statusCode).json({ success: false, message, details });
}

module.exports = { sendSuccess, sendError };
