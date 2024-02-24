import express from 'express'
import multer from 'multer';
const router = express.Router()
import jsonhotelRankDataAdd from "../controller/hotelRankingJsonUpload.controller.js";
import jsonRateDataAdd from "../controller/rateJsonUpload.controller.js";
// Set up storage for multer
const storage = multer.memoryStorage(); // You can customize this to save the file to disk if needed
const upload = multer({ storage: storage });

// Define the route for file upload
//router.post('/uploadRankingJson', upload.single('file'), jsonhotelRankDataAdd);
router.post('/uploadRankingJson', jsonhotelRankDataAdd);
//router.post('/uploadRateJson', upload.single('file'), jsonRateDataAdd);
router.post('/uploadRateJson', jsonRateDataAdd);



//hjscj
export default router
