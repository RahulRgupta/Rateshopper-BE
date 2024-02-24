import rateModel from "../model/Rate.js";
import propertySchemaModel from "../model/Property.js";
import {sendWhatsAppMessage,convertToCurrentDate, getTodaysDate} from '../middleware/custom.js'
import HotelNotification from '../model/HotelNotification.js'
import UserModel from "../model/User.js";



// POST API endpoint to check and save data
const jsonDataAdd = async (req, res) => {
  let message = '';
  try {
    // Extract data from the request body
    const { timestamp, otaId, hId, otaPId, rates } = req.body;

    // Check if the combination of timestamp, otaId, and hId is unique
    const existingRecord = await rateModel.findOne({ timestamp, otaId, hId })

    if (existingRecord) {
      return res.status(400).json({ error: 'Duplicate entry for timestamp, otaId, and hId' });
    }

    const propertiesData = await propertySchemaModel.findOne({hId:hId})
    //console.log(propertiesData)

      // Fetch userData from UserModel for all matching records
      const userData = await UserModel.find({ 'hotels.hId': hId }).select('mobileNumber');;
      console.log(userData);

    const compsetIds = propertiesData?.compsetIds;


    const totalCompetitors= compsetIds.length;

    let currDate = JSON.stringify(new Date(new Date())).split("T")[0].slice(1);

     
      const nextDate = new Date(currDate);
      nextDate.setDate(nextDate.getDate() - 7);
      const sevenDaysAgo = nextDate.toISOString().split("T")[0];

    // If not duplicate, save the data to the database
    const newRate = new rateModel({ timestamp, otaId, hId, otaPId, rates });
    await newRate.save();

    //Our data
    const ratesData = await rateModel.aggregate([
      {
        $match: {
          timestamp: currDate,
          hId:+req.body.hId
        },
      },
      { $unwind: { path: "$rates", preserveNullAndEmptyArrays: false } },
      {
        $match: {
          "rates.checkIn": currDate,
          
        },
      },
    
      {
        $group: {
          _id: {
            timestamp: "$timestamp",
            otaId: "$otaId",
            hId: "$hId",
            otaPId: "$otaPId",
          },
          minPrice: { $min: "$rates.price" },
          data: { $first: "$$ROOT" },
        },
      },
      {
        $lookup: {
          from: "otas", // Replace with the actual collection name for OTA
          localField: "_id.otaId",
          foreignField: "otaId", // Assuming _id is the field in OTA collection corresponding to otaId
          as: "otaDetails",
        },
      },
      {
        $unwind: "$otaDetails",
      },
      {
        $group: {
          _id: {
            timestamp: "$_id.timestamp",
            hId: "$_id.hId",
            otaPId: "$_id.otaPId",
            // otaName: "$otaDetails.otaName",
            // otaId: "$_id.otaId", 
          },
          totalPrice: { $sum: "$minPrice" },
          count: { $sum: 1 },
          otaDetails:{$addToSet:"$otaDetails"},
          otaPrices: { $push: "$minPrice" },
        },
      },
      {
        $unwind: "$otaPrices",
      },
      {
        $lookup: {
          from: "properties", // Replace with the actual collection name for OTA
          localField: "_id.hId",
          foreignField: "hId", // Assuming _id is the field in OTA collection corresponding to otaId
          as: "propertyDetails",
        },
      },
      {
        $project: {
          _id: 0,
          hId: "$_id.hId",
          timestamp: "$_id.timestamp",
          otaPId: "$_id.otaPId",
          price: "$otaPrices",
          hName: { $arrayElemAt: ["$propertyDetails.hName", 0] },
          count:1,
          totalPrice: 1,
          avgPrice: {
            $add: [
              { $divide: ["$totalPrice", "$count"] },
            ]
          },
          upperBound: {
            $add: [
              { $divide: ["$totalPrice", "$count"] },
              { $multiply: [{ $divide: ["$totalPrice", "$count"] }, 0.1] }
            ]
          },
          lowerBound: {
            $subtract: [
              { $divide: ["$totalPrice", "$count"] },
              { $multiply: [{ $divide: ["$totalPrice", "$count"] }, 0.1] }
            ]
          },
          parityStatus: {
            $cond: {
              if: {
                $and: [
                  { $gte: ["$otaPrices", { $subtract: [{ $divide: ["$totalPrice", "$count"] }, { $multiply: [{ $divide: ["$totalPrice", "$count"] }, 0.1] }] }] },
                  { $lte: ["$otaPrices", { $add: [{ $divide: ["$totalPrice", "$count"] }, { $multiply: [{ $divide: ["$totalPrice", "$count"] }, 0.1] }] }] },
                ],
              },
              then: "parity",
              else: "disparity",
            },
          },
        },
      },
          
    ]);

    console.log(ratesData)


const lastSevenDaysRate = await rateModel.aggregate([
  {
    $match: {
      timestamp: { $gte: sevenDaysAgo, $lt: currDate },
      hId: +req.body.hId,
      otaId:+req.body.otaId,
    },
  },
  { $unwind: { path: "$rates", preserveNullAndEmptyArrays: false } },
  {
    $match: {
      "rates.checkIn":currDate
    },
  },
 
  {
    $group: {
      _id: {
        timestamp: "$timestamp",
        otaId: "$otaId",
        hId: "$hId",
        otaPId: "$otaPId",
      },
      minPrice: { $min: "$rates.price" },
      checkIn: { $first: "$rates.checkIn" },
    },
  },
  {
    $project: {
      _id: 0,
      timestamp: "$_id.timestamp",
      otaId: "$_id.otaId",
      hId: "$_id.hId",
      otaPId: "$_id.otaPId",
      minPrice: 1,
      checkIn:1
    },
  },
]);

//console.log(lastSevenDaysRate);


    //compsetdata
    const compsetData = await rateModel.aggregate([
      {
        $match: {
          timestamp: currDate,
          hId:{$in:compsetIds}
        },
      },
      { $unwind: { path: "$rates", preserveNullAndEmptyArrays: true } },
      {
        $match: {
          "rates.checkIn": currDate,
          
        },
      },
      {
        $group: {
          _id: {
            timestamp: "$timestamp",
            otaId: "$otaId",
            hId: "$hId",
            otaPId: "$otaPId",
          },
          minPrice: { $min: "$rates.price" },
          checkIn: { $first: "$rates.checkIn" },

          data: { $first: "$$ROOT" },
        },
      },
        {
        $lookup: {
          from: "properties", // Replace with the actual collection name for OTA
          localField: "_id.hId",
          foreignField: "hId", // Assuming _id is the field in OTA collection corresponding to otaId
          as: "propertyDetails",
        },
      },
      {
        $project: {
          _id: "$data._id",
          timestamp: "$data.timestamp",
          otaId: "$data.otaId",
          hId: "$data.hId",
          hName: { $arrayElemAt: ["$propertyDetails.hName", 0] },
          otaPId: "$data.otaPId",
          price: "$minPrice",
          checkIn:"$checkIn"
        },
      },
    
    ]);



   // Map and modify the results
// const modifiedCompsetData = compsetData.map(entry => ({
//   otaId: entry.otaId,
//   timestamp: entry.timestamp,
//   hId: entry.hId,
//   checkIn: entry.checkIn !== currDate ? currDate : entry.checkIn,
//   price: entry.checkIn !== currDate ? null : entry.price,
// }));
// console.log(modifiedCompsetData)

    const yesterdayDate = new Date(currDate);
    //console.log(yesterdayDate);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const oneDayAgo = yesterdayDate.toISOString().split("T")[0];
     //yesterdaycompsetdata
     const yesterdaycompsetdata = await rateModel.aggregate([
      {
        $match: {
          timestamp: oneDayAgo,
          hId:{$in:compsetIds}
        },
      },
      { $unwind: { path: "$rates", preserveNullAndEmptyArrays: false } },
      {
        $match: {
          "rates.checkIn": currDate,
          
        },
      },
      {
        $group: {
          _id: {
            timestamp: "$timestamp",
            otaId: "$otaId",
            hId: "$hId",
            otaPId: "$otaPId",
          },
          minPrice: { $min: "$rates.price" },
          checkIn: { $first: "$rates.checkIn" },

          data: { $first: "$$ROOT" },
        },
      },
        {
        $lookup: {
          from: "properties", // Replace with the actual collection name for OTA
          localField: "_id.hId",
          foreignField: "hId", // Assuming _id is the field in OTA collection corresponding to otaId
          as: "propertyDetails",
        },
      },
      {
        $project: {
          _id: "$data._id",
          timestamp: "$data.timestamp",
          otaId: "$data.otaId",
          hId: "$data.hId",
          hName: { $arrayElemAt: ["$propertyDetails.hName", 0] },
          otaPId: "$data.otaPId",
          price: "$minPrice",
          checkIn:"$checkIn"
        },
      },
    
    ]);

  

// Check if our price is greater than compset data highest price
const sendHigherPriceMessage = ratesData.every((ourEntry) => {
  const compsetPrices = compsetData.map((compsetEntry) => compsetEntry.price);
  return compsetPrices.every((compsetPrice) => ourEntry.price > compsetPrice);
});

// Extract unique hName from ratesData
const uniqueHNames = [...new Set(ratesData.map((entry) => entry.hName))];
 

// Find the entry with the highest price in ratesData
const highestPriceEntry = ratesData.reduce((maxEntry, currentEntry) => {
  return currentEntry.price > maxEntry.price ? currentEntry : maxEntry;
}, ratesData[0]);

// Find the entry with the lowest price in ratesData
const lowestPriceEntry = ratesData.reduce((minEntry, currentEntry) => {
  return currentEntry.price < minEntry.price ? currentEntry : minEntry;
}, ratesData[0]);



// Check if our price is lower than compset data lowest price
const sendLowerPriceMessage = ratesData.every((ourEntry) => {
  const compsetPrices = compsetData.map((compsetEntry) => compsetEntry.price);
  return compsetPrices.every((compsetPrice) => ourEntry.price < compsetPrice);
});

// Count how many checkIn dates in compsetData match currDate
const matchingDatesCount = compsetData.filter((compsetEntry) => compsetEntry.checkIn === currDate).length;

// Count how many entries in ratesData have disparity
//const disparityCount = ratesData.filter((entry) => entry.parityStatus === 'disparity').length;

// Count how many entries in ratesData have disparity
const disparityData = ratesData.filter((entry) => entry.parityStatus === 'disparity');

// Extract otaName for entries with disparity
const disparityOtaNames = disparityData.map((entry) => entry.otaName);

const disparityCount = disparityData.length;


// Check if our data prices for today have changed compared to the minimum prices from the last seven days
const priceChangeMessage = ratesData.every((ourEntry) => {
  const matchingLastSevenDaysEntry = lastSevenDaysRate.find(
    (lastSevenDaysEntry) =>
     ourEntry.timestamp == lastSevenDaysEntry.checkIn &&
      ourEntry.hId === lastSevenDaysEntry.hId
  );

  return matchingLastSevenDaysEntry && ourEntry.price !== matchingLastSevenDaysEntry.minPrice;
});



// // Check if our price is greater than compset data highest price
// const sendHigherCompsetPriceMessage = compsetData.every((ourEntry) => {
//   const compsetPrices = yesterdaycompsetdata.map((compsetEntry) => compsetEntry.price);
//   return compsetPrices.every((compsetPrice) => ourEntry.price > compsetPrice);
// });

// // Check if our price is lower than compset data lowest price
// const sendLowerCompsetrPriceMessage = compsetData.every((ourEntry) => {
//   const compsetPrices = yesterdaycompsetdata.map((compsetEntry) => compsetEntry.price);
//   return compsetPrices.every((compsetPrice) => ourEntry.price < compsetPrice);
// });




const soldOutCount = totalCompetitors - matchingDatesCount
// Send WhatsApp message if needed
// Use map and Promise.all to send WhatsApp messages concurrently
let mobileNumbersLet = []
const messages = [];
userData.map(async (user) => {
  const userMobileNumber = user?.mobileNumber;
  mobileNumbersLet.push(userMobileNumber)
});

if (sendHigherPriceMessage) {
  const uniqueCompsetNames = [...new Set(compsetData.map((compsetEntry) => compsetEntry.hName))];
  messages.push(`Your hotel ${uniqueHNames} price is highest among your compset (${uniqueCompsetNames.join(', ')}) for today! Highest price: ${highestPriceEntry.price}. to know more visit https://pulse.retvenstechnologies.com`);
} else if (sendLowerPriceMessage) {
  const uniqueCompsetNames = [...new Set(compsetData.map((compsetEntry) => compsetEntry.hName))];
  messages.push(`Your hotel ${uniqueHNames} price is lowest among your compset (${uniqueCompsetNames.join(', ')}) for today! Your lowest price: ${lowestPriceEntry.price}. to know more visit https://pulse.retvenstechnologies.com`);
} else if (matchingDatesCount && soldOutCount > 0) {
  messages.push(`${soldOutCount} out of ${totalCompetitors} of your compset sold out today`);
} else if (disparityCount > 0) {
  messages.push(`You have disparity in ${disparityCount} OTA (${disparityOtaNames.join(', ')})`);
} else if (priceChangeMessage) {
  messages.push('Your price is changed');
}


console.log(mobileNumbersLet.join(','),messages,'hvvuvbry')
let userMobileNumber = mobileNumbersLet.join(',')
await sendWhatsAppMessage(messages,userMobileNumber)
// await sendWhatsAppMessage([userMobileNumber], messages);

console.log("smmmmmmmiiiiiiiiiiiiiiiiiiii")


  // Save messages in HotelNotificationModel
  const hotelNotification = await HotelNotification.findOne({ hId });
    
  if (!hotelNotification) {
    return res.status(200).json({message:"hId not found"})
  } else {
    //const { message: savedMessage } = await sendWhatsAppMessage(message);
    messages.map((msg) => hotelNotification.notification.unshift({
      type: 'push', // You can set the appropriate type
      message: msg,
      timestamps: new Date().toISOString(),
    }));
    await hotelNotification.save();
  
  }
  let update;
      
  const propertyhId = await propertySchemaModel.findOne({hId});
  if(propertyhId.hId==hId){
    if(propertyhId.isRetvens===true){
     const  update = await propertySchemaModel.findOneAndUpdate({hId :hId}, {$set:{isExtracting:false}},{new:true})
     //await update.save()
    }else{
      return res.status(200).json({
        message: "isRetvens field is does not exist",
        status: true,
        code: 200,
    });
    };;
  }


  const time = await propertySchemaModel.findOne({hId:hId})
  const originalDateString = time.extractionDate;
  
  const convertedDate = convertToCurrentDate(originalDateString);
  console.log(convertedDate);
  const updatetimestamprecord= await propertySchemaModel.findOneAndUpdate({ hId: hId },{$set:{ extractionDate :getTodaysDate()}});
  return res.status(201).json({ message: 'Data saved successfully',data:update });
  
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export default jsonDataAdd;
