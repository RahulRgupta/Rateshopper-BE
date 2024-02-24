import mongoose from "mongoose";
import { conn1 } from "../utils/db.js";


const OtaSchema = new mongoose.Schema({
  otaId: Number,
  roomID: Number
});

const CompsetRoomsSchema = new mongoose.Schema({
  compsetid: Number,
  compsetRId: Number
});

const ActiveRoomsSchema = new mongoose.Schema({
  RId: Number,
  roomName: String,
  ota: [OtaSchema],
  compsetRooms: [CompsetRoomsSchema]
});

const roomSchema = new mongoose.Schema({
  // _id: mongoose.Schema.Types.ObjectId,
  hId: Number,
  activeRooms: [ActiveRoomsSchema]
});

const roomSchemaModel = conn1.model("room", roomSchema);

export default roomSchemaModel;
