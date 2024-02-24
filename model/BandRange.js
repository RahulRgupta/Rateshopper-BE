import mongoose from "mongoose";
import { conn1 } from "../utils/db.js";
const { Schema, Types, model } = mongoose;

const occupancyRuleSchema = new Schema({
  from: Number,
  to: Number,
  priceChange: Number,
  type:{ type: String, enum: ["PERCENTAGE", "AMOUNT"] },
  bandRangeType:{ type: String, enum: ["PERCENTAGE", "AMOUNT","VALUE"] },
  adjustPrice:{ type: String, enum: ["PLUS", "MINUS"] },
  adjustPrice: { type: String, enum: ["PLUS", "MINUS"] }
});

const weekendAndweekDaySchema = new Schema({
  day: { type: String },
  percentageValue: { type: String }
})

const compSetRuleSchema = new Schema({
  compSetId: Number,
  priceChange: Number,
  type: { type: String, enum: ["PERCENTAGE", "AMOUNT", ""] },
  adjustPrice: { type: String, enum: ["PLUS", "MINUS", ""] }
});

const bandSchema = new Schema({
  hotelId: Number,
  hotelCode: Number,
  occupancyRules: [occupancyRuleSchema],
  compSetRule: [compSetRuleSchema],
  weekdayAndWeekendRules: [weekendAndweekDaySchema]
},
  {
    versionKey: false
  });

const priceBandSchema = conn1.model("price_band", bandSchema);

export default priceBandSchema;
