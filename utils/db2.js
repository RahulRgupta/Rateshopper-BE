import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

const db_uri = process.env.DB_URI2 || "";

const conn = mongoose.createConnection(db_uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

if (conn) {
  console.log("Connected to db2");
} else {
  console.log("Not connected");
}

export { conn };
