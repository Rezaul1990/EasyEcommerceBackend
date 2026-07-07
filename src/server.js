const { app } = require("./app");
const { connectDb } = require("./config/db");
const { env } = require("./config/env");

async function start() {
  await connectDb();
  app.listen(env.port, () => {
    console.log(`EasyEcommerce API listening on http://localhost:${env.port}`);
  });
}

start().catch((err) => {
  console.error("Server startup failed", err);
  process.exit(1);
});
