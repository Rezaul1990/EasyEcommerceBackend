const mongoose = require("mongoose");
const { env } = require("./env");

async function connectDb() {
  if (!env.mongoUri) {
    console.warn("MONGODB_URI is not configured. Database routes will return setup errors.");
    return null;
  }

  mongoose.set("strictQuery", true);
  await mongoose.connect(env.mongoUri);
  console.log("MongoDB connected");
  return mongoose.connection;
}

module.exports = { connectDb };
