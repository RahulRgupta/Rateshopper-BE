import express from 'express'
import UserModel from '../controller/User.js';
import PPModel from '../controller/PricePrediction.js';
import {verifyJwt} from '../middleware/auth.js'
import { checkUserStaus } from '../middleware/statusCheck.js';
const router = express.Router();


router.post('/login', UserModel.UserLogin);
router.get('/profile',verifyJwt,checkUserStaus, UserModel.ProfileView);
router.get('/property_list', verifyJwt,checkUserStaus,UserModel.propertyListing);
router.patch('/switch_property', verifyJwt,checkUserStaus,UserModel.switchProperty);
router.get('/rooms_list', verifyJwt,checkUserStaus,UserModel.RoomListAccProperty);
router.post('/sign_up', UserModel.SignUp);
router.post('/property_link',UserModel.AddPropertyLink);
router.put('/property_link',verifyJwt,checkUserStaus,UserModel.editPropertyLink);

router.post("/forgot_password", UserModel.forgotPassword);
router.patch("/reset_password",verifyJwt,checkUserStaus, UserModel.resetPassword);
router.patch("/update_property_name",verifyJwt,checkUserStaus, UserModel.editPropertyName);
router.get("/competitior_list",verifyJwt,checkUserStaus, UserModel.competitorList);
router.put("/remove_competitor",verifyJwt,checkUserStaus, UserModel.removeCompset);
router.post("/add_competitor",verifyJwt,checkUserStaus, UserModel.addNewCompset);
router.get("/my_ota",verifyJwt,checkUserStaus, UserModel.fetchMyOta);
router.put("/add_new_competitor",verifyJwt,checkUserStaus, UserModel.addNewCompset);
router.patch("/add_new_competitor",verifyJwt,checkUserStaus, UserModel.addNewCompset);

router.post('/channel_manager',UserModel.AddChannelManager);
router.get('/channel_manager_detail',verifyJwt,checkUserStaus,UserModel.channelManagerDetail);
router.put('/channel_manager',verifyJwt,checkUserStaus,UserModel.editChannelManager);
router.patch('/channel_manager/:id',verifyJwt,checkUserStaus,UserModel.deleteChannelManager);
router.get('/property_link_view',verifyJwt,checkUserStaus,UserModel.propertyLinkView);

router.get('/cm',UserModel.getChannelManager);

// Price prediction routes

router.get("/pickUp",verifyJwt,PPModel.pickUp);

router.get('/last_7_days',verifyJwt, PPModel.Last7DaysPrice);

router.get('/next_7_days',verifyJwt, PPModel.Next7DaysPrice);

router.get('/last_5_days_revenue',verifyJwt, PPModel.Last5Days);

router.get('/pricepridictionroomwise',verifyJwt, PPModel.PricePridictionRoomWise);

router.get('/occupany_data',verifyJwt, PPModel.OccupancyData);

router.post('/band_price',verifyJwt, PPModel.AddPriceBand);

router.get('/band_price',verifyJwt, PPModel.getPriceBand);

router.get('/base_price',verifyJwt, PPModel.getBasePrice);

router.post("/savebi",UserModel.bidata)

router.get("/getmobileNumber",verifyJwt,checkUserStaus,UserModel.getmobileNumber)

router.patch("/patchmobileNumber",verifyJwt,checkUserStaus,UserModel.patchmobileNumber)



export default router