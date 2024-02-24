import mongoose from "mongoose";
import { conn } from "../utils/db2.js";
// const randomstring = require("randomstring");

const hotelSchema = new mongoose.Schema({
    hotelName:{
        type:String,
        default:"",
    },
    res:{
        type:Number,
        default:"",
    },
    hotelCode:{
        type:String,
    },
    bookingDate:{
        type:String,
        default:"",
    },
    arrivalDate:{
        type:String,
        default:"",
    
    },
    deptDate:{
        type:String,
        default:"",
    },
    Room:{
        type:String,
        default:"",
    },
    Pax:{
        type:String,
        default:"",
    },
    ADR:{
        type:Number,
        default:"",
    },
    source:{
        type:String,
        default:"",
    },
    Lead:{
        type:Number,
        default:"",
    },
    noOfNights:{
        type:Number,
        default:"",
    },
    totalCharges:{
        type:Number,
        default:"",
    },
    guestName:{
        type:String,
        default:"",
    },
    isActive:{
        type:String,
        default:"false"
    }

  });

const hotelRecord = conn.model("hotelrecord", hotelSchema)
export default hotelRecord