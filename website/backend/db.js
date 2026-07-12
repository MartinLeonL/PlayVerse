const { MongoClient } = require("mongodb");

let database;

const client = new MongoClient(process.env.MONGODB_URI);

async function connectDB() {
  await client.connect();

  database = client.db(process.env.MONGODB_DB || "playverse");

  const users = database.collection("users");

  await users.createIndex({ email: 1 }, { unique: true });

  await users.createIndex(
    { googleId: 1 },
    {
      unique: true,
      sparse: true,
    },
  );

  console.log("Connected to MongoDB");
}

function getDB() {
  if (!database) {
    throw new Error("MongoDB has not been connected");
  }

  return database;
}

module.exports = {
  connectDB,
  getDB,
};
