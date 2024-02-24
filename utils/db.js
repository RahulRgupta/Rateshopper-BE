import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

const db_uri = process.env.DB_URI || "";

const conn1 = mongoose.createConnection(db_uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

if (conn1) {
  console.log("Connected to db1");
} else {
  console.log("Not connected");
}

export { conn1 };
