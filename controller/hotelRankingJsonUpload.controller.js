// import hotelRankingModel from "../model/HotelRanking.js";
// const jsonDataAdd = async (req, res) => {

//     try {
//         // Check if a file is uploaded
//         if (!req.file) {
//             return res.status(400).json({ message: 'No file uploaded.' });
//         }

//         // Convert buffer to string
//         const fileContent = req.file.buffer.toString('utf-8');
//         const data = JSON.parse(fileContent);

//         // console.log(data)
//         await hotelRankingModel.create(data)
//         // console.log('data successfully imported')
//         return res.status(200).json({ message: "Data successfully uploaded" })
//     } catch (error) {
//         console.log(error);
//         return res.status(500).json({ message: "Internal Server Error" });
//     }

// }

// export default jsonDataAdd;

import hotelRankingModel from "../model/HotelRanking.js";
import propertySchemaModel from "../model/Property.js";

// POST API endpoint to check and save data
const jsonDataAdd = async (req, res) => {

  const newRankings = req.body.newRankings; // Assuming you get newRankings from the request body

  if (newRankings.length === 0) {
    return res.status(400).json({ message: "newRankings array cannot be empty" });
  }

  // Create an array of update operations for each newRanking
  const updateOperations = newRankings.map(({ timestamp, otaId, cityCode, extractionCount, ranking }) => ({
    updateOne: {
      filter: { timestamp, otaId, cityCode },
      update: { timestamp, otaId, cityCode, extractionCount, ranking },
      upsert: true, // Creates a new document if no match is found
    },
  }));

  try {
    // Use bulkWrite to perform multiple updateOne operations with upsert: true
    const result = await hotelRankingModel.bulkWrite(updateOperations, { ordered: false });

    // Extract the number of documents inserted
    const insertedCount = result.upsertedCount;
    // console.log('insertedCount: ', insertedCount);
    let dupCount = newRankings?.length - insertedCount;
    // console.log('dupCount: ', dupCount);
    // console.log(newRankings.length);


    let currDate = JSON.stringify(new Date(new Date("2024-03-20"))).split("T")[0].slice(1);

  // Fetch propertyData for all unique cityCodes in newRankings
  const uniqueCityCodes = [...new Set(newRankings.map(item => item.cityCode))];
  const propertyData = await propertySchemaModel.find({ cityCode: { $in: uniqueCityCodes }, "isRetvens": true });

    //our rankng
    const rankdata = await hotelRankingModel.aggregate([
      {
        $match: {
          timestamp: currDate,
          otaId:+req.body.otaId,
          cityCode:+req.body.cityCode
        },
      },
      { $unwind: { path: "$ranking", preserveNullAndEmptyArrays: false } },
      {
        $match: {
          "rates.checkIn": currDate,
          
        },
      },
    ])
    var response;
    if (newRankings.length === dupCount) {
      response = {
        success: false,
        message: 'All entries are duplicates',
        duplicateCount: dupCount,
        insertedCount,
      };
    } else {
      response = {
        success: true,
        message: 'Data uploaded successfully',
        duplicateCount: dupCount,
        insertedCount,
      };
    }

    return res.status(201).json(response);
  } catch (error) {
    console.log(error)
    return res.status(500).json({ error: 'Internal server error' });
  }

}
// // Check if the combination of timestamp, otaId, and cityCode is unique
// const existingRecord = await hotelRankingModel.findOne({ timestamp, otaId, cityCode });

// if (existingRecord) {
//   return res.status(400).json({ error: 'Duplicate entry for timestamp, otaId, and cityCode' });
// }

// // If not duplicate, save the data to the database
// const newRanking = new hotelRankingModel({ timestamp, otaId, extractionCount, ranking, cityCode });
// await newRanking.save();

export default jsonDataAdd;