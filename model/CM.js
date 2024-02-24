import mongoose from 'mongoose';
import { conn1 } from '../utils/db.js';

// Define the schema
const cmSchema = new mongoose.Schema({
  cmid: {
    type: Number
  },
  cmname: {
    type: String
  },
  cmcred: {
    type: [String]
  }
});

// Define the model
const CMModel = conn1.model('cm', cmSchema);

// Export the model
export default CMModel;
