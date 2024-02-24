import mongoose from "mongoose";
import { conn1 } from "../utils/db.js";

const propertyLinkSchema = new mongoose.Schema(
  {
    hId: {
      type: Number,
      required: true,
      unique: true,
    },
    ota_detail: [
      {
        ota_name: {
          type: String,
          required: true,
        },
        ota_link: {
          type: String,
          required: true,
        },

        competitor: [
          {
            name: {
              type: String,
            },
            link: {
              type: String,
            },
            compsetId:{
              type:Number
            }
          },
        ],

        is_extract: {
          type: Boolean,
          default: false,
        },
        is_primary: {
          type: Boolean,
        },
      },
    ],

    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },

    channel_manager_detail: {
      channel_manager: {
        type: String,
      },
      user_name: {
        type: String,
      },
      password: {
        type: String,
      },
      authentication_code: {
        type: String,
      },
    },

    created_at: {
      type: Date,
      default: Date.now(),
    },
    updated_at: {
      type: Date,
    },
    isCorrect:{
      type:String,
      default:"false",
    },
    },
  {
    versionKey: false,
  }
);

const propertyLinkSchemaModel = conn1.model(
  "propertyLink",
  propertyLinkSchema
);

export default propertyLinkSchemaModel;
