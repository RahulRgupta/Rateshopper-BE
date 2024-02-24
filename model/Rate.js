import mongoose, { Types, Model } from "mongoose";
import { conn1 } from "../utils/db.js";

const { Schema, model } = mongoose;
const otaRateSchema = new mongoose.Schema({
  roomID: { type: String, required: true },
  checkIn: { type: String, required: true },
  checkOut: { type: String, required: true },
  roomName: { type: String, required: true },
  roomPlan: { type: String, required: true },
  price: { type: Number, required: true },
});

const otaRatesSchema = new mongoose.Schema({
  // _id: { type: String, required: true },
  hId: { type: Number, required: true },
  //extractionCount : {type: Number, required: true},
  otaId: { type: Number, required: true },
  timestamp: { type: String, required: true },
  otaPId: { type: String, required: true },
  rates: [otaRateSchema],
});


const Rates = conn1.model("rate", otaRatesSchema);
export default Rates;
