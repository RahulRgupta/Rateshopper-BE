import express from 'express'
import ContactController from '../controller/ContactUs.js';
const router = express.Router();


router.post('/', ContactController.contactus);


export default router