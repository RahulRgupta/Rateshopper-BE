import ErrorHandler from "../utils/errorHandler.js";
import RankingSchemaModel from "../model/HotelRanking.js";
import Rates from "../model/Rate.js";
import OtaSchemaModel from "../model/Ota.js";
import Roomdump from "../model/dump.js"
import { getDaysArray, calcPc } from "../middleware/custom.js";
import propertySchemaModel from "../model/Property.js";
import RoomSchemaModel from "./../model/Room.js";
import propertyLinkModel from "../model/PropertyLink.js"
import reputationSchema from "../model/reputation.js";
//import propertyLinkModel from "../model/PropertyLink.js"

class DashboardModel {
  static async getHotelRankingData(req, res, next) {
    try {
      let startDate = JSON.stringify(
        new Date(req.propertyData?.extractionDate || new Date())
      )
        .split("T")[0]
        .slice(1);
      let previousDate = JSON.stringify(
        new Date(
          new Date(startDate).setUTCHours(0, 0, 0, 0) - 24 * 60 * 60 * 999.99
        )
      )
        .split("T")[0]
        .slice(1);
      const otPIds = req.query.otaPId.map((e) => e);
      const otaIds = req.query.otaId.map((e) => +e);

      let result = [];
      for (let i = 0; i < otPIds.length; i++) {
        let pipeline = [
          {
            $match: {
              $and: [
                {
                  timestamp: {
                    $in: [startDate, previousDate],
                  },
                },
                {
                  cityCode: req.query.cityCode,
                },
                {
                  otaId: otaIds[i],
                },
              ],
            },
          },
          {
            $lookup: {
              from: "otas",
              localField: "otaId",
              foreignField: "otaId",
              as: "ota",
            },
          },
          { $unwind: { path: "$ota", preserveNullAndEmptyArrays: false } },
          {
            $unwind: { path: "$ranking", preserveNullAndEmptyArrays: false },
          },
          {
            $match: {
              "ranking.otaPId": otPIds[i],
            },
          },
          {
            $group: {
              _id: "$otaId",
              otaName: { $first: "$ota.otaName" },
              otaImage: { $first: "$ota.otaImage" },
              ranking: {
                $push: {
                  timestamp: "$timestamp",
                  rank: "$ranking.rank",
                  otaPId: "$ranking.otaPId",
                },
              },
            },
          },
        ];
        let rank = await RankingSchemaModel.aggregate(pipeline);
        if (rank.length === 0) {
          const rateCurrentDay = await Rates.aggregate([
            {
              $match: {
                otaId: otaIds[i],
              },
            },
            {
              $match: {
                otaPId: otPIds[i],
              },
            },
            {
              $match: {
                timestamp: startDate,
              },
            },
            {
              $unwind: {
                path: "$rates",
                preserveNullAndEmptyArrays: false,
              },
            },
            {
              $match: {
                "rates.checkIn": startDate,
              },
            },
          ]);
          const ratePrevDay = await Rates.aggregate([
            {
              $match: {
                otaId: otaIds[i],
              },
            },
            {
              $match: {
                otaPId: otPIds[i],
              },
            },
            {
              $match: {
                timestamp: previousDate,
              },
            },
            {
              $unwind: {
                path: "$rates",
                preserveNullAndEmptyArrays: false,
              },
            },
            {
              $match: {
                "rates.checkIn": previousDate,
              },
            },
          ]);
          const otaDetail = await OtaSchemaModel.findOne({ otaId: otaIds[i] });
          let res = {
            _id: otaIds[i],
            otaName: otaDetail.otaName,
            otaImage: otaDetail.otaImage,
            ranking: [],
          };
          if (rateCurrentDay.length !== 0) {
            res.ranking.push({
              timestamp: startDate,
              rank: 110,
              otaPId: otPIds[i],
            });
          } else {
            res.ranking.push({
              timestamp: startDate,
              rank: 0,
              otaPId: otPIds[i],
            });
          }
          if (ratePrevDay.length !== 0) {
            res.ranking.push({
              timestamp: previousDate,
              rank: 110,
              otaPId: otPIds[i],
            });
          } else {
            res.ranking.push({
              timestamp: previousDate,
              rank: 0,
              otaPId: otPIds[i],
            });
          }
          result.push(res);
        } else {
          if (rank[0].ranking.length === 1) {
            const isTodayRanking = rank[0].ranking[0].timestamp === startDate;

            if (isTodayRanking) {
              const ratePrevDay = await Rates.aggregate([
                {
                  $match: {
                    otaPId: otPIds[i],
                  },
                },
                {
                  $match: {
                    otaId: otaIds[i],
                  },
                },
                {
                  $match: {
                    timestamp: previousDate,
                  },
                },
                {
                  $unwind: {
                    path: "$rates",
                    preserveNullAndEmptyArrays: false,
                  },
                },
                {
                  $match: {
                    "rates.checkIn": previousDate,
                  },
                },
              ]);
              if (ratePrevDay.length !== 0) {
                rank[0].ranking.push({
                  timestamp: previousDate,
                  rank: 110,
                  otaPId: otPIds[i],
                });
              } else {
                rank[0].ranking.push({
                  timestamp: previousDate,
                  rank: 0,
                  otaPId: otPIds[i],
                });
              }
            } else {
              const rateCurrentDay = await Rates.aggregate([
                {
                  $match: {
                    otaPId: otPIds[i],
                  },
                },
                {
                  $match: {
                    otaId: otaIds[i],
                  },
                },
                {
                  $match: {
                    timestamp: startDate,
                  },
                },
                {
                  $unwind: {
                    path: "$rates",
                    preserveNullAndEmptyArrays: false,
                  },
                },
                {
                  $match: {
                    "rates.checkIn": startDate,
                  },
                },
              ]);
              if (rateCurrentDay.length !== 0) {
                rank[0].ranking.unshift({
                  timestamp: startDate,
                  rank: 110,
                  otaPId: otPIds[i],
                });
              } else {
                rank[0].ranking.unshift({
                  timestamp: startDate,
                  rank: 0,
                  otaPId: otPIds[i],
                });
              }
            }
            result.push(rank[0]);
          } else {
            result.push(rank[0]);
          }
        }
      }


      res.status(200).json({
        status: true,
        code: 200,
        message: "Data Fetched Successfully",
        data: result,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }

  static async PriceTrendOtaWise(req, res, next) {
    function isValidDateFormat(dateString) {
      // Regular expression for the flexible date format
      var dateFormat = /^\d{4}-(0?[1-9]|1[0-2])-(0?[1-9]|[1-2]\d|3[0-1])$/;

      // Check if the input string matches the format
      return dateFormat.test(dateString);
    }
    function convertToStandardFormat(dateString) {
      // Split the input date string into year, month, and day
      var parts = dateString.split("-");

      // Ensure the month and day have leading zeros if necessary
      var year = parts[0];
      var month = parts[1].padStart(2, "0"); // Add leading zero if needed
      var day = parts[2].padStart(2, "0"); // Add leading zero if needed

      // Return the formatted date
      return year + "-" + month + "-" + day;
    }
    try {
      let startDate = req.query.startDate;
      if (isValidDateFormat(startDate)) {
        startDate = convertToStandardFormat(startDate);

      } else {
        startDate = JSON.stringify(
          new Date(req.propertyData?.extractionDate || new Date())
        )
          .split("T")[0]
          .slice(1);
      }

      let nextDate;
      if (req.query.type === "WEEKLY") {
        nextDate = JSON.stringify(
          new Date(
            new Date(startDate).setUTCHours(0, 0, 0, 0) +
            7 * 24 * 60 * 60 * 999.99
          )
        )
          .split("T")[0]
          .slice(1);
      } else if (req.query.type === "MONTHLY") {
        nextDate = JSON.stringify(
          new Date(
            new Date(startDate).setUTCHours(0, 0, 0, 0) +
            30 * 24 * 60 * 60 * 999.99
          )
        )
          .split("T")[0]
          .slice(1);
        // console.log(nextDate)
      } else if (req.query.type === "15DAYS") {
        nextDate = JSON.stringify(
          new Date(
            new Date(startDate).setUTCHours(0, 0, 0, 0) +
            15 * 24 * 60 * 60 * 999.99
          )
        )
          .split("T")[0]
          .slice(1);
      } else if (req.query.type === "QUATRLY") {
        nextDate = JSON.stringify(
          new Date(
            new Date(startDate).setUTCHours(0, 0, 0, 0) +
            15 * 24 * 60 * 60 * 999.99
          )
        )
          .split("T")[0]
          .slice(1);
      }

      let id = req.query.hIds.map((e) => {
        return +e;
      });

      let pipeline = [
        {
          $match: {
            $and: [
              {
                otaId: +req.query.otaId,
              },
              {
                hId: { $in: id },
              },
              {
                timestamp: startDate,
              },
            ],
          },
        },
        {
          $lookup: {
            from: "properties",
            localField: "hId",
            foreignField: "hId",
            as: "property",
          },
        },
        { $unwind: { path: "$property", preserveNullAndEmptyArrays: false } },
        {
          $unwind: { path: "$rates", preserveNullAndEmptyArrays: false },
        },
        {
          $match: {
            $and: [
              {
                "rates.checkIn": { $gte: startDate },
              },
              {
                "rates.checkIn": { $lte: nextDate },
              },
            ],
          },
        },
        {
          $group: {
            _id: "$hId",
            rates: { $push: "$rates" },
            property_name: { $first: "$property.hName" },
          },
        },
      ];

      const data = await Rates.aggregate(pipeline);

      let daysArray = await getDaysArray(startDate, nextDate);
      const minPriceDataArray = await Promise.all(
        daysArray.map(async (val) => {
          const minPriceData = await Promise.all(
            data.map(async (value) => {
              let obj = {
                hId: value._id,
                date: val,
                hName: value.property_name,
              };
              obj.price = value.rates
                .filter((AA) => {
                  return AA.checkIn == val;
                })
                .sort((a, b) => {
                  return b - a.price;
                })[0]?.price;

              return obj;
            })
          );
          // Sort the inner array based on hId in ascending order
          minPriceData.sort((a, b) => a.hId - b.hId);

          return minPriceData;
        })
      );

      // Use Promise.all to ensure order preservation
      const organizedDataArray = await Promise.all(minPriceDataArray);

      // Sort the final array based on date
      organizedDataArray.sort((a, b) => a[0]?.date.localeCompare(b[0]?.date));

      return res.status(200).json({
        status: true,
        code: 200,
        message: "Data Fetched Successfully",
        data: organizedDataArray,
      });
    } catch (error) {
      console.log(error)
      return next(new ErrorHandler(error.message, 500));
    }
  }

  static async RateParityTrend1(req, res, next) {
    try {
      let startDate = JSON.stringify(
        new Date(
          req.query.startDate !== null && req.query.startDate !== "null" && req.query.startDate != undefined
            ? req.query.startDate
            : req.propertyData?.extractionDate || new Date()
        )
      )
        .split("T")[0]
        .slice(1);
      let nextDate;
      if (req.query.type === "WEEKLY") {
        nextDate = JSON.stringify(
          new Date(
            new Date(startDate).setUTCHours(0, 0, 0, 0) -
            7 * 24 * 60 * 60 * 999.99
          )
        )
          .split("T")[0]
          .slice(1);
      } else if (req.query.type === "15DAYS") {
        nextDate = JSON.stringify(
          new Date(
            new Date(startDate).setUTCHours(0, 0, 0, 0) -
            15 * 24 * 60 * 60 * 999.99
          )
        )
          .split("T")[0]
          .slice(1);
      } else if (req.query.type === "MONTHLY") {
        nextDate = JSON.stringify(
          new Date(
            new Date(startDate).setUTCHours(0, 0, 0, 0) -
            30 * 24 * 60 * 60 * 999.99
          )
        )
          .split("T")[0]
          .slice(1);
      } else if (req.query.type === "QUATRLY") {
        nextDate = JSON.stringify(
          new Date(
            new Date(startDate).setUTCHours(0, 0, 0, 0) -
            90 * 24 * 60 * 60 * 999.99
          )
        )
          .split("T")[0]
          .slice(1);
      }

      let pipeline = [
        {
          $match: {
            $and: [
              {
                hId: +req.query.hId,
              },
              {
                timestamp: { $lte: startDate },
              },
              {
                timestamp: { $gte: nextDate },
              },
            ],
          },
        },
        {
          $lookup: {
            from: "otas",
            localField: "otaId",
            foreignField: "otaId",
            as: "ota",
          },
        },
        { $unwind: { path: "$ota", preserveNullAndEmptyArrays: false } },
        {
          $lookup: {
            from: "properties",
            localField: "hId",
            foreignField: "hId",
            as: "property",
          },
        },
        { $unwind: { path: "$property", preserveNullAndEmptyArrays: false } },
        {
          $unwind: { path: "$rates", preserveNullAndEmptyArrays: false },
        },
        {
          $match: {
            $and: [
              {
                "rates.checkIn": { $lte: startDate },
              },
              {
                "rates.checkIn": { $gte: nextDate },
              },
            ],
          },
        },
      ];

      if (req.query.roomType) {
        let roomName = req.query.roomType.replaceAll("_", " ");
        pipeline.push({
          $match: {
            "rates.roomName": roomName,
          },
        });
      }

      pipeline.push({
        $group: {
          _id: "$otaId",
          timestamp: { $first: "$timestamp" },
          otaId: { $first: "$otaId" },
          hId: { $first: "$hId" },
          rates: { $push: "$rates" },
          property_name: { $first: "$property.hName" },
          ota_name: { $first: "$ota.otaName" },
          ota_image: { $first: "$ota.otaImage" },
        },
      });

      const data = await Rates.aggregate(pipeline);

      let daysArray = await getDaysArray(nextDate, startDate);

      let arr = [];
      let filteredData = await Promise.all(
        daysArray.map((val) => {
          let minPriceData = data.map((value) => {
            let obj = {
              otaId: value.otaId,
              date: val,
              hName: value.property_name,
              otaName: value.ota_name,
              otaImage: value.ota_image,
            };
            obj.price = value.rates
              .filter((AA) => {
                return AA.checkIn == val;
              })
              .sort((a, b) => {
                return b - a.price;
              })[0]?.price;
            return obj;
          });
          minPriceData.sort((a, b) => a.otaId - b.otaId);
          return minPriceData;
        })
      );

      return res.status(200).json({
        status: true,
        code: 200,
        message: "Data Fetched Successfully",
        data: filteredData,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }

  static async RateParityTrend(req, res, next) {
    try {
      const typeMap = { WEEKLY: 7, MONTHLY: 30, "15DAYS": 15, QUATRLY: 90 };
      const type = typeMap[req.query.type] || 7;
      const propertyDetails = await propertySchemaModel.findOne({
        hId: +req.query.hId,
      });
      const activeOtas = propertyDetails.activeOta;
      const startDate = JSON.stringify(
        new Date(req.propertyData?.extractionDate || new Date())
      )
        .split("T")[0]
        .slice(1);
      const prevDate = JSON.stringify(
        new Date(
          new Date(startDate).setUTCHours(0, 0, 0, 0) -
          type * 24 * 60 * 60 * 999.99
        )
      )
        .split("T")[0]
        .slice(1);
      const daysArray = await getDaysArray(prevDate, startDate);

      const data = await Promise.all(
        daysArray.map(async (date) => {
          const res = await Promise.all(
            activeOtas.map(async (ota) => {
              const rate = await Rates.aggregate([
                {
                  $match: {
                    hId: +req.query.hId,
                    otaId: ota.otaId,
                    otaPId: ota.otaPId,
                    timestamp: date,
                  },
                },
                {
                  $unwind: {
                    path: "$rates",
                    preserveNullAndEmptyArrays: false,
                  },
                },
                {
                  $match: {
                    "rates.checkIn": date,
                  },
                },
                {
                  $lookup: {
                    from: "otas",
                    localField: "otaId",
                    foreignField: "otaId",
                    as: "ota",
                  },
                },
                {
                  $unwind: { path: "$ota", preserveNullAndEmptyArrays: false },
                },
                {
                  $group: {
                    _id: "$_id",
                    date: { $first: "$timestamp" },
                    otaId: { $first: "$otaId" },
                    rates: { $push: "$rates" },
                    ota: { $first: "$ota.otaName" },
                    otaImage: { $first: "$ota.otaImage" },
                  },
                },
                {
                  $project: {
                    _id: 0,
                    date: 1,
                    otaId: 1,
                    price: { $min: "$rates.price" },
                    otaName: "$ota",
                    otaImage: "$otaImage",
                  },
                },
              ]);
              if (rate.length > 0) {
                return rate[0];
              } else {
                const otaDetail = await OtaSchemaModel.findOne({
                  otaId: ota.otaId,
                });
                return {
                  date: date,
                  price: 0,
                  otaId: ota.otaId,
                  otaName: otaDetail.otaName,
                  otaImage: otaDetail.otaImage,
                };
              }
            })
          );
          return res;
        })
      );

      return res.status(200).json({
        status: true,
        code: 200,
        message: "Data Fetched Successfully",
        data: data,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }

  static async RateParity(req, res, next) {
    try {
      let startDate = JSON.stringify(
        new Date(
          req.query.startDate !== null && req.query.startDate !== "null" && req.query.startDate != undefined
            ? req.query.startDate
            : req.propertyData?.extractionDate || new Date()
        )
      )
        .split("T")[0]
        .slice(1);
      let nextDate;
      if (req.query.type === "WEEKLY") {
        nextDate = JSON.stringify(
          new Date(
            new Date(startDate).setUTCHours(0, 0, 0, 0) +
            7 * 24 * 60 * 60 * 999.99
          )
        )
          .split("T")[0]
          .slice(1);
      } else if (req.query.type === "15DAYS") {
        nextDate = JSON.stringify(
          new Date(
            new Date(startDate).setUTCHours(0, 0, 0, 0) +
            15 * 24 * 60 * 60 * 999.99
          )
        )
          .split("T")[0]
          .slice(1);
      } else if (req.query.type === "MONTHLY") {
        nextDate = JSON.stringify(
          new Date(
            new Date(startDate).setUTCHours(0, 0, 0, 0) +
            30 * 24 * 60 * 60 * 999.99
          )
        )
          .split("T")[0]
          .slice(1);

      }

      let pipeline = [
        {
          $match: {
            $and: [
              {
                hId: +req.query.hId,
              },
              {
                timestamp: req.propertyData?.extractionDate,
              },
            ],
          },
        },
        {
          $lookup: {
            from: "otas",
            localField: "otaId",
            foreignField: "otaId",
            as: "ota",
          },
        },
        { $unwind: { path: "$ota", preserveNullAndEmptyArrays: false } },
        {
          $lookup: {
            from: "properties",
            localField: "hId",
            foreignField: "hId",
            as: "property",
          },
        },
        { $unwind: { path: "$property", preserveNullAndEmptyArrays: false } },
        {
          $unwind: { path: "$rates", preserveNullAndEmptyArrays: false },
        },
        {
          $match: {
            $and: [
              {
                "rates.checkIn": { $gte: startDate },
              },
              {
                "rates.checkIn": { $lte: nextDate },
              },
            ],
          },
        },
      ];

      pipeline.push(
        {
          $group: {
            _id: "$_id",
            otaId: { $first: "$otaId" },
            hId: { $first: "$hId" },
            rates: { $push: "$rates" },
            property_name: { $first: "$property.hName" },
            ota_name: { $first: "$ota.otaName" },
          },
        },
        {
          $sort: {
            _id: -1,
          },
        }
      );

      const data = await Rates.aggregate(pipeline);
      let daysArray = await getDaysArray(startDate, nextDate);
      daysArray = await Promise.all(
        daysArray.map((val) => {
          let minPriceData = data.map((value) => {
            let obj = {
              otaId: value.otaId,
              date: val,
              hName: value.property_name,
              otaName: value.ota_name,
            };
            obj.price = value.rates
              .filter((AA) => {
                return AA.checkIn == val;
              })
              .sort((a, b) => {
                return b - a.price;
              })[0]?.price;
            return obj;
          });
          return minPriceData;
        })
      );

      let baseOta = +req?.query?.otaId || 1;
      await Promise.all(
        daysArray.map(async (e) => {
          let basePrice = 0;
          if (!baseOta) {
            if (e.length % 2 === 0) {
              basePrice =
                (e[e.length / 2 - 1]?.price + e[e.length / 2]?.price) / 2;
            } else {
              basePrice = e[e.length / 2 - 0.5]?.price;
            }
          }
          await Promise.all(
            e.map(async (el) => {
              if (el.otaId && el.otaId === baseOta) {
                basePrice = el.price;
              }
              el.parity = await calcPc(basePrice, el.price);
            })
          );
          return e;
        })
      );

      return res.status(200).json({
        status: true,
        code: 200,
        message: "Data Fetched Successfully",
        data: daysArray,
      });
    } catch (error) {
      console.log(error, "eroerieur");
      return res.status(500).json({
        status: true,
        code: 500,
        message: "Data Fetched Successfully",
        data: error.message,
      });
    }
  }

  static async ParityCheck(req, res, next) {
    try {
      let startDate = JSON.stringify(
        new Date(req.propertyData?.extractionDate || new Date())
      )
        .split("T")[0]
        .slice(1);

      let nextDate = JSON.stringify(new Date(new Date(startDate).setUTCHours(0, 0, 0, 0) +
        7 * 24 * 60 * 60 * 999.99
      )
      )
        .split("T")[0]
        .slice(1);

      let pipeline = [
        {
          $match: {
            $and: [
              {
                hId: +req.query.hId,
              },
              {
                timestamp: startDate,
              },
            ],
          },
        },
        {
          $lookup: {
            from: "otas",
            localField: "otaId",
            foreignField: "otaId",
            as: "ota",
          },
        },
        { $unwind: { path: "$ota", preserveNullAndEmptyArrays: false } },

        {
          $unwind: { path: "$rates", preserveNullAndEmptyArrays: false },
        },
        // {
        //   $match: {
        //     "rates.checkIn": { $eq: startDate },
        //   },
        // },
        {
          $match: {
            $and: [
              {
                "rates.checkIn": { $gte: startDate },
              },
              {
                "rates.checkIn": { $lte: nextDate },
              },
            ],
          },
        },
      ];

      pipeline.push(
        {
          $group: {
            _id: { checkIn: "$rates.checkIn", otaId: "$otaId" },
            price: { $min: "$rates.price" },
          },
        },
        {
          $project: {
            timestamp: "$_id.checkIn",
            otaId: "$_id.otaId",
            _id: 0,
            price: 1,
          },
        },
        {
          $group: {
            _id: "$timestamp",
            items: { $push: "$$ROOT" },
          },
        },
        {
          $sort: {
            _id: 1,
          },
        }
      );

      const data = await Rates.aggregate(pipeline);

      await Promise.all(
        data.map((e) => {
          let sortedItems = e.items.sort((a, b) => {
            return b.price - a.price;
          });
          let basePrice = 0;
          if (sortedItems.length % 2 === 0) {
            basePrice =
              (sortedItems[sortedItems.length / 2 - 1].price +
                sortedItems[sortedItems.length / 2].price) /
              2;
          } else {
            basePrice = sortedItems[sortedItems.length / 2 - 0.5].price;
          }
          e.items.map(async (el) => {
            el.parity = await calcPc(basePrice, el.price);

            if (el.parity <= 10 && el.parity >= -10) {
              el.variation = false;
            } else {
              el.variation = true;
            }
          });
        })
      );

      return res.status(200).json({
        status: true,
        code: 200,
        message: "Data Fetched Successfully",
        data: data,
      });
    } catch (error) {
      return res.status(500).json({
        status: true,
        code: 500,
        message: "Data Fetched Successfully",
        data: error.message,
      });
    }
  }

  static async Calendar1(req, res, next) {
    try {
      let rIds = [];
      if (req.query.RId !== "null" && req.query.RId) {
        const roomDetails = await RoomSchemaModel.findOne({
          hId: req.query.hId,
        });

        const activeOtasRId = roomDetails.activeRooms.find((r) => {
          if (r.RId === +req.query.RId) {
            return r.ota;
          }
        });

        rIds = activeOtasRId.ota.map((e) => {
          if (req.query.otaId != "null" && req.query.otaId) {
            if (e.otaId === +req.query.otaId) {
              return +e.roomID;
            }
          } else {
            return +e.roomID;
          }
        });
      }

      if (!req.query.date) {
        return res.status(422).json({
          status: false,
          code: 422,
          message: "Please select date",
        });
      }

      let startDate = JSON.stringify(new Date(req.query.date))
        .split("T")[0]
        .slice(1);
      let nextDate = JSON.stringify(
        new Date(
          new Date().setUTCHours(0, 0, 0, 0) + 11 * 24 * 60 * 60 * 999.99
        )
      )
        .split("T")[0]
        .slice(1);

      let pipeline = [
        {
          $match: {
            $and: [
              {
                hId: +req.query.hId,
              },
              {
                timestamp: req.query.date,
              },
            ],
          },
        },
        {
          $lookup: {
            from: "otas",
            localField: "otaId",
            foreignField: "otaId",
            as: "ota",
          },
        },
        { $unwind: { path: "$ota", preserveNullAndEmptyArrays: false } },
        {
          $unwind: { path: "$rates", preserveNullAndEmptyArrays: false },
        },
        {
          $match: {
            $and: [
              {
                "rates.checkIn": { $gte: startDate },
              },
              {
                "rates.checkIn": { $lte: nextDate },
              },
            ],
          },
        },
      ];

      if (req.query.rates !== "null" && req.query.rates) {
        pipeline.push({
          $match: {
            "rates.roomPlan": req.query.rates,
          },
        });
      }

      if (req.query.RId !== "null" && req.query.RId) {
        // let roomName = req.query.roomType.replaceAll("_", " ");

        pipeline.push({
          $match: {
            "rates.roomID": {
              $in: rIds,
            },
          },
        });
      }
      pipeline.push({
        $group: {
          _id: "$_id",
          otaId: { $first: "$otaId" },
          hId: { $first: "$hId" },
          rates: { $push: "$rates" },
          ota_name: { $first: "$ota.otaName" },
        },
      });

      if (req.query.otaId !== "null" && req.query.otaId) {
        pipeline.unshift({
          $match: {
            otaId: +req.query.otaId,
          },
        });
      }

      const data = await Rates.aggregate(pipeline);
      let daysArray = await getDaysArray(startDate, nextDate);

      let modifiedDaysArray = [];

      for (const val of daysArray) {
        let minPriceData = data.map((value) => {
          let obj = {
            otaId: value.otaId,
            date: val,
            otaName: value.ota_name,
          };
          obj.price = value.rates.filter((AA) => {
            return AA.checkIn == val;
          });

          return obj;
        });

        modifiedDaysArray.push(...minPriceData);
      }

      if (
        req.query.otaId === "null" ||
        req.query.rates === "null" ||
        req.query.roomType === "null"
      ) {
        return res.status(200).json({
          status: true,
          code: 200,
          message: "Data Fetched Successfully",
          data: modifiedDaysArray,
        });
      } else {
        let filteredArray = modifiedDaysArray.filter((obj) => {
          if (req.query.otaId && obj.otaId !== +req.query.otaId) {
            return false;
          }
          return true;
        });

        return res.status(200).json({
          status: true,
          code: 200,
          message: "Data Fetched Successfully",
          data: filteredArray,
        });
      }
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        status: false,
        code: 500,
        message: "Error occurred",
        error: error.message,
      });
    }
  }

  static async Calendar(req, res, next) {
    try {
      let rIds = [];
      if (req.query.RId !== "null" && req.query.RId) {
        const roomDetails = await RoomSchemaModel.findOne({
          hId: req.query.hId,
        });

        const activeOtasRId = roomDetails.activeRooms.find((r) => {
          if (r.RId === +req.query.RId) {
            return r.ota;
          }
        });

        rIds = activeOtasRId.ota.map((e) => {
          if (req.query.otaId != "null" && req.query.otaId) {
            if (e.otaId === +req.query.otaId) {
              return +e.roomID;
            }
          } else {
            return +e.roomID;
          }
        });
      }

      if (!req.query.date) {
        return res.status(422).json({
          status: false,
          code: 422,
          message: "Please select date",
        });
      }

      let asOnDate;
      let startDate;
      let nextDate;

      asOnDate = new Date(
        req.query.asOnDate !== null && req.query.asOnDate !== "null" && req.query.asOnDate != undefined
          ? req.query.asOnDate
          : req.propertyData?.extractionDate || new Date()
      );
      startDate = new Date(
        req.query.date !== null && req.query.date !== "null" && req.query.date != undefined
          ? req.query.date
          : req.propertyData?.extractionDate || new Date()
      );
      asOnDate = JSON.stringify(asOnDate).split("T")[0].slice(1);
      startDate = JSON.stringify(startDate).split("T")[0].slice(1);
      nextDate = JSON.stringify(
        new Date(new Date(startDate).setUTCHours(0, 0, 0, 0) + 11 * 24 * 60 * 60 * 999.99)
      ).split("T")[0].slice(1);
      // if (req.query.date && new Date(req.query.date) <= new Date(req.propertyData?.extractionDate) && req.query.startDate !== null && req.query.startDate !== "null" && req.query.startDate != undefined) {
      //   // If req.query.date is equal to or less than req.propertyData?.extractionDate
      //   startDate = JSON.stringify(new Date(req.query.date)).split("T")[0].slice(1);
      //   nextDate = JSON.stringify(
      //     new Date(new Date(startDate).setUTCHours(0, 0, 0, 0) + 11 * 24 * 60 * 60 * 999.99)
      //   ).split("T")[0].slice(1);
      // } else {
      //   // If req.query.date is greater than req.propertyData?.extractionDate
      //   startDate = JSON.stringify(new Date(req.propertyData?.extractionDate)).split("T")[0].slice(1);
      //   nextDate = JSON.stringify(
      //     new Date(new Date(startDate).setUTCHours(0, 0, 0, 0) + 11 * 24 * 60 * 60 * 999.99)
      //   ).split("T")[0].slice(1);
      // }



      if (startDate < asOnDate) {
        return res.status(400).json({ message: "startDate  cannot be less than asOnDate date", statuscode: 400 });
      }

      let pipeline = [
        {
          $match: {
            $and: [
              {
                hId: +req.query.hId,
              },
              {
                timestamp: {
                  $eq: asOnDate,
                },
              },

            ],
          },
        },
        {
          $lookup: {
            from: "otas",
            localField: "otaId",
            foreignField: "otaId",
            as: "ota",
          },
        },
        { $unwind: { path: "$ota", preserveNullAndEmptyArrays: false } },
        {
          $unwind: { path: "$rates", preserveNullAndEmptyArrays: false },
        },
        {
          $match: {
            $and: [
              {
                "rates.checkIn": { $gte: startDate },
              },
              {
                "rates.checkIn": { $lte: nextDate },
              },
            ],
          },
        },
      ];

      if (req.query.rates !== "null" && req.query.rates) {
        pipeline.push({
          $match: {
            "rates.roomPlan": req.query.rates,
          },
        });
      }
      if (req.query.RId !== "null" && req.query.RId) {
        // let roomName = req.query.roomType.replaceAll("_", " ");

        pipeline.push({
          $match: {
            "rates.roomID": {
              $in: rIds,
              $min: price,
            },
          },
        });
      }
      pipeline.push({
        $group: {
          _id: "$_id",
          otaId: { $first: "$otaId" },
          hId: { $first: "$hId" },
          rates: { $push: "$rates" },
          ota_name: { $first: "$ota.otaName" },
        },
      });

      if (req.query.otaId !== "null" && req.query.otaId) {
        pipeline.unshift({
          $match: {
            otaId: +req.query.otaId,
          },
        });
      }

      const data = await Rates.aggregate(pipeline);
      let daysArray = await getDaysArray(startDate, nextDate);

      let modifiedDaysArray = [];

      for (const val of daysArray) {
        let minPriceData = data.map((value) => {
          let obj = {
            otaId: value.otaId,
            date: val,
            otaName: value.ota_name,
          };

          // Filter prices for the specific date
          let pricesForDate = value.rates.filter((AA) => {
            return AA.checkIn == val;
          });

          // Find the minimum price for each roomID
          let minPrices = {};
          pricesForDate.forEach((price) => {
            if (!minPrices[price.roomID] || price.price < minPrices[price.roomID].price) {
              minPrices[price.roomID] = {
                roomID: price.roomID,
                checkIn: price.checkIn,
                checkOut: price.checkOut,
                roomName: price.roomName,
                roomPlan: price.roomPlan,
                price: price.price,
              };
            }
          });

          // Convert minPrices object to an array and add it to the obj
          obj.price = Object.values(minPrices);

          return obj;
        });

        modifiedDaysArray.push(...minPriceData);
      }

      // modifiedDaysArray now contains the minimum price for each roomID on each date


      if (
        req.query.otaId === "null" ||
        req.query.rates === "null" ||
        req.query.roomType === "null"
      ) {
        return res.status(200).json({
          status: true,
          code: 200,
          message: "Data Fetched Successfully",
          data: modifiedDaysArray,
        });
      } else {
        let filteredArray = modifiedDaysArray.filter((obj) => {
          if (req.query.otaId && obj.otaId !== +req.query.otaId) {
            return false;
          }
          return true;
        });

        return res.status(200).json({
          status: true,
          code: 200,
          message: "Data Fetched Successfully",
          data: filteredArray,
        });
      }
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        status: false,
        code: 500,
        message: "Error occurred",
        error: error.message,
      });
    }
  }

  static async PriceTrendRoomWise(req, res, next) {
    try {

      const today = new Date(
        req.query.startDate !== null && req.query.startDate !== "null" && req.query.startDate != undefined
          ? req.query.startDate
          : req.propertyData?.extractionDate || new Date()
      );
      today.setUTCHours(0, 0, 0, 0);
      const startDate = today.toISOString().split("T")[0];
      const pevDate = new Date(today - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      let pipeline1 = [
        {
          $match: {
            $and: [
              {
                otaId: +req.query.otaId,
              },
              {
                hId: +req.query.hId,
              },
            ],
          },
        },
        {
          $match: {
            $and: [
              {
                timestamp: { $lte: startDate },
              },
              {
                timestamp: { $gte: pevDate },
              },
            ],
          },
        },
        {
          $unwind: { path: "$rates", preserveNullAndEmptyArrays: false },
        },
        {
          $match: {
            $and: [
              {
                "rates.checkIn": { $lte: startDate },
              },
              {
                "rates.checkIn": { $gte: pevDate },
              },
            ],
          },
        },
        {
          $group: {
            _id: "$rates.roomID",
            rate: { $first: "$rates" },
            basePrice: { $avg: "$rates.price" },
          },
        },
      ];

      const data1 = await Rates.aggregate(pipeline1);

      const typeMap = { WEEKLY: 7, MONTHLY: 30, "15DAYS": 15, QUATRLY: 90 };
      const type = typeMap[req.query.type] || 7;

      let dates = Array.from({ length: type }, (_, i) => {
        return JSON.stringify(
          new Date(
            new Date(
              req.query.startDate !== null && req.query.startDate !== "null" && req.query.startDate != undefined
                ? req.query.startDate
                : req.propertyData?.extractionDate || new Date()
            ).setUTCHours(0, 0, 0, 0) +
            (i + 1) * 24 * 60 * 60 * 999.99
          )
        )
          .split("T")[0]
          .slice(1);
      });

      let result = await Promise.all(
        dates.map(async (nextDate) => {
          let pipeline = [
            {
              $match: {
                $and: [
                  {
                    otaId: +req.query.otaId,
                  },
                  {
                    hId: +req.query.hId,
                  },
                ],
              },
            },
            {
              $match: {
                timestamp: startDate,
              },
            },
            {
              $unwind: { path: "$rates", preserveNullAndEmptyArrays: false },
            },
            {
              $match: {
                "rates.checkIn": nextDate,
              },
            },
            {
              $group: {
                _id: "$rates.roomID",
                minRate: { $min: "$rates.price" },
              },
            },
            {
              $project: {
                roomId: "$_id",
                minRate: 1,
                _id: 0,
              },
            },
          ];
          const data = await Rates.aggregate(pipeline);
          let res = [];
          data1.forEach((room) => {
            let minRateObj = data.find(
              (rate) => rate.roomId === room.rate.roomID
            );
            let variation;
            if (minRateObj) {
              variation =
                ((minRateObj.minRate - room.rate.price) / minRateObj.minRate) *
                100;
            } else {
              variation = 0;
            }
            res.push({
              timestamp: nextDate,
              roomId: room.rate.roomID,
              baseRate: room.rate.price,
              variation: variation.toFixed(2),
              roomRate: minRateObj?.minRate || null,
              roomName: room.rate.roomName,
            });
          });
          return res;
        })
      );

      return res.status(200).json({
        status: true,
        code: 200,
        message: "Data Fetched Successfully",
        data: result,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }

  static async fluctionViewer(req, res, next) {
    try {
      const typeMap = { WEEKLY: 7, MONTHLY: 30, "15DAYS": 15, QUATRLY: 90 };
      const type = typeMap[req.query.type] || 7;
      let result = [];
      let promises = Array.from({ length: 10 }, async (_, i) => {
        let startDate = JSON.stringify(
          new Date(
            new Date(
              req.propertyData?.extractionDate || new Date()
            ).setUTCHours(0, 0, 0, 0) -
            i * 24 * 60 * 60 * 999.99
          )
        )
          .split("T")[0]
          .slice(1);

        let prevDate = JSON.stringify(
          new Date(
            new Date(startDate).setUTCHours(0, 0, 0, 0) -
            type * 24 * 60 * 60 * 999.99
          )
        )
          .split("T")[0]
          .slice(1);
        let pipeline = [];

        if (!req.query.otaId || !req.query.otaPId) {
          return res.status(402).json({
            status: true,
            code: 402,
            message: "otaPId or otaId in missing in query",
          });
        }

        pipeline.push({
          $match: {
            $and: [
              {
                otaId: +req.query.otaId,
              },
              {
                otaPId: req.query.otaPId,
              },
            ],
          },
        });

        pipeline.push({
          $match: {
            timestamp: { $in: [startDate, prevDate] },
          },
        });

        pipeline.push({
          $unwind: { path: "$rates", preserveNullAndEmptyArrays: false },
        });

        pipeline.push({
          $match: {
            "rates.checkIn": startDate,
          },
        });

        if (req.query.roomName) {
          let roomName = req.query.roomName.replaceAll("_", " ");
          pipeline.push({
            $match: {
              "rates.roomName": roomName,
            },
          });
        }

        if (!req.query.roomPlan) {
          return res.status(402).json({
            status: true,
            code: 402,
            message: "roomPlan in missing in query",
          });
        }

        pipeline.push({
          $match: {
            "rates.roomPlan": req.query.roomPlan,
          },
        });

        pipeline.push(
          {
            $group: {
              _id: "$_id",
              timestamp: { $first: "$timestamp" },
              rates: { $first: "$rates" },
            },
          },
          {
            $sort: {
              timestamp: 1,
            },
          }
        );

        const data = await Rates.aggregate(pipeline);

        if (data.length === 0) {
          result.unshift({
            timestamp: startDate,
            price: [0, 0],
          });
        } else if (data.length === 1) {
          if (data[0].timestamp === startDate) {
            result.unshift({
              timestamp: startDate,
              price: [data[0].rates.price, 0],
            });
          } else {
            result.unshift({
              timestamp: startDate,
              price: [0, data[0].rates.price],
            });
          }
        } else {
          result.unshift({
            timestamp: startDate,
            price: [data[0].rates.price, data[1].rates.price],
          });
        }
      });

      Promise.all(promises).then(() => {
        return res.status(200).json({
          status: true,
          code: 200,
          message: "Data Fetched Successfully",
          data: [...result].sort(
            (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
          ),
        });
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }

  // static async VisiblityTrendOtaWise(req, res, next) {
  //   try {
  //     const startDate = req.query.startDate;

  //     const typeMap = { WEEKLY: 7, MONTHLY: 30, "15DAYS": 15, QUATRLY: 90 };
  //     const type = typeMap[req.query.type] || 7;

  //     let result = [];
  //     for (let i = type; i >= 0; i--) {
  //       let pipeline = [];
  //       let currentDate = JSON.stringify(
  //         new Date(
  //           new Date(
  //             startDate != undefined
  //               ? startDate
  //               : req.propertyData?.extractionDate || new Date()
  //           ).setUTCHours(0, 0, 0, 0) -
  //             i * 24 * 60 * 60 * 999.99
  //         )
  //       )
  //         .split("T")[0]
  //         .slice(1);

  //       pipeline.push({
  //         $match: {
  //           cityCode: req.query.cityCode,
  //         },
  //       });

  //       pipeline.push({
  //         $match: {
  //           timestamp: currentDate,
  //         },
  //       });

  //       pipeline.push({
  //         $unwind: { path: "$ranking", preserveNullAndEmptyArrays: false },
  //       });

  //       pipeline.push(
  //         {
  //           $lookup: {
  //             from: "otas",
  //             localField: "otaId",
  //             foreignField: "otaId",
  //             as: "ota",
  //           },
  //         },
  //         { $unwind: { path: "$ota", preserveNullAndEmptyArrays: false } }
  //       );

  //       let data = [];
  //       const otaIds = req.query.otaId.map((e) => +e);
  //       for (let j = 0; j < req.query.otaPIds.length; j++) {
  //         pipeline.push({
  //           $match: {
  //             otaId: otaIds[j],
  //           },
  //         });
  //         pipeline.push({
  //           $match: {
  //             "ranking.otaPId": req.query.otaPIds[j],
  //           },
  //         });
  //         const d = await RankingSchemaModel.aggregate(pipeline);
  //         pipeline.pop();
  //         pipeline.pop();

  //         if (d.length !== 0) {
  //           d[0].isSold = false;
  //           data.push(d[0]);
  //         } else {
  //           let npipeline = [];
  //           npipeline.push({
  //             $match: {
  //               timestamp: currentDate,
  //             },
  //           });
  //           npipeline.push({
  //             $match: {
  //               otaId: otaIds[j],
  //             },
  //           });

  //           npipeline.push({
  //             $match: {
  //               otaPId: req.query.otaPIds[j],
  //             },
  //           });

  //           npipeline.push(
  //             {
  //               $lookup: {
  //                 from: "otas",
  //                 localField: "otaId",
  //                 foreignField: "otaId",
  //                 as: "ota",
  //               },
  //             },
  //             { $unwind: { path: "$ota", preserveNullAndEmptyArrays: false } }
  //           );

  //           npipeline.push({
  //             $unwind: {
  //               path: "$rates",
  //               preserveNullAndEmptyArrays: false,
  //             },
  //           });

  //           npipeline.push({
  //             $match: {
  //               "rates.checkIn": currentDate,
  //             },
  //           });

  //           const isflag = await Rates.aggregate(npipeline);

  //           if (isflag.length !== 0) {
  //             data.push({
  //               timestamp: currentDate,
  //               otaId: otaIds[j],
  //               isSold: false,
  //               cityCode: req.query.cityCode,
  //               ranking: {
  //                 rank: 110,
  //                 otaPId: req.query.otaPIds[j],
  //               },
  //               ota: isflag[0].ota,
  //             });
  //           } else {
  //             let otaData = await OtaSchemaModel.findOne({ otaId: otaIds[j] });
  //             data.push({
  //               timestamp: currentDate,
  //               cityCode: req.query.cityCode,
  //               otaId: otaIds[j],
  //               isSold: true,
  //               ranking: {
  //                 rank: 0,
  //                 otaPId: req.query.otaPIds[j],
  //               },
  //               ota: otaData,
  //             });
  //           }
  //         }
  //       }

  //       result.push(data);
  //     }

  //     return res.status(200).json({
  //       status: true,
  //       code: 200,
  //       message: "Data Fetched Successfully",
  //       data: result,
  //     });
  //   } catch (error) {
  //     console.log(error);
  //     return next(new ErrorHandler(error.message, 500));
  //   }
  // }


  static async VisiblityTrendOtaWise(req, res, next) {
    try {
      let startDate = req.query.startDate

      if (req.query.startDate !== null && req.query.startDate !== "null" && req.query.startDate != undefined) {

      } else {
        startDate = req.propertyData?.extractionDate || new Date()
      }

      const typeMap = { WEEKLY: 7, MONTHLY: 30, "15DAYS": 15, QUATRLY: 90 };
      const type = typeMap[req.query.type] || 7;

      let result = [];
      for (let i = type; i > 0; i--) {
        let pipeline = [];
        let currentDate = JSON.stringify(
          new Date(
            new Date(
              startDate != undefined ? startDate : (req.propertyData?.extractionDate || new Date())
            ).setUTCHours(0, 0, 0, 0) -
            (i - 1) * 24 * 60 * 60 * 999.99
          )
        )
          .split("T")[0]
          .slice(1);

        pipeline.push({
          $match: {
            cityCode: req.query.cityCode,
          },
        });

        pipeline.push({
          $match: {
            timestamp: currentDate,
          },
        });

        pipeline.push({
          $unwind: { path: "$ranking", preserveNullAndEmptyArrays: false },
        });

        pipeline.push(
          {
            $lookup: {
              from: "otas",
              localField: "otaId",
              foreignField: "otaId",
              as: "ota",
            },
          },
          { $unwind: { path: "$ota", preserveNullAndEmptyArrays: false } }
        );

        let data = [];
        const otaIds = req.query.otaId.map((e) => +e);
        for (let j = 0; j < req.query.otaPIds.length; j++) {
          pipeline.push({
            $match: {
              otaId: otaIds[j],
            },
          });
          pipeline.push({
            $match: {
              "ranking.otaPId": req.query.otaPIds[j],
            },
          });
          const d = await RankingSchemaModel.aggregate(pipeline);
          pipeline.pop();
          pipeline.pop();

          if (d.length !== 0) {
            d[0].isSold = false;
            data.push(d[0]);
          } else {
            let npipeline = [] ;
            npipeline.push({
              $match: {
                timestamp: currentDate,
              },
            });
            npipeline.push({
              $match: {
                otaId: otaIds[j],
              },
            });

            npipeline.push({
              $match: {
                otaPId: req.query.otaPIds[j],
              },
            });

            npipeline.push(
              {
                $lookup: {
                  from: "otas",
                  localField: "otaId",
                  foreignField: "otaId",
                  as: "ota",
                },
              },
              { $unwind: { path: "$ota", preserveNullAndEmptyArrays: false } }
            );

            npipeline.push({
              $unwind: {
                path: "$rates",
                preserveNullAndEmptyArrays: false,
              },
            });

            npipeline.push({
              $match: {
                "rates.checkIn": currentDate,
              },
            });

            const isflag = await Rates.aggregate(npipeline);

            if (isflag.length !== 0) {
              data.push({
                timestamp: currentDate,
                otaId: otaIds[j],
                isSold: false,
                cityCode: req.query.cityCode,
                ranking: {
                  rank: 110,
                  otaPId: req.query.otaPIds[j],
                },
                ota: isflag[0].ota,
              });
            } else {
              let otaData = await OtaSchemaModel.findOne({ otaId: otaIds[j] });
              data.push({
                timestamp: currentDate,
                cityCode: req.query.cityCode,
                otaId: otaIds[j],
                isSold: true,
                ranking: {
                  rank: 0,
                  otaPId: req.query.otaPIds[j],
                },
                ota: otaData,
              });
            }
          }
        }

        result.push(data);
      }

      return res.status(200).json({
        status: true,
        code: 200,
        message: "Data Fetched Successfully",
        data: result,
      });
    } catch (error) {
      console.log(error);
      return next(new ErrorHandler(error.message, 500));
    }
  }


  static async VisiblityTrendCompSet(req, res, next) {
    try {
      const startDate = req.query.startDate;
      const typeMap = { WEEKLY: 7, MONTHLY: 30, "15DAYS": 15, QUATRLY: 90 };
      const type = typeMap[req.query.type] || 7;

      let result = [];

      for (let i = type; i > 0; i--) {
        let pipeline = [];

        pipeline.push({
          $match: {
            cityCode: req.query.cityCode,
          },
        });

        let currentDate = JSON.stringify(
          new Date(
            new Date(
              req.query.startDate !== null && req.query.startDate !== "null" && req.query.startDate != undefined
                ? startDate
                : req.propertyData?.extractionDate || new Date()
            ).setUTCHours(0, 0, 0, 0) -
            (i - 1) * 24 * 60 * 60 * 999.99
          )
        )
          .split("T")[0]
          .slice(1);
        pipeline.push({
          $match: {
            timestamp: currentDate,
          },
        });

        pipeline.push({
          $match: {
            otaId: +req.query.otaId,
          },
        });

        pipeline.push({
          $unwind: { path: "$ranking", preserveNullAndEmptyArrays: false },
        });

        pipeline.push({
          $lookup: {
            from: "properties",
            localField: "ranking.otaPId",
            foreignField: "activeOta.otaPId",
            as: "hotel",
          },
        });
        let data = [];
        // console.log("This is Satyam ", req.query.compSetIds.length);
        for (let j = 0; j < req.query.compSetIds.length; j++) {
          pipeline.push({
            $match: {
              "ranking.otaPId": req.query.compSetIds[j],
            },
          });
          pipeline.push({
            $project: {
              timestamp: 1,
              otaId: 1,
              cityCode: 1,
              ranking: 1,
              hName: { $arrayElemAt: ["$hotel.hName", 0] },
            },
          });
          const d = await RankingSchemaModel.aggregate(pipeline);
          pipeline.pop();
          pipeline.pop();
          if (d.length != 0) {
            d[0].isSold = false;
            data.push(d[0]);
          } else {
            let npipeline = [];
            npipeline.push({
              $match: {
                timestamp: currentDate,
              },
            });

            npipeline.push({
              $match: {
                otaPId: req.query.compSetIds[j],
              },
            });

            npipeline.push({
              $match: {
                otaId: +req.query.otaId,
              },
            });

            npipeline.push(
              {
                $lookup: {
                  from: "properties",
                  localField: "hId",
                  foreignField: "hId",
                  as: "hotel",
                },
              },
              { $unwind: { path: "$hotel", preserveNullAndEmptyArrays: false } }
            );

            npipeline.push({
              $unwind: {
                path: "$rates",
                preserveNullAndEmptyArrays: false,
              },
            });

            npipeline.push({
              $match: {
                "rates.checkIn": currentDate,
              },
            });

            const isflag = await Rates.aggregate(npipeline);



            if (isflag.length > 0) {
              data.push({
                timestamp: currentDate,
                isSold: false,
                cityCode: req.query.cityCode,
                ranking: {
                  rank: 110,
                  otaPId: req.query.compSetIds[j],
                },
                hName: isflag[0].hotel.hName,
              });
            } else {
              let p = [
                {
                  $unwind: "$activeOta",
                },
                {
                  $match: {
                    "activeOta.otaPId": req.query.compSetIds[j],
                  },
                },
              ];
              let otaData = await propertySchemaModel.aggregate(p);
              data.push({
                timestamp: currentDate,
                cityCode: req.query.cityCode,
                isSold: true,
                ranking: {
                  rank: 0,
                  otaPId: req.query.compSetIds[j],
                },
                hName: otaData[0].hName,
              });
            }
          }
        }

        result.push(data);
      }

      return res.status(200).json({
        status: true,
        code: 200,
        message: "Data Fetched Successfully",
        data: result,
      });
    } catch (error) {
      console.log(error);
      return next(new ErrorHandler(error.message, 500));
    }
  }

  static async hotelFluctuation(req, res, next) {
    try {
      let currentDate = JSON.stringify(
        new Date(req.propertyData?.extractionDate || new Date())
      )
        .split("T")[0]
        .slice(1);
      let previousDate = JSON.stringify(
        new Date(
          new Date(currentDate).setUTCHours(0, 0, 0, 0) -
          1 * 24 * 60 * 60 * 999.99
        )
      )
        .split("T")[0]
        .slice(1);

      let pipeline = [];

      pipeline.push({
        $match: {
          hId: +req.query.hId,
        },
      });

      pipeline.push({
        $match: {
          $and: [
            {
              timestamp: {
                $in: [currentDate],
              },
            },
            {
              cityCode: req.query.cityCode,
            },
          ],
        },
      });

      pipeline.push(
        {
          $lookup: {
            from: "otas",
            localField: "otaId",
            foreignField: "otaId",
            as: "ota",
          },
        },
        { $unwind: { path: "$ota", preserveNullAndEmptyArrays: false } }
      );

      pipeline.push({
        $unwind: {
          path: "$rates",
          preserveNullAndEmptyArrays: false,
        },
      });

      pipeline.push({
        $match: {
          "rates.checkIn": currentDate,
        },
      });

      pipeline.push({
        $group: {
          _id: "$otaId",
          ota: { $first: "$ota" },
          items: { $push: "$$ROOT" },
        },
      });
      pipeline.push({
        $project: {
          _id: 1,
          ota: 1,
          minPrice: { $min: "$items.rates.price" },
        },
      });
      pipeline.push({
        $sort: {
          minPrice: 1,
        },
      });

      const data = await Rates.aggregate(pipeline);

      return res.status(200).json({
        status: true,
        code: 200,
        message: "Data Fetched Successfully",
        data,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }

  static async hotelParityOtaWise(req, res, next) {
    try {
      let currentDate = JSON.stringify(
        new Date(req.propertyData?.extractionDate || new Date())
      )
        .split("T")[0]
        .slice(1);

      const hId = +req.query.hId;
      const propertyDetail = await propertySchemaModel.findOne({ hId: hId });
      const otaList = propertyDetail.activeOta.map((e) => +e.otaId);

      let result = await Promise.all(
        otaList.map(async (ota) => {
          let pipeline = [];
          pipeline.push(
            {
              $match: {
                $and: [
                  {
                    timestamp: currentDate,
                  },
                  {
                    hId: +req.query.hId,
                  },
                  {
                    otaId: ota,
                  },
                ],
              },
            },
            {
              $lookup: {
                from: "otas",
                localField: "otaId",
                foreignField: "otaId",
                as: "ota",
              },
            },
            { $unwind: { path: "$ota", preserveNullAndEmptyArrays: false } },
            {
              $unwind: { path: "$rates", preserveNullAndEmptyArrays: false },
            },
            {
              $match: {
                "rates.checkIn": currentDate,
              },
            },
            {
              $group: {
                _id: "$_id",
                items: {
                  $push: "$rates",
                },
                ota: {
                  $first: "$ota",
                },
              },
            },
            {
              $project: {
                _id: 1,
                rate: {
                  $min: "$items.price",
                },
                ota: 1,
              },
            }
          );

          const data = await Rates.aggregate(pipeline);

          if (data.length === 0) {
            const otaDetail = await OtaSchemaModel.findOne({ otaId: ota });
            return {
              otaName: otaDetail.otaName,
              otaImage: otaDetail.otaImage,
              rate: null,
            };
          } else {
            return {
              otaName: data[0].ota.otaName,
              otaImage: data[0].ota.otaImage,
              rate: data[0].rate,
            };
          }
        })
      );

      return res.status(200).json({
        status: true,
        code: 200,
        message: "Data Fetched Successfully",
        data: result,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }

  static async getHotelRank(req, res, next) {
    try {
      let result = [];
      for (let i = 0; i < req.query.type; i++) {
        let pipeline = [];
        pipeline.push({
          $match: {
            otaId: +req.query.otaId,
            cityCode: req.query.cityCode,
          },
        });
        let currDate = JSON.stringify(
          new Date(
            new Date(req.query.startDate).setUTCHours(0, 0, 0, 0) +
            (i + 1) * 24 * 60 * 60 * 999.99
          )
        )
          .split("T")[0]
          .slice(1);


        pipeline.push({
          $match: {
            timestamp: currDate,
          },
        });

        pipeline.push({
          $unwind: { path: "$ranking", preserveNullAndEmptyArrays: false },
        });

        pipeline.push({
          $match: {
            "ranking.otaPId": req.query.otaPId,
          },
        });

        const data = await RankingSchemaModel.aggregate(pipeline);
        if (data.length != 0) {
          result.push({
            timestamp: data[0].timestamp,
            rank: data[0].ranking.rank,
          });
        } else {
          result.push({
            timestamp: currDate,
            rank: -1,
          });
        }
      }

      return res.status(200).send(result);
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }

  static async getHotelRoomList(req, res, next) {
    try {
      let pipeline = [];

      // hId should come in query
      pipeline.push({
        $match: {
          hId: +req.query.hId,
        },
      });

      pipeline.push({
        $unwind: {
          path: "$activeRooms",
          preserveNullAndEmptyArrays: false,
        },
      });

      pipeline.push({
        $project: {
          hId: 1,
          roomName: "$activeRooms.roomName",
          RId: "$activeRooms.RId",
          ota: "$activeRooms.ota",
          compsetRooms: "$activeRooms.compsetRooms",
        },
      });

      pipeline.push({
        $unwind: {
          path: "$compsetRooms",
          preserveNullAndEmptyArrays: false,
        },
      });

      pipeline.push({
        $project: {
          hId: 1,
          roomName: 1,
          RId: 1,
          ota: 1,
          compsetid: "$compsetRooms.compsetid",
          compsetRId: "$compsetRooms.compsetRId",
        },
      });

      pipeline.push(
        {
          $lookup: {
            from: "rooms",
            localField: "compsetid",
            foreignField: "hId",
            as: "compSet",
          },
        },
        {
          $unwind: { path: "$compSet", preserveNullAndEmptyArrays: false },
        }
      );

      pipeline.push({
        $project: {
          hId: 1,
          roomName: 1,
          RId: 1,
          ota: 1,
          compsetid: 1,
          compsetRId: 1,
          compSetActiveRooms: "$compSet.activeRooms",
        },
      });

      pipeline.push({
        $project: {
          hId: 1,
          roomName: 1,
          RId: 1,
          ota: 1,
          compsetid: 1,
          compSetActiveRooms: {
            $filter: {
              input: "$compSetActiveRooms",
              as: "room",
              cond: { $eq: ["$$room.RId", "$compsetRId"] },
            },
          },
        },
      });

      pipeline.push({
        $unwind: {
          path: "$compSetActiveRooms",
          preserveNullAndEmptyArrays: false,
        },
      });

      pipeline.push({
        $group: {
          _id: {
            hId: "$hId",
            // "compsetId": "$compsetid",
            _id: "$_id",
            roomName: "$roomName",
            // RId: "$RId",
          },
          ota: { $first: "$ota" },
          compSetActiveRooms: {
            $push: {
              compsetId: "$compsetid",
              RId: "$compSetActiveRooms.RId",
              roomName: "$compSetActiveRooms.roomName",
              ota: "$compSetActiveRooms.ota",
            },
          },
        },
      });

      // PROJECT APPLY TODO

      const data = await RoomSchemaModel.aggregate(pipeline);

      return res.status(200).json({
        status: true,
        code: 200,
        message: "Data Fetched Successfully",
        data: data,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }

  static async RoomList(req, res, next) {
    try {
      let pipeline = [];

      // hId should come in query
      pipeline.push({
        $match: {
          hId: +req.query.hId,
        },
      });

      const data = await RoomSchemaModel.aggregate(pipeline);

      return res.status(200).json({
        status: true,
        code: 200,
        message: "Data Fetched Successfully",
        data: data[0]?.activeRooms || [],
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }

  static async fluctionTrend(req, res, next) {
    try {
      const typeMap = { WEEKLY: 7, MONTHLY: 30, "15DAYS": 15, QUATRLY: 90 };
      const type = typeMap[req.query.type] || 7;
      const baseOta = +req.query.otaId || 1;
      let currentDate = JSON.stringify(
        new Date(
          new Date(
            req.query.startDate !== null && req.query.startDate !== "null" && req.query.startDate != undefined
              ? req.query.startDate
              : req.propertyData?.extractionDate || new Date()
          ).setUTCHours(0, 0, 0, 0)
        )
      )
        .split("T")[0]
        .slice(1);
      const ourHID = +req.query.hId;
      const propertyDetail = await propertySchemaModel.findOne({ hId: ourHID });
      const compSetHIds = [+ourHID, ...propertyDetail.compsetIds];
      let result = [];
      for (let i = type; i >= 0; i--) {
        let prevDate = JSON.stringify(
          new Date(
            new Date(currentDate).setUTCHours(0, 0, 0, 0) -
            i * 24 * 60 * 60 * 999.99
          )
        )
          .split("T")[0]
          .slice(1);

        let res = await Promise.all(
          compSetHIds.map(async (hId) => {
            const pipeline = [
              {
                $match: {
                  timestamp: prevDate,
                  hId: hId,
                  otaId: baseOta,
                },
              },
              {
                $unwind: {
                  path: "$rates",
                  preserveNullAndEmptyArrays: false,
                },
              },
              {
                $match: {
                  "rates.checkIn": currentDate,
                },
              },
              {
                $group: {
                  _id: "$_id",
                  hId: { $first: "$hId" },
                  minPrice: { $min: "$rates.price" },
                },
              },
              {
                $lookup: {
                  from: "properties",
                  localField: "hId",
                  foreignField: "hId",
                  as: "property",
                },
              },
              {
                $unwind: {
                  path: "$property",
                  preserveNullAndEmptyArrays: false,
                },
              },
              {
                $project: {
                  hId: 1,
                  _id: 0,
                  minPrice: 1,
                  hName: "$property.hName",
                },
              },
            ];
            const data = await Rates.aggregate(pipeline);
            if (data.length === 0) {
              const propertyDetail = await propertySchemaModel.findOne({
                hId: hId,
              });
              return {
                hId: hId,
                hName: propertyDetail.hName,
                minPrice: null,
                timestamp: prevDate,
              };
            } else {
              return { ...data[0], timestamp: prevDate };
            }
          })
        );
        result.push(res);
      }

      return res.status(200).json({
        status: true,
        code: 200,
        message: "Data Fetched Successfully",
        data: result,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }

  static async fluctionTrendByMinRate(req, res, next) {
    try {
      let type = 7;
      if (req.query.type === "WEEKLY") {
        type = 7;
      } else if (req.query.type === "MONTHLY") {
        type = 30;
      } else if (req.query.type === "QUATRLY") {
        type = 90;
      }

      let startDate = new Date(req.propertyData?.extractionDate || new Date());

      let prevDate = new Date(
        startDate.getTime() - (type - 1) * 24 * 60 * 60 * 1000
      );


      const pipeline = [
        {
          $match: {
            hId: +req.query.hId,
            otaId: +req.query.otaId,
          },
        },
        {
          $unwind: "$rates",
        },
        {
          $match: {
            "rates.checkIn": startDate.toISOString().slice(0, 10), // Matching startDate
          },
        },
        {
          $group: {
            _id: {
              date: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: { $toDate: "$timestamp" },
                },
              },
            },
            minRate: { $min: "$rates.price" }, // Calculating the minimum rate within the 'rates' array
          },
        },
        {
          $project: {
            _id: 0,
            date: "$_id.date", // Including the 'date' field
            minRate: "$minRate", // Renaming 'minRate' field to 'rate'
          },
        },
        {
          $sort: {
            date: 1, // Sorting dates in ascending order
          },
        },
      ];

      const data = await Rates.aggregate(pipeline);

      // Create an array of dates up to the current date
      const currentDate = startDate.toISOString().slice(0, 10);
      const dateRange = Array.from({ length: type }, (_, index) => {
        const date = new Date(prevDate.getTime() + index * 24 * 60 * 60 * 1000);
        return date.toISOString().slice(0, 10);
      }).filter((date) => date <= currentDate);
      // Perform a left outer join to include missing dates and assign rate as 0
      const result = dateRange.map((date) => {
        const found = data.find((item) => item.date === date);
        return found || { date, minRate: 0 };
      });

      return res.status(200).json({
        status: true,
        code: 200,
        message: "Data Fetched Successfully",
        data: result,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }

  static async priceTrendByOTA(req, res, next) {
    try {
      let startDate = JSON.stringify(
        new Date(req.propertyData?.extractionDate || new Date())
      )
        .split("T")[0]
        .slice(1);
      // console.log(startDate)
      let nextDate;
      if (req.query.type === "WEEKLY") {
        nextDate = JSON.stringify(
          new Date(
            new Date(startDate).setUTCHours(0, 0, 0, 0) +
            7 * 24 * 60 * 60 * 999.99
          )
        )
          .split("T")[0]
          .slice(1);
        // console.log(nextDate)
      } else if (req.query.type === "MONTHLY") {
        nextDate = JSON.stringify(
          new Date(
            new Date(startDate).setUTCHours(0, 0, 0, 0) +
            30 * 24 * 60 * 60 * 999.99
          )
        )
          .split("T")[0]
          .slice(1);
        // console.log(nextDate)
      } else if (req.query.type === "15DAYS") {
        nextDate = JSON.stringify(
          new Date(
            new Date(startDate).setUTCHours(0, 0, 0, 0) +
            15 * 24 * 60 * 60 * 999.99
          )
        )
          .split("T")[0]
          .slice(1);
      } else if (req.query.type === "QUATRLY") {
        nextDate = JSON.stringify(
          new Date(
            new Date(startDate).setUTCHours(0, 0, 0, 0) +
            15 * 24 * 60 * 60 * 999.99
          )
        )
          .split("T")[0]
          .slice(1);
      }

      // Find the property with the given hId
      const property = await propertySchemaModel
        .findOne({ hId: req.query.hId }, "hId compsetIds")
        .lean();

      if (!property) {
        // Handle the case where the property with the given hId is not found
        return res.status(404).json({
          success: false,
          message: "Property not found for the given hId",
          code: 404,
        });
      }

      // Initialize an array and push hId and compsetIds into the array
      const resultArray = [
        parseInt(req.query.hId),
        ...(property.compsetIds || []),
      ];
      // console.log('resultArray: ', resultArray);

      let id = resultArray?.map((e) => {
        return +e;
      });

      let pipeline = [
        {
          $match: {
            $and: [
              {
                otaId: +req.query.otaId,
              },
              {
                hId: { $in: id },
              },
              {
                timestamp: startDate,
              },
            ],
          },
        },
        {
          $lookup: {
            from: "properties",
            localField: "hId",
            foreignField: "hId",
            as: "property",
          },
        },
        { $unwind: { path: "$property", preserveNullAndEmptyArrays: false } },
        {
          $unwind: { path: "$rates", preserveNullAndEmptyArrays: false },
        },
        {
          $match: {
            $and: [
              {
                "rates.checkIn": { $gte: startDate },
              },
              {
                "rates.checkIn": { $lte: nextDate },
              },
            ],
          },
        },
        {
          $group: {
            _id: "$hId",
            rates: { $push: "$rates" },
            property_name: { $first: "$property.hName" },
          },
        },
      ];

      const data = await Rates.aggregate(pipeline);
      // console.log(data[0].rates)
      // After retrieving data from the database

      let daysArray = await getDaysArray(startDate, nextDate);
      const minPriceDataArray = await Promise.all(
        daysArray.map(async (val) => {
          const minPriceData = await Promise.all(
            data.map(async (value) => {
              let obj = {
                hId: value._id,
                date: val,
                hName: value.property_name,
              };
              obj.price = value.rates
                .filter((AA) => {
                  return AA.checkIn == val;
                })
                .sort((a, b) => {
                  return b - a.price;
                })[0]?.price;

              return obj;
            })
          );
          // Sort the inner array based on hId in ascending order
          minPriceData.sort((a, b) => a.hId - b.hId);

          return minPriceData;
        })
      );

      // Use Promise.all to ensure order preservation
      const organizedDataArray = await Promise.all(minPriceDataArray);

      // Sort the final array based on date
      organizedDataArray.sort((a, b) => a[0]?.date.localeCompare(b[0]?.date));

      // Calculate total rates for weekdays and weekends, hId-wise
      const hIdAverages = {};

      organizedDataArray.forEach((dateArray) => {
        dateArray.forEach((entry) => {
          const dayOfWeek = new Date(entry.date).getDay();
          const category =
            dayOfWeek >= 1 && dayOfWeek <= 4 ? "weekday" : "weekend";

          if (!hIdAverages[entry.hId]) {
            hIdAverages[entry.hId] = {
              weekday: {
                totalPrice: 0,
                count: 0,
                undefinedCount: 0,
                undefinedDates: [],
              },
              weekend: {
                totalPrice: 0,
                count: 0,
                undefinedCount: 0,
                undefinedDates: [],
              },
            };
          }

          if (entry.price !== undefined) {
            hIdAverages[entry.hId][category].totalPrice += entry.price;
            hIdAverages[entry.hId][category].count += 1;
          } else {
            // Count when the price field is undefined
            hIdAverages[entry.hId][category].undefinedCount += 1;
            // Save the date when the price was undefined
            hIdAverages[entry.hId][category].undefinedDates.push(entry.date);
          }
        });
      });

      // Calculate the final average
      const finalAveragesWeekDayWeekEnd = Object.entries(hIdAverages).map(
        ([hId, avg]) => {
          const totalWeekDay =
            avg.weekday.count > 0 ? avg.weekday.totalPrice : 0;
          // console.log('totalWeekDay: ', totalWeekDay);
          const totalWeekEnd =
            avg.weekend.count > 0 ? avg.weekend.totalPrice : 0;
          // console.log('totalWeekEnd: ', totalWeekEnd);
          return {
            hId: +hId,
            weekday: totalWeekDay / avg.weekday.count,
            weekend: totalWeekEnd / avg.weekend.count,
            // weekdayCount: avg.weekday.count,
            // weekendCount: avg.weekend.count,
          };
        }
      );

      // Calculate the final average
      const finalAveragesAllDays = Object.entries(hIdAverages).map(
        ([hId, avg]) => {
          const totalWeekDay =
            avg.weekday.count > 0 ? avg.weekday.totalPrice : 0;
          // console.log('totalWeekDay: ', totalWeekDay);
          const totalWeekEnd =
            avg.weekend.count > 0 ? avg.weekend.totalPrice : 0;
          // console.log('totalWeekEnd: ', totalWeekEnd);
          const totalCount = avg.weekend.count + avg.weekday.count;
          return {
            hId: +hId,
            // weekday: totalWeekDay / totalCount,
            // weekend: totalWeekEnd / totalCount,
            totalDisplayRateAverage:
              totalWeekEnd / totalCount + totalWeekDay / totalCount || 0,
            // weekdayCount: avg.weekday.count,
            // weekendCount: avg.weekend.count,
          };
        }
      );

      // Initialize a variable to store the total undefined count for other hIds
      let totalUndefinedCountCompsetIds = 0;

      // Calculate the final average
      const finalAveragesSoldOut = Object.entries(hIdAverages).map(
        ([hId, avg]) => {
          const isQueryHId = +hId === +req.query.hId;

          if (!isQueryHId) {
            // Accumulate the undefined count for other hIds
            // console.log(515)
            totalUndefinedCountCompsetIds +=
              avg.weekday.undefinedCount + avg.weekend.undefinedCount || 0;
          } else {
            // console.log(515)
            totalUndefinedCountCompsetIds +=
              avg.weekday.undefinedCount + avg.weekend.undefinedCount || 0;
          }

          return {
            hId: +hId,
            undefinedCount:
              avg.weekday.undefinedCount + avg.weekend.undefinedCount || 0,
          };
        }
      );

      // // Calculate the average undefined count for other hIds
      // const avgCompsetSoldOut = totalUndefinedCountCompsetIds / (property.compsetIds?.length - 1) || null;
      // // console.log('totalUndefinedCountCompsetIds: ', totalUndefinedCountCompsetIds);

      // // Get the undefinedCount for the query hId
      // const queryHIdUndefinedCount = finalAveragesSoldOut.find(entry => +entry.hId === +req.query.hId)?.undefinedCount || 0;

      // // Prepare the final response
      // const finalSoldDataResponse = {
      //   hId: +req.query.hId,
      //   propertySoldOut: queryHIdUndefinedCount,
      //   averageCompsetSoldOut: avgCompsetSoldOut,
      // };

      // Create the final response for mostSoldOutDates
      const mostSoldOutDates = Object.entries(hIdAverages).map(([hId, avg]) => {
        return {
          hId: +hId,
          dates: [
            ...new Set([
              ...avg.weekday.undefinedDates,
              ...avg.weekend.undefinedDates,
            ]),
          ],
        };
      });

      return res.status(200).json({
        status: true,
        code: 200,
        message: "Data Fetched Successfully",
        data: [
          {
            PriceDisparityWeekDayWeekEnd: finalAveragesWeekDayWeekEnd,
            AverageDisplayRateComparison: finalAveragesAllDays,
            SoldOutCount: finalAveragesSoldOut,
            mostSoldOutDates: mostSoldOutDates,
          },
        ],
      });
    } catch (error) {
      console.log(error);
      return next(new ErrorHandler(error.message, 500));
    }
  }

  static async ParityCheckNew(req, res, next) {
    try {
      const typeMap = { WEEKLY: 7, "15DAYS": 15 };
      const type = typeMap[req.query.type] || 7;
      let currentDate = JSON.stringify(
        new Date(
          new Date(req.propertyData?.extractionDate || new Date()).setUTCHours(
            0,
            0,
            0,
            0
          )
        )
      )
        .split("T")[0]
        .slice(1);

      const hId = +req.query.hId;
      let result = [];
      for (let i = 0; i < type; i++) {
        let nextDate = JSON.stringify(
          new Date(
            new Date(currentDate).setUTCHours(0, 0, 0, 0) +
            (i + 1) * 24 * 60 * 60 * 999.99
          )
        )
          .split("T")[0]
          .slice(1);

        let pipeline = [];
        pipeline.push({
          $match: {
            timestamp: currentDate,
            hId: hId,
          },
        });

        pipeline.push({
          $unwind: {
            path: "$rates",
            preserveNullAndEmptyArrays: false,
          },
        });

        pipeline.push({
          $match: {
            "rates.checkIn": nextDate,
          },
        });

        pipeline.push({
          $group: {
            _id: "$otaId",
            items: {
              $push: "$rates",
            },
          },
        });

        pipeline.push({
          $project: {
            _id: 1,
            minRate: {
              $min: "$items.price",
            },
          },
        });
        const rate = await Rates.aggregate(pipeline);
        let parity = true;
        if (rate.length !== 0) {
          let total = 0;
          rate.map((r) => {
            total += r.minRate;
          });
          const avgRate = total / rate.length;
          const rateTenPercent = avgRate / 10;
          rate.map((r) => {
            if (Math.abs(r.minRate - avgRate) > rateTenPercent) {
              parity = false;
            }
          });
        } else {
          parity = true;
        }
        result.push({
          timestamp: nextDate,
          parity: parity,
        });
      }

      return res.status(200).json({
        status: true,
        code: 200,
        message: "Data Fetched Successfully",
        data: result,
      });
    } catch (error) {
      return res.status(500).json({
        status: true,
        code: 500,
        message: "Data Fetched Successfully",
        data: error.message,
      });
    }
  }

  static async otaFluctuation(req, res, next) {
    const ota_details = await OtaSchemaModel.find();

  }

  static async rates1(req, res, next) {
    function convertToDatetime(dateString) {
      try {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

        if (!dateRegex.test(dateString)) {
          throw new Error(
            "Invalid date format. Please provide date as yyyy-mm-dd."
          );
        }
        return dateString;
      } catch (err) {
        return res.status(500).json({ message: err.message });
      }
    }

    try {
      const hId = +req.query.hId;
      const otaId = +req.query.otaId;
      let date = req.query.date;

      if (!hId) {
        return res
          .status(404)
          .json({ success: false, code: 404, message: "Enter hId First" });
      }

      if (!date) {
        date = new Date();
        date = date.toISOString();
      } else {
        date = convertToDatetime(date);
      }

      const findProfile = await propertySchemaModel.findOne({ hId: hId });
      const compSetId = findProfile.compsetIds;

      const ids = [hId, ...compSetId];
      const today = date.toString().split("T")[0];

      const prevDate = new Date(today);
      prevDate.setDate(prevDate.getDate() - 1);
      const yesterday = prevDate.toISOString().split("T")[0];

      const nextDate = new Date(today);
      nextDate.setDate(nextDate.getDate() + 1);
      const tomorrow = nextDate.toISOString().split("T")[0];

      const data = await Promise.all(
        ids.map(async (id) => {
          try {
            const hotelNames = await propertySchemaModel
              .findOne({ hId: id })
              .select("hName");

            if (!hotelNames) {
              throw new Error(`No hotel found for id: ${id}`);
            }

            const todayRates = await Rates.aggregate([
              {
                $match: {
                  hId: id,
                  otaId: otaId,
                  timestamp: today,
                },
              },
              {
                $unwind: {
                  path: "$rates",
                  preserveNullAndEmptyArrays: false,
                },
              },
              {
                $match: {
                  "rates.checkIn": today,
                  "rates.checkOut": tomorrow,
                },
              },
              {
                $project: {
                  hId: 1,
                  minPrice: { $min: "$rates.price" },
                },
              },
              {
                $sort: { minPrice: 1 },
              },
              {
                $limit: 1,
              },
            ]);
            const yesterdayRates = await Rates.aggregate([
              {
                $match: {
                  hId: id,
                  otaId: otaId,
                  timestamp: yesterday,
                },
              },
              {
                $unwind: {
                  path: "$rates",
                  preserveNullAndEmptyArrays: false,
                },
              },
              {
                $match: {
                  "rates.checkIn": yesterday,
                  "rates.checkOut": today,
                },
              },
              {
                $project: {
                  hId: 1,
                  minPrice: { $min: "$rates.price" },
                },
              },
              {
                $sort: { minPrice: 1 },
              },
              {
                $limit: 1,
              },
            ]);

            if (todayRates.length === 0 || yesterdayRates.length === 0) {
              throw new Error(`No rate found for id: ${id}`);
            }

            const todayRate = todayRates[0].minPrice;
            const yesterdayRate = yesterdayRates[0].minPrice;

            const percentageDifference = parseFloat(
              (((todayRate - yesterdayRate) / yesterdayRate) * 100).toFixed(2)
            );

            const hotelName = hotelNames.hName;
            const hId = todayRates[0].hId;

            return {
              hotelName,
              hId,
              todayRate,
              yesterdayRate,
              percentageDifference,
            };
          } catch (error) {
            return error.message;
          }
        })
      );

      return res.status(200).json({
        status: true,
        code: 200,
        message: "Todays Rates",
        data,
      });
    } catch (error) {
      console.log("error: ", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

  static async rates(req, res, next) {


    try {
      const hId = +req.query.hId;
      const otaId = +req.query.otaId;
      let currentDate = JSON.stringify(
        new Date(
          new Date(req.propertyData?.extractionDate || new Date()).setUTCHours(
            0,
            0,
            0,
            0
          )
        )
      )
        .split("T")[0]
        .slice(1);
      console.log(currentDate)
      if (!hId) {
        return res
          .status(404)
          .json({ success: false, code: 404, message: "Enter hId First" });
      }



      const findProfile = await propertySchemaModel.findOne({ hId: hId });
      const compSetId = findProfile.compsetIds;

      const ids = [hId, ...compSetId];
      const today = currentDate

      const prevDate = new Date(today);
      prevDate.setDate(prevDate.getDate() - 1);
      const yesterday = prevDate.toISOString().split("T")[0];

      const nextDate = new Date(today);
      nextDate.setDate(nextDate.getDate() + 1);
      const tomorrow = nextDate.toISOString().split("T")[0];

      const data = await Promise.all(
        ids.map(async (id) => {
          try {
            const hotelNames = await propertySchemaModel
              .findOne({ hId: id })
              .select("hName hId");

            if (!hotelNames) {
              throw new Error(`No hotel name found for id: ${id}`);
            }

            const todayRates = await Rates.aggregate([
              {
                $match: {
                  hId: id,
                  otaId: otaId,
                  timestamp: today,
                },
              },
              {
                $unwind: {
                  path: "$rates",
                  preserveNullAndEmptyArrays: false,
                },
              },
              {
                $match: {
                  "rates.checkIn": today,
                  "rates.checkOut": tomorrow,
                },
              },
              {
                $project: {
                  hId: 1,
                  minPrice: { $min: "$rates.price" },
                },
              },
              {
                $sort: { minPrice: 1 },
              },
              {
                $limit: 1,
              },
            ]);
            const yesterdayRates = await Rates.aggregate([
              {
                $match: {
                  hId: id,
                  otaId: otaId,
                  timestamp: yesterday,
                },
              },
              {
                $unwind: {
                  path: "$rates",
                  preserveNullAndEmptyArrays: false,
                },
              },
              {
                $match: {
                  "rates.checkIn": yesterday,
                  "rates.checkOut": today,
                },
              },
              {
                $project: {
                  hId: 1,
                  minPrice: { $min: "$rates.price" },
                },
              },
              {
                $sort: { minPrice: 1 },
              },
              {
                $limit: 1,
              },
            ]);

            // if (todayRates.length === 0 || yesterdayRates.length === 0) {
            //   return {
            //     hotelName: hotelNames.hName,
            //     hId: id,
            //     todayRate: todayRates.length > 0 ? todayRates[0].minPrice || 0 : 0,
            //     yesterdayRate: yesterdayRates.length > 0 ? yesterdayRates[0].minPrice || 0 : 0,
            //     percentageDifference: 0,
            //   };
            // }


            const todayRate = todayRates.length > 0 ? todayRates[0].minPrice || 0 : 0;
            const yesterdayRate = yesterdayRates.length > 0 ? yesterdayRates[0].minPrice || 0 : 0;

            const percentageDifference = parseFloat(
              (((todayRate - yesterdayRate) / yesterdayRate) * 100).toFixed(2)
            );

            const hotelName = hotelNames.hName;
            const hId = todayRates.length > 0 ? todayRates[0].hId || hotelNames.hId : hotelNames.hId

            return {
              hotelName,
              hId,
              todayRate,
              yesterdayRate,
              percentageDifference,
            };
          } catch (error) {
            return error.message;
          }
        })
      );

      return res.status(200).json({
        status: true,
        code: 200,
        message: "Todays Rates",
        data,
      });
    } catch (error) {
      console.log("error: ", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

  static async getReputation(req, res, next) {
    const hId = +req.query.hId;
    // const otaId= +req.query.otaId
    if (!hId) {
      return res
        .status(404)
        .json({ success: false, code: 404, message: "Please Enter hId First" });
    }
    // if(!otaId){
    //   return res.status(404).json({success:false,code:404, message:"Please Enter otaId"})
    // }
    const reputation = await reputationSchema.find({ hId: hId }).lean();

    const updatedReputation = await Promise.all(
      reputation.map(async (item) => {
        const otaName = await OtaSchemaModel.findOne({
          otaId: item.otaId,
        }).select("otaName");
        return { ...item, otaName: otaName.otaName };
      })
    );

    if (!updatedReputation) {
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Nothing to show in reputation",
      });
    }
    return res
      .status(200)
      .json({ success: true, code: 200, data: updatedReputation });
  }

  static async postReputation(req, res, next) {
    const hId = +req.query.hId;
    const otaId = +req.query.otaId;

    const { hotelCode, otaPId, reputation } = req.body;

    if (!hId) {
      return res
        .status(404)
        .json({ success: false, code: 404, message: "Please Enter hId First" });
    }

    if (!otaId) {
      return res
        .status(404)
        .json({ success: false, code: 404, message: "Please Enter otaId" });
    }
    const findproperty = await propertySchemaModel.findOne({
      hId: hId,
      "activeOta.otaId": otaId,
    });

    if (!findproperty) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: "No property found with relative ota",
      });
    }
    const newReputation = new reputationSchema({
      hId: hId,
      otaId: otaId,
      hCode: hotelCode,
      otaPId: otaPId,
      reputation: reputation,
      timestamp: new Date().toISOString().split("T")[0],
    });
    const data = await newReputation.save();
    return res.status(200).json({
      success: true,
      code: 200,
      message: "Date Added Succesfully",
      data: data,
    });
  }

  static async getHotelOtaRate(req, res, next) {
    try {
      const hId = +req.query.hId;
      if (!hId) {
        return res
          .status(404)
          .json({ success: false, code: 404, message: "Please Enter hId" });
      }
      const today = new Date().toISOString().split("T")[0];

      // const today ="2024-01-08"
      const nextDate = new Date(today);
      nextDate.setDate(nextDate.getDate() + 1);
      const tomorrow = nextDate.toISOString().split("T")[0];

      const findProperty = await propertySchemaModel.aggregate([
        {
          $match: {
            hId: hId,
          },
        },
        {
          $lookup: {
            from: "rates",
            localField: "hId",
            foreignField: "hId",
            as: "rate",
          },
        },
        {
          $unwind: {
            path: "$rate",
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $unwind: {
            path: "$rate.rates",
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $lookup: {
            from: "otas",
            localField: "rate.otaId",
            foreignField: "otaId",
            as: "otaData",
          },
        },
        {
          $unwind: {
            path: "$otaData",
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $match: {
            "rate.timestamp": today,
            "rate.rates.checkIn": today,
            "rate.rates.checkOut": tomorrow,
          },
        },
        {
          $group: {
            _id: "$rate.otaId",
            otaName: { $first: "$otaData.otaName" },
            minPrice: { $min: "$rate.rates.price" },
          },
        },
        {
          $project: {
            _id: 0,
            otaId: "$_id",
            otaName: 1,
            minPrice: 1,
          },
        },
      ]);

      // Create a set of all otaIds present in findProperty
      const existingOtaIds = new Set(findProperty.map(entry => entry.otaId));

      // Fetch missing otaNames from otas collection
      const missingOtaIds = [1, 2, 3, 4].filter(otaId => !existingOtaIds.has(otaId));

      const missingOtaData = await OtaSchemaModel.find({ otaId: { $in: missingOtaIds } });

      // Add entries for missing otaIds
      missingOtaData.forEach(missingOta => {
        findProperty.push({
          otaId: missingOta.otaId,
          otaName: missingOta.otaName,
          minPrice: 0,
        });
      });

      return res.status(200).json({
        success: true,
        code: 200,
        message: "Today hotel rates in different ota",
        findProperty,
      });
    } catch (err) {
      console.log(err);
      return res
        .status(500)
        .json({ success: false, code: 500, message: "internal server error" });
    }
  }

  static async last7DaysDataAnalysis(req, res, next) {
    try {
      const hId = +req.query.hId;
      const otaId = req.query.otaId ? +req.query.otaId : null; // Make otaId optional
      let currentDate = JSON.stringify(
        new Date(
          new Date(req.propertyData?.extractionDate || new Date()).setUTCHours(
            0,
            0,
            0,
            0
          )
        )
      )
        .split("T")[0]
        .slice(1);

      if (!hId) {
        return res
          .status(404)
          .json({ success: false, code: 404, message: "Enter hId First" });
      }

      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() - 7);
      const sevenDaysAgo = nextDate.toISOString().split("T")[0];

      const findProfile = await propertySchemaModel.findOne({ hId: hId });
      const compSetId = findProfile.compsetIds;
      const ids = [hId, ...compSetId];

      const data = await Promise.all(
        ids.map(async (id) => {
          try {
            const hotelNames = await propertySchemaModel
              .findOne({ hId: id })
              .select("hName");

            if (!hotelNames) {
              throw new Error(`No hotel found for id: ${id}`);
            }

            const matchCondition = {
              hId: id,
              $and: [
                {
                  timestamp: { $gt: sevenDaysAgo },
                },
                {
                  timestamp: { $lte: currentDate },
                },
              ],
            };

            if (otaId !== null) {
              matchCondition.otaId = otaId;
            }

            const todayRates = await Rates.aggregate([
              {
                $match: matchCondition,
              },
              {
                $unwind: {
                  path: "$rates",
                  preserveNullAndEmptyArrays: false,
                },
              },
              {
                $match: {
                  $and: [
                    {
                      "rates.checkIn": { $gt: sevenDaysAgo },
                    },
                    {
                      "rates.checkIn": { $lte: currentDate },
                    },
                  ],
                },
              },
              {
                $lookup: {
                  from: "otas",
                  localField: "otaId",
                  foreignField: "otaId",
                  as: "otaData",
                },
              },
              {
                $unwind: {
                  path: "$otaData",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $group: {
                  _id: {
                    otaId: "$otaId",
                    otaName: "$otaData.otaName",
                    timeStamp: "$rates.checkIn",
                  },
                  minPrice: { $min: "$rates.price" },
                },
              },
              {
                $sort: { "_id.timeStamp": 1, minPrice: 1 },
              },
              {
                $project: {
                  _id: 0,
                  otaId: "$_id.otaId",
                  otaName: "$_id.otaName",
                  timeStamp: "$_id.timeStamp",
                  minPrice: 1,
                },
              },
            ]);

            if (todayRates.length === 0) {
              throw new Error(`No rate found for id: ${id}`);
            }

            const hotelName = hotelNames.hName;
            const hId = todayRates[0].hId;
            const rates = todayRates.map((rate) => ({
              otaId: rate.otaId,
              otaName: rate.otaName,
              minPrice: rate.minPrice,
              timeStamp: rate.timeStamp,
            }));

            return {
              hotelName,
              hId,
              rates,
            };
          } catch (error) {
            return error.message;
          }
        })
      );

      return res.status(200).json({
        success: true,
        code: 200,
        message: "Last seven days rates in different ota",
        data,
      });
    } catch (err) {
      console.log("err: ", err);
      return res
        .status(500)
        .json({ success: false, code: 500, message: "Internal server error" });
    }
  }

  static async checkRoomMap(req, res, next) {
    try {
      const hId = +req.query.hId;
      const findProperty = await propertySchemaModel.findOne({ hId: hId });
      if (!findProperty) {
        return res.status(404).json({
          success: false,
          code: 404,
          message: "Property not found",
        });
      }
      const Room = await RoomSchemaModel.findOne({ hId: hId })
      if (!Room) {
        return res.status(404).json({
          success: false,
          code: 404,
          message: "Room Mapping Not Completed",
        });
      }
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Room Mapping Completed",
      })
    } catch (err) {
      return res
        .status(500)
        .json({ success: false, code: 500, message: "Internal server error" });
    }
  }

  static async DayParity(req, res, next) {
    try {
      let pipeline = [];

      const today = JSON.stringify(
        new Date(req.propertyData?.extractionDate || new Date())
      )
        .split("T")[0]
        .slice(1);

      const date = req.query.date || today;

      pipeline.push({
        $match: {
          hId: +req.query.hId
        }
      })

      const RoomDetails = await RoomSchemaModel.aggregate(pipeline);
      const ActiveRooms = RoomDetails[0].activeRooms;

      const data = await Promise.all(ActiveRooms.map(async room => {
        const rateData = await Promise.all(room.ota.map(async o => {

          let rPipeline = [
            {
              $match: {
                hId: +req.query.hId,
                otaId: o.otaId,
                timestamp: today
              }
            },
            {
              $unwind: {
                path: "$rates",
                preserveNullAndEmptyArrays: false
              }
            },
            {
              $match: {
                "rates.roomId": o.roomId,
                "rates.checkIn": date
              }
            },
            {
              $group: {
                _id: "$otaId",
                "items": {
                  $push: "$rates"
                }
              }
            },
            {
              $project: {
                _id: 0,
                otaId: "$_id",
                rates: {
                  $min: "$items.price"
                }
              }
            },
            {
              $lookup: {
                from: "otas",
                localField: "otaId",
                foreignField: "otaId",
                as: "otaData",
              },
            },
            {
              $unwind: {
                path: "$otaData",
                preserveNullAndEmptyArrays: false,
              },
            },
          ]
          const rate = await Rates.aggregate(rPipeline);
          if (rate.length > 0) {
            return rate[0]
          } else {
            const otaDetail = await OtaSchemaModel.findOne({ otaId: o.otaId });
            return {
              otaId: o.otaId,
              rates: 0,
              otaData: otaDetail
            }
          }

        }))

        return {
          roomName: room.roomName,
          otaWiseRoomRate: rateData
        }
      }))

      return res.status(200).json({
        success: true,
        data: data
      })

    } catch (err) {
      console.log("err: ", err);
      return res
        .status(500)
        .json({ success: false, code: 500, message: "Internal server error" });
    }
  }

  static async getExtractionDate(req, res, next) {
    try {
      const hId = + req.query.hId;
      if (!hId) {
        return res.status(404).json({
          success: false,
          code: 404,
          message: "Please Enter hId First",
        });
      }
      const findProperty = await propertySchemaModel.findOne({ hId: hId });
      if (!findProperty) {
        return res.status(404).json({
          success: false,
          code: 404,
          message: "Property not found",
        });
      }

      return res.status(200).json({
        success: true,
        code: 200,
        message: "extractionDate found",
        date: findProperty.extractionDate || " "
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        code: 500,
        message: "Internal server error"
      })
    }
  }

  static async getCompsetRoomRate1(req, res, next) {
    try {
      const hId = req.query.hId;
      const otaId = req.query.otaId;
      let currentDate = JSON.stringify(
        new Date(
          new Date(req.propertyData?.extractionDate || new Date()).setUTCHours(
            0,
            0,
            0,
            0
          )
        )
      )
        .split("T")[0]
        .slice(1);

      const findProperty = await propertySchemaModel.findOne({ hId: hId });
      if (!findProperty) {
        return res.status(404).json({
          success: false,
          code: 404,
          message: "Property not found",
        });
      }
      const compsetIds = findProperty?.compsetIds;
      if (!compsetIds || compsetIds.length === 0) {
        return res.status(404).json({
          success: false,
          code: 404,
          message: "CompsetIds not found for the property",
        });
      }

      const rooms = await RoomSchemaModel.find({
        "hId": { $in: compsetIds },
      });

      // Initialize an object to store OTA objects grouped by compsetId
      const otaObjectsByCompsetId = {};

      rooms.forEach((room) => {
        // Extract activeRooms from each room
        const activeRoomsArray = room.activeRooms;

        // Extract ota objects from each activeRoom
        const allOtaObjects = activeRoomsArray.reduce(
          (otaObjects, activeRoom) => otaObjects.concat(activeRoom.ota),
          []
        );

        // Group OTA objects by compsetId
        otaObjectsByCompsetId[parseInt(room.hId, 10)] = allOtaObjects; // Convert to number
      });


      let pipeline = [
        {
          $match: {
            timestamp: currentDate,
            otaId: +req.query.otaId,
            hId: { $in: compsetIds },
          },
        },
        {
          $unwind: "$rates",
        },
        {
          $match: {
            "rates.roomID": {
              $in: Object.keys(otaObjectsByCompsetId).flatMap((key) =>
                otaObjectsByCompsetId[key].map((obj) => obj.roomID)
              ),
            },

            "rates.checkIn": {
              $eq: req.query.Date,
            },
          },
          // hName: { $first: "$propertyInfo.hName" }, 
        },

        {
          $project: {
            timestamp: 1,
            hId: 1,
            otaId: 1,
            _id: "$rates._id",
            "rates.roomID": 1,
            "rates.price": 1,
            "rates.checkIn": 1,
            "rates.roomName": 1,
            "rates.roomPlan": 1,
          },
        },
        {
          $group: {
            _id: {
              _id: "$_id",
              hId: "$hId",
              otaId: "$otaId",
              timestamp: "$timestamp",
              roomID: "$rates.roomID",
            },
            minPrice: { $min: "$rates.price" },
            rates: { $first: "$rates" },
          },
        },
        {
          $group: {
            _id: { hId: "$_id.hId", otaId: "$_id.otaId", timestamp: "$_id.timestamp" },
            rates: {
              $push: {
                _id: "$rates._id",
                roomID: "$_id.roomID",
                price: "$minPrice",
                checkIn: "$rates.checkIn",
                roomName: "$rates.roomName",
                roomPlan: "$rates.roomPlan",
              },
            },
          },
        },
        {
          $lookup: {
            from: "properties",
            localField: "_id.hId",
            foreignField: "hId",
            as: "propertyData"
          }
        },
        {
          $project: {
            _id: 0,
            hId: "$_id.hId",
            otaId: "$_id.otaId",
            hName: { $arrayElemAt: ["$propertyData.hName", 0] },
            timestamp: "$_id.timestamp",
            rates: 1,
          },
        },
      ];

      const data = await Rates.aggregate(pipeline);

      // const uniqueRoomIDs = new Set();
      // const uniqueRoomIDs2 = new Set();

      // // Assuming findRate is the document you obtained
      // const findRate = await Rates.findOne({ hId: 20001, timestamp: "2024-01-23", otaId: 1 });

      // if (findRate) {
      //   findRate.rates.forEach((otaRate) => {
      //     // Check if checkIn matches the timestamp
      //     if (otaRate.checkIn === findRate.timestamp) {
      //       uniqueRoomIDs.add(otaRate.roomID);
      //     }
      //   });

      //   if (findRate) {
      //     findRate.rates.forEach((otaRate) => {
      //       uniqueRoomIDs2.add(otaRate.roomID);
      //     });
      //   }

      //   // Convert the Set to an array if needed
      //   const uniqueRoomIDsArray = Array.from(uniqueRoomIDs);
      //   const uniqueRoomIDsArray2 = Array.from(uniqueRoomIDs2);

      //   console.log('Unique Room IDs:', uniqueRoomIDsArray);
      //   console.log('Unique Room IDs2:', uniqueRoomIDsArray2);
      // } else {
      //   console.log('No matching document found.');
      // }
      // console.log('data: ', data);

      const mappedData = await Promise.all(compsetIds.map(async (compsetId) => {
        const matchingData = data.find(item => item.hId === compsetId);

        if (!matchingData) {
          const getHotelName = await propertySchemaModel.findOne({ "hId": compsetId }).select('hId hName').lean();


          return {
            hId: compsetId,
            otaId: +req.query.otaId,
            hName: getHotelName.hName,
            timestamp: currentDate,
            rates: "Sold out",
          };
        } else {
          return matchingData;
        }
      }));

      // console.log("data", data);
      return res.status(200).json({
        success: true,
        code: 200,
        message: "compset room rate",
        data: mappedData
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        success: false,
        code: 500,
        message: "Internal server error",
      });
    }
  }


  static async getCompsetRoomRate(req, res, next) {
    try {
      const hId = req.query.hId;
      const otaId = req.query.otaId;
      const date = req.query.date;

      let currentDate = JSON.stringify(
        new Date(
          new Date(req.propertyData?.extractionDate || new Date()).setUTCHours(0, 0, 0, 0)
        )
      )
        .split("T")[0]
        .slice(1);

      const findActiveRooms = await RoomSchemaModel.findOne({ hId: hId });
      if (!findActiveRooms) {
        return res.status(404).json({
          success: false,
          code: 404,
          message: "Room not found",
        });
      }

      const propertyData = await propertySchemaModel.findOne({ hId: hId });
      const hotelName = propertyData?.hName;

      // Function to map compsetRooms
      const mapCompsetRooms = async (compsetRoom) => {
        const compsetRoomData = await RoomSchemaModel.findOne({ hId: compsetRoom.compsetid });

        const propertyCompsetData = await propertySchemaModel.findOne({ hId: compsetRoom.compsetid });
        //console.log(propertyCompsetData)
        const hotelName = propertyCompsetData?.hName;
        // console.log(hotelName)
        //console.log(compsetRoomData)

        if (!compsetRoomData) {
          return null;
        }

        const compsetRId = compsetRoom.compsetRId;

        const compsetRIdRoom = compsetRoomData.activeRooms.find(
          (activeRoom) => activeRoom.RId === compsetRId
        );

        if (!compsetRIdRoom) {
          return null;
        }

        const filteredOta = compsetRIdRoom.ota
          .filter((ota) => ota.otaId === parseInt(otaId, 10))
          .map((filteredOta) => ({
            otaId: filteredOta.otaId,
            roomID: filteredOta.roomID,
          }));

        // Find the minimum price for the roomID in the Rates collection
        const compsetPriceInfo = await Rates.aggregate([
          {
            $match: {
              timestamp: currentDate,
              otaId: +req.query.otaId,
              hId: +compsetRoom.compsetid,
            },
          },
          {
            $unwind: "$rates",
          },
          {
            $match: {
              "rates.checkIn": date,
              "rates.roomID": filteredOta[0]?.roomID.toString(),
            },
          },
          {
            $group: {
              _id: null,
              minPrice: { $min: "$rates.price" },
            },
          },
        ]);
        const compsetMinPrice = compsetPriceInfo[0]?.minPrice || null;

        return {
          hotelName: hotelName,
          compsetid: compsetRoom.compsetid,
          // compsetRId: compsetRoom.compsetRId,
          //ota: compsetRIdRoom.ota,
          // ota:filteredOta
          otaId: filteredOta[0]?.otaId, // Get the first otaId from the filteredOta array
          roomID: filteredOta[0]?.roomID,
          minPrice: compsetMinPrice
        };
      };


      // Extracting relevant information from each active room
      const modifiedRooms = await Promise.all(
        findActiveRooms.activeRooms.map(async (room) => {
          const otaFiltered = await Promise.all(
            room.ota
              .filter((ota) => ota.otaId === parseInt(otaId, 10))
              .map(async (filteredOta) => {
                const roomID = filteredOta?.roomID;
                //  console.log(roomID)

                // Find the minimum price for the roomID in the Rates collection
                const minPriceInfo = await Rates.aggregate([
                  {
                    $match: {
                      timestamp: currentDate,
                      otaId: +req.query.otaId,
                      hId: +req.query.hId,
                    },
                  },
                  {
                    $unwind: "$rates",
                  },
                  {
                    $match: {
                      "rates.checkIn": date,
                      "rates.roomID": roomID.toString()
                    },
                  },


                  {
                    $group: {
                      _id: "$rates.roomID",
                      minPrice: { $min: "$rates.price" },
                    },
                  },
                  {
                    $project: {
                      minPrice: "$minPrice",
                    }
                  },
                ]);
                //console.log(minPriceInfo)

                const minPrice = minPriceInfo[0]?.minPrice || null;

                return {
                  otaId: filteredOta.otaId,
                  roomID: roomID,
                  hotelName: hotelName,
                  minPrice: minPrice,
                };
              })
          );

          // return {
          //   roomName: room.roomName,
          //   ota: otaFiltered,
          //   compsetRooms: await Promise.all(room.compsetRooms.map(mapCompsetRooms)),

          // };
          const compsetRooms = await Promise.all(room.compsetRooms.map(mapCompsetRooms));

          const roomData = {
            roomName: room.roomName,
            ota: otaFiltered,
          };

          if (compsetRooms.length > 0) {
            roomData.compsetRooms = compsetRooms;
          } else {
            roomData.compsetRooms = "Not mapped";
          }

          return roomData;

        })
      );

      return res.status(200).json({
        success: true,
        code: 200,
        message: "Compset room rate",
        data: modifiedRooms,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        success: false,
        code: 500,
        message: "Internal server error",
      });
    }
  }

  static async getRoomMapping1(req, res, next) {
    try {
      const hId = req.query.hId;

      const findProperty = await propertySchemaModel.findOne({ hId: hId });
      if (!findProperty) {
        return res.status(404).json({
          success: false,
          code: 404,
          message: "Property not found",
        });
      }
      const compsetIds = findProperty?.compsetIds;

      if (!compsetIds || compsetIds.length === 0) {
        return res.status(404).json({
          success: false,
          code: 404,
          message: "CompsetIds not found for the property",
        });
      }

      const rooms = await RoomSchemaModel.find({
        $or: [
          { "hId": { $in: compsetIds } },
          { "hId": hId },
        ],
      });

      const otaObjectsByCompsetId = {};

      rooms.forEach((room) => {
        const activeRoomsArray = room.activeRooms;
        const allOtaObjects = activeRoomsArray.reduce(
          (otaObjects, activeRoom) => otaObjects.concat(activeRoom.ota),
          []
        );
        otaObjectsByCompsetId[parseInt(room.hId, 10)] = allOtaObjects; // Convert to number
      });

      // Extract unique otaIds from all compsetIds
      const allOtaIds = [...new Set(Object.values(otaObjectsByCompsetId)
        .flatMap((otaObjects) => otaObjects.map((otaObject) => otaObject.otaId)))];


      //
      const allhId = Array.from(new Set(Object.keys(otaObjectsByCompsetId).map(Number)));


      // Add a $match stage to filter based on all compsetIds and otaIds
      const pipeline = [
        {
          $match: {
            $and: [
              { otaId: { $in: allOtaIds } },
              { hId: { $in: allhId } },
            ],
          },
        },
        {
          $unwind: "$rooms",
        },
        {
          $match: {
            "rooms.roomID": {
              $in: Object.keys(otaObjectsByCompsetId).flatMap((key) =>
                otaObjectsByCompsetId[key].map((obj) => obj.roomID)
              ),
            },
          },
          // hName: { $first: "$propertyInfo.hName" }, 
        },
        {
          $group: {
            _id: {
              hId: "$hId",
              otaId: "$otaId",
              hName: "$hName",
            },
            rooms: { $push: "$rooms" },
          },
        },
      ];

      const data = await Roomdump.aggregate(pipeline);

      return res.status(200).json({
        success: true,
        code: 200,
        message: "compset room rate",
        data: data,
      });

    } catch (err) {
      console.error(err);
      return res.status(500).json({
        success: false,
        code: 500,
        message: "Internal server error",
      });
    }
  }

  static async getRoomMapping(req, res, next) {
    try {
      const hId = req.query.hId;

      const findProperty = await propertySchemaModel.findOne({ hId: hId });
      if (!findProperty) {
        return res.status(404).json({
          success: false,
          code: 404,
          message: "Property not found",
        });
      }
      const compsetIds = findProperty?.compsetIds;

      if (!compsetIds || compsetIds.length === 0) {
        return res.status(404).json({
          success: false,
          code: 404,
          message: "CompsetIds not found for the property",
        });
      }

      const rooms = await Roomdump.find({
        $or: [
          { "hId": { $in: compsetIds } },
          { "hId": hId },
        ],
      }).select({ compsetRooms: 0 });
      // Use aggregation pipeline to match hId and otaId in Roomdump collection
      const pipeline = [
        {
          $match: {
            $or: [
              { hId: { $in: compsetIds } },
              { hId: +req.query.hId },

            ],
          },
        },
        {
          $unwind: "$activeRooms",
        },
        {
          $unwind: "$activeRooms.ota",
        },
        {
          $match: {
            "activeRooms.ota.roomID": { $in: rooms.flatMap(room => room.rooms.map(roomInArray => roomInArray.roomID)) },
          },
        },
        {
          $group: {
            _id: {
              _id: "$_id",
              hId: "$hId",
              roomName: "$activeRooms.roomName", // Group by roomName
            },
            activeRooms: { $addToSet: "$activeRooms.ota" }, // Collect unique ota objects
          },
        },
        {
          $group: {
            _id: "$_id._id",
            hId: { $first: "$_id.hId" },
            activeRooms: { $addToSet: { roomName: "$_id.roomName", ota: "$activeRooms" } }, // Collect unique roomName and associated ota objects
          },
        },
        {
          $project: {
            "hId": 1,
            "activeRooms.roomName": 1,
            "activeRooms.ota": 1,
          },
        },

      ];

      const matchedRooms = await RoomSchemaModel.aggregate(pipeline);

      // Perform the mapping
      const mappedResult = await Promise.all(matchedRooms.map(async (hotel) => {
        return {
          hId: hotel.hId,
          activeRooms: await Promise.all(hotel.activeRooms.map(async (activeRoom) => {
            return {
              roomName: activeRoom.roomName,
              ota: await Promise.all(activeRoom.ota.map(async (ota) => {
                const rateMapping = await Roomdump.findOne({
                  hId: hotel.hId,
                  otaId: ota.otaId,
                  "rooms.roomID": ota.roomID,
                });

                const matchedRoom = rateMapping ? rateMapping.rooms.find(room => room.roomID === ota.roomID) : null;

                return {
                  otaId: ota.otaId,
                  roomID: ota.roomID,
                  roomName: matchedRoom ? matchedRoom.roomName : null,
                };
              })),
            };
          })),
        };
      }));

      // console.log(rooms);
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Room mapping data",
        data: mappedResult,
      });

    } catch (err) {
      console.error(err);
      return res.status(500).json({
        success: false,
        code: 500,
        message: "Internal server error",
      });
    }
  }

  static async changePrimaryOTA(req, res, next) {
    try {
      const { hId, _id } = req.body;

      const propertyLink = await propertyLinkModel.findOne({ hId });

      if (!propertyLink) {
        return res.status(400).json({
          success: false,
          code: 400,
          message: "Please enter correct hId",
        });
      }

      const otaObject = propertyLink.ota_detail.findIndex(obj => obj._id.toString() === _id);
      if (otaObject === -1) {
        return res.status(400).json({
          success: false,
          code: 400,
          message: "Please enter correct ota's _id",
        });
      } else {
        propertyLink.ota_detail[otaObject].is_primary = true;

        propertyLink.ota_detail.forEach((obj, index) => {
          if (index !== otaObject) {
            obj.is_primary = false
          }
        })
      }

      await propertyLink.save().then(() => {
        return res.status(200).json({
          success: true,
          code: 200,
          message: `Successfully set ${propertyLink.ota_detail[otaObject].ota_name} as primary Ota`,
        });
      }).catch((error) => {
        return res.status(500).json({
          success: false,
          code: 500,
          message: "Error setting primary ota",
        });
      });


    } catch (error) {
      console.log(error);
      return res.status(500).json({
        success: false,
        code: 500,
        message: "Internal server error",
      });
    }
  }

  static async getCompsetRoomMapping(req, res, next) {
    try {
      const hId = +req.query.hId;

      const findProperty = await propertySchemaModel.findOne({ hId: hId });
      if (!findProperty) {
        return res.status(404).json({
          success: false,
          code: 404,
          message: "Property not found",
        });
      }
      const compsetIds = findProperty?.compsetIds;

      if (!compsetIds || compsetIds.length === 0) {
        return res.status(404).json({
          success: false,
          code: 404,
          message: "CompsetIds not found for the property",
        });
      }


      const pipeline = [
        {
          $match: {
            $or: [
              { hId: +req.query.hId },
            ],
          },
        },
        {
          $project: {
            _id: 0,
            hId: 1,
            activeRooms: {
              $map: {
                input: "$activeRooms",
                as: "room",
                in: {
                  RId: "$$room.RId",
                  roomName: "$$room.roomName",
                  compsetRooms: "$$room.compsetRooms",
                },
              },
            },
          },
        },
      ];

      const matchedRooms = await RoomSchemaModel.aggregate(pipeline);

      const mapCompsetRooms = async (room) => {
        const updatedActiveRooms = await Promise.all(
          room.activeRooms.map(async (activeRoom) => {
            const updatedCompsetRooms = await Promise.all(
              activeRoom.compsetRooms.map(async (compsetRoom) => {
                // Find the room in the room collection
                const roomRecord = await RoomSchemaModel.findOne({
                  hId: compsetRoom.compsetid,
                });

                // If roomRecord is found, find the roomName using compsetRId
                if (roomRecord) {
                  const compsetRoomName = roomRecord.activeRooms.find(
                    (ar) => ar.RId === compsetRoom.compsetRId
                  )?.roomName;

                  // Add roomName to the compsetRoom object
                  return {
                    ...compsetRoom,
                    roomName: compsetRoomName || "",
                  };
                }

                return compsetRoom; // Return original compsetRoom if room not found
              })
            );

            // Update the activeRoom with the modified compsetRooms
            return {
              ...activeRoom,
              compsetRooms: updatedCompsetRooms,
            };
          })
        );

        // Update the room with the modified activeRooms
        return {
          ...room,
          activeRooms: updatedActiveRooms,
        };
      };

      // Map the matchedRooms array using the mapCompsetRooms function
      const mappedRooms = await Promise.all(matchedRooms.map(mapCompsetRooms));

      // console.log(rooms);
      return res.status(200).json({
        success: true,
        code: 200,
        message: "compset room rate",
        data: mappedRooms,
      });

    } catch (err) {
      console.error(err);
      return res.status(500).json({
        success: false,
        code: 500,
        message: "Internal server error",
      });
    }
  }


}
export default DashboardModel;
