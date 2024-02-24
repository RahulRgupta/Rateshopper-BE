import mongoose from 'mongoose';
import { conn1 } from '../utils/db.js';

const propertySchema = new mongoose.Schema({
  rCode: {
    type: String,
    default: '',
  },
  hCode: {
    type: String,
    default: '',
  },
  extractionDate: {
    type: String,
    default: '',
  },
  user_id :[{
    type : mongoose.Schema.Types.ObjectId,
    ref : "user"
  }],
  hId: {
    type: Number,
    required: true,
  },
  hName: {
    type: String,
    required: true,
  },
  isRetvens: {
    type: Boolean,
    required: false,
  },
  compsetIds: {
    type: [Number],
  },
  cityCode: {
    type: String
  },
  activeOta: {
    type: [{
      otaId: {
        type: Number,
        required: true,
      },
      otaPId: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
      },
    }],
    required: true,
  },
  isExtracting: {
    type: Boolean,
    default: false,
  },
});

const propertySchemaModel = conn1.model('property', propertySchema);

export default propertySchemaModel;

