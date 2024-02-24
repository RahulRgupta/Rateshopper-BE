import mongoose from 'mongoose';
import { conn1 } from '../utils/db.js';

const inventorySchema = new mongoose.Schema({
  roomName: {
    type: String,
    required: true,
  },
  inventory: {
    type: Number,
    required: true,
  },
});

const objectSchema = new mongoose.Schema({
  propertyCode: {
    type: String,
    required: true,
  },
  totalInventory: {
    type: Number,
    required: true,
  },
  granular: {
    type: [inventorySchema],
    required: true,
  },
});

const InventoryModel = conn1.model('inventory', objectSchema);

export default InventoryModel;
