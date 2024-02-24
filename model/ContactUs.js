import mongoose from "mongoose";
import { conn1 } from "../utils/db.js";

const ContactUsSchema = new mongoose.Schema({
    email : {
        type: String,
        required: true
      },
      description : {
        type: String
      }
}, {timestamps : true});

const ContactUsModel = conn1.model('contactus', ContactUsSchema);

export default ContactUsModel;