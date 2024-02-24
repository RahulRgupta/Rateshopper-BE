import mongoose from "mongoose";
import { conn1 } from "../utils/db.js";

const reputationModel = new mongoose.Schema({
  hId: { type: Number, required: true },
  hCode:{type:String,default:"" },
  otaId: { type: Number, required: true },
  otaPId: { type: String, default: "" },
  timestamp: { type: String, default: "" },
  reputation: [
    {
      ratingCount: {
        type: Number,
        default: "",
      },
      totalRatingCount: {
        type: Number,
        default: "",
      },
      totalReviews:{
        type: Number,
        default: "",
      }
    },
  ],
},{
    versionKey:false
});

const reputationSchema = conn1.model("reputation", reputationModel);
export default reputationSchema;
