const { connectDb } = require("./config/db");
const { createOwnerFromEnv } = require("./services/authService");

async function run() {
  await connectDb();
  const result = await createOwnerFromEnv();
  console.log(result.created ? `Owner created: ${result.email}` : `Owner already exists: ${result.email}`);
  process.exit(0);
}

run().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
