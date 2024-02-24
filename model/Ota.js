import mongoose from "mongoose";
import { conn1 } from "../utils/db.js";

const otaSchema = new mongoose.Schema({
    otaId: { type: Number, required: true },
    otaName: { type: String, required: true },
    otaImage : { type: String, required: true }
});

const OtaSchemaModel = conn1.model('otas', otaSchema);

export default OtaSchemaModel;