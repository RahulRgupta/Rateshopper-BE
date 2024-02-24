import express from 'express'
import AdminModel from '../controller/Admin.js';
import {verifyJwt} from '../middleware/auth.js'
import biLogin from "../controller/switchToBi.js"
const router = express.Router();


router.post('/create_user',verifyJwt, AdminModel.AddUser);
router.post('/switchToBi',verifyJwt, biLogin);
router.get('/profile', verifyJwt,AdminModel.ProfileView);

router.post('/login', AdminModel.AdminLogin);
router.get('/user_list', verifyJwt,AdminModel.UserList);
router.get('/properties/:property_id?',verifyJwt,  AdminModel.getAllPropertiesforAdmin);
router.patch('/assign_property',verifyJwt, AdminModel.addUserIdByAdmin);

router.get('/city',verifyJwt,AdminModel.cityList);
router.get('/ota',verifyJwt, AdminModel.otaList);
router.patch('/status',verifyJwt, AdminModel.statusUpdate);
router.get('/getData',verifyJwt,AdminModel.getRoomDumpData)
router.post("/addRoomDetails",verifyJwt,AdminModel.addRoom)
router.get("/hotelNotification",verifyJwt,AdminModel.notification)
router.post("/getRates",verifyJwt,AdminModel.getRates)
router.get("/extractionCheck",verifyJwt,AdminModel.extraction)





export default router