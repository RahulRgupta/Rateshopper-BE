import mongoose from "mongoose";
import { conn1 } from "../utils/db.js";
const HotelNotificationModel = new mongoose.Schema({
    hId: {
        type: Number,
        default: 0
    },
    notification: [{
        type :{
            type: String,
            default: ""
        },
        message :{
            type: String,
            default: ""
        },
        timestamps: {
            type: String,
            default: ""
        }     
    }]
   
}, {
    versionKey: false
});

const HotelNotification = conn1.model('HotelNotification',HotelNotificationModel );

export default HotelNotification;