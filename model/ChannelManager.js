import mongoose from "mongoose";
import { conn1 } from "../utils/db.js";
const { Schema, Types, model } = mongoose;

const channelManagerSchema = new mongoose.Schema(
  {
    hId: {
      type: Number,
      required: true,
      // unique: true,
    },
    channel_manager:{
      type: String,
    },
    cmcred: {
      type: Schema.Types.Map,
    },
    is_deleted:{
      type:Boolean,
      default:false
    }
  },
  {
    versionKey: false,
  }
);

const ChannelManagerSchema = conn1.model(
  "channel_manager",
  channelManagerSchema
);

export default ChannelManagerSchema;
