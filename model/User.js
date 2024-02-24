import mongoose from "mongoose";
import { conn1 } from "../utils/db.js";

const userSchema = new mongoose.Schema({
    role: { type: String, enum: ["USER","ADMIN"], default: "USER" },
    user_status: { type: String, enum: ["ACTIVE", "INACTIVE", "DELETED"] },
    is_login: { type: Number },
    is_active: { type: Number, default: 1 },
    is_deleted: { type: Number, default: 0 },
    is_profile_completed: { type: Number, default: 0 },
    name: { type: String },
    email: { type: String },
    password: { type: String },
    created_at: { type: Date, default: new Date() },
    updated_at: { type: Date },
    added_by:{type:String,enum:["ADMIN","SELF"]},
    recent_property : {
      type : mongoose.Types.ObjectId,
      ref : "property"
    },
    hotels:[{
      hId:{type:Number},

    }],
    reason : {
      type : String
    },
    accountStatus:{
      type : String,
      default : ""
    },
    isMapping:{
      type:String,
      default:"false"
    },
    mobileNumber : {
      type : String,
      default : ""
    },
    notification:{
      whatsApp:{
        type: Boolean,
        default: "false"
      },
      email:{
        type: Boolean,
        default: "false"
      }
    }
  },

  { versionKey: false }
);

const User = conn1.model("user", userSchema);
export default User;
