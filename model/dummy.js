import mongoose from 'mongoose'
import { conn1 } from '../utils/db.js';
const rankingSchema = new mongoose.Schema({
  rank: Number,
  name: String,
  hotel_id: Number,
  otaPId:String,
  starCategory: Number,
  userRating: Number,
  numberOfRatings: Number,
  discountedPrice: Number
});

const RankingSchema = new mongoose.Schema({
  timestamp: String,
  otaId: Number,
  extractionCount : {type: Number, required: true},
  ranking: [rankingSchema],
  cityCode: String
});

const RankingSchemaModel = conn1.model('dummy', RankingSchema);

export default RankingSchemaModel;
