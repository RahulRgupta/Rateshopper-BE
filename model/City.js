import mongoose from "mongoose";
import { conn1 } from "../utils/db.js";

const citySchema = new mongoose.Schema({
  cityCode: { type: String, required: true },
  Name: { type: String, required: true },
  Country: { type: String, required: true },
});

const CitySchemaModel = conn1.model('City', citySchema);

export default CitySchemaModel;