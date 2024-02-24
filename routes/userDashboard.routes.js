import express from 'express'
import DashboardModel from "../controller/UserDashboard.js"
import { verifyJwt } from '../middleware/auth.js';
import { checkUserStaus } from '../middleware/statusCheck.js';

const router = express.Router();

router.get('/hotel_rank', verifyJwt, checkUserStaus, DashboardModel.getHotelRankingData);
router.get('/price_trend_otawise', verifyJwt, checkUserStaus, DashboardModel.PriceTrendOtaWise);
router.get('/price_trend_roomwise', verifyJwt, checkUserStaus, DashboardModel.PriceTrendRoomWise);
router.get('/rate_parity_trend', verifyJwt, checkUserStaus, DashboardModel.RateParityTrend);
router.get('/rate_parity', verifyJwt, checkUserStaus, DashboardModel.RateParity);
router.get('/calender', verifyJwt, checkUserStaus, DashboardModel.Calendar);
router.get('/parity_check', verifyJwt, checkUserStaus, DashboardModel.ParityCheck);
router.get('/parity_check_ourhotel', verifyJwt, checkUserStaus, DashboardModel.ParityCheckNew);
router.get('/getExtractionDate', verifyJwt, DashboardModel.getExtractionDate);
// JWT is not intergrated yet
router.get('/fluction_viewer', verifyJwt, DashboardModel.fluctionViewer);
router.get('/fluction_trend', verifyJwt, DashboardModel.fluctionTrend);
router.get('/fluctionTrendMinRate', verifyJwt, DashboardModel.fluctionTrendByMinRate);
router.get('/visiblity_trend_otawise', verifyJwt, checkUserStaus, DashboardModel.VisiblityTrendOtaWise)
router.get('/visiblity_trend_compsetwise', verifyJwt, checkUserStaus, DashboardModel.VisiblityTrendCompSet)
// router.get("/newCalender",DashboardModel.newCalender)

router.get('/hotel_parity', verifyJwt, checkUserStaus, DashboardModel.hotelParityOtaWise)
router.get('/dayparity', DashboardModel.DayParity)

router.get('/hotel_fluctuation', verifyJwt, checkUserStaus, DashboardModel.hotelFluctuation)
router.get('/rank', DashboardModel.getHotelRank);
// NEW ROOM LIST API
router.get('/roomlist', DashboardModel.getHotelRoomList);
router.get('/roomlist_hotel', DashboardModel.RoomList);

router.get('/fluctuationOta', DashboardModel.otaFluctuation);

// get today rates
router.get('/getrates', verifyJwt, DashboardModel.rates);
router.get('/getHotelOtaRate', verifyJwt, DashboardModel.getHotelOtaRate);
router.get('/last7DaysDataAnalysis', verifyJwt, DashboardModel.last7DaysDataAnalysis);

// reputation
router.get('/getReputation', verifyJwt, DashboardModel.getReputation);
router.post('/postReputation', verifyJwt, DashboardModel.postReputation);

// Room Mapping api
router.get('/checkRoomMap', verifyJwt, DashboardModel.checkRoomMap);
router.get('/getRoomMap', verifyJwt, DashboardModel.getRoomMapping);
router.get('/getExtractionDate', verifyJwt, DashboardModel.getExtractionDate);

router.get('/compsetRoomRate', verifyJwt, DashboardModel.getCompsetRoomRate);
router.get('/compsetRoomMapping', verifyJwt, DashboardModel.getCompsetRoomMapping);
router.patch('/changePrimaryOTA', verifyJwt, DashboardModel.changePrimaryOTA);

export default router
