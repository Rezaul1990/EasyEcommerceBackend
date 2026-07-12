const { app } = require("../src/app");
const { connectDb } = require("../src/config/db");

let connectionPromise = null;

module.exports = async function handler(req, res) {
  if (!connectionPromise) {
    connectionPromise = connectDb().catch((error) => {
      connectionPromise = null;
      throw error;
    });
  }

  await connectionPromise;
  return app(req, res);
};
