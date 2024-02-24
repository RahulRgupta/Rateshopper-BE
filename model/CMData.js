import mongoose from 'mongoose';
import { conn1 } from '../utils/db.js';

const cmDataSchema = new mongoose.Schema({
  hotelName: {
    type: String,
  },
  res: {
    type: String
  },
  bookingDate: {
    type: String
  },
  guestName: {
    type: String
  },
  arrivalDate: {
    type: String
  },
  deptDate: {
    type: String
  },
  room: {
    typr: String
  },
  pax: {
    type: String
  },
  ADR: {
    type: Number
  },
  source: {
    type: String
  },
  totalCharges: {
    type: Number
  },
  noOfNights: {
    type: Number
  },
  lead: {
    type: Number
  },
  weekendsInvolved: {
    type: Number
  },
  dayType: {
    type: String
  },
  hotelCode: {
    type: String
  },
  isActive: {
    type: Boolean
  }

});

const cmDataModel = conn1.model('cmdata', cmDataSchema);

export default cmDataModel;



