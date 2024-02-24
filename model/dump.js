import mongoose, { version } from "mongoose";
import  {conn1}  from "../utils/db.js";

const dumpData = mongoose.Schema({
    hId : {
        type : Number,
    },

    otaId : {
        type:Number,
    },

    hName : {
        type:String,
    },

    rooms : [{
        roomID : {
            type:Number
        },

        roomName:{
            type:String
        }
    }]
},
{ versionKey: false }
)

const dumpRoom = conn1.model("room_mapping_dump", dumpData);
export default dumpRoom;