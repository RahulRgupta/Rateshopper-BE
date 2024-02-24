import cmDataModel from "../model/CMData.js";
import { signJwt } from "../middleware/auth.js";
import ErrorHandler from "../utils/errorHandler.js";
import { getDaysArray } from "../middleware/custom.js";
import Rates from "./../model/Rate.js";
import CMData from "./../model/CMData.js";
import priceBandSchema from "../model/BandRange.js";
import propertySchemaModel from "../model/Property.js";
import InventoryModel from "../model/Inventory.js";
import CMModel from "../model/CM.js";
import roomSchemaModel from "../model/Room.js";
import getRSuggestionPrice from "../utils/RSuggestioCal.js";

class PPModel {
  // static async pickUp(req, res, next) {
  //   try {
  //     let startDate = JSON.stringify(new Date("2023-12-16"))
  //       .split("T")[0]
  //       .slice(1);
  //     let nextDate = JSON.stringify(
  //       new Date(
  //         new Date(startDate).setUTCHours(0, 0, 0, 0) +
  //         11 * 24 * 60 * 60 * 999.99
  //       )
  //     )
  //       .split("T")[0]
  //       .slice(1);

  //     let condition = [
  //       {
  //         $match: {
  //           $and: [
  //             {
  //               hotelCode: req.query.hotelCode,
  //             },
  //             {
  //               bookingDate: { $gte: startDate },
  //             },
  //             {
  //               bookingDate: { $lte: nextDate },
  //             },
  //           ],
  //         },
  //       },
  //       {
  //         $project: {
  //           _id: 1,
  //           hotelName: 1,
  //           bookingDate: 1,
  //           arrivalDate: 1,
  //           deptDate: 1,
  //           hotelCode: 1,
  //         },
  //       },
  //     ];

  //     let findPickUp = await cmDataModel.aggregate(condition);

  //     let obj = [];

  //     findPickUp.map((e) => {
  //       let check =
  //         obj.find((el) => {
  //           return el.bookingDate == e.bookingDate;
  //         }) || false;
  //       if (!check) {
  //         obj.push({ bookingDate: e.bookingDate, totalArrivalDates: [] });
  //       }
  //     });

  //     await Promise.all(
  //       findPickUp.map((e) => {
  //         obj.map(async (el, i) => {
  //           if (e.bookingDate == el.bookingDate) {
  //             let arrivalDates = await getDaysArray(e.arrivalDate, e.deptDate);
  //             obj[i].totalArrivalDates = [
  //               ...obj[i].totalArrivalDates,
  //               ...arrivalDates,
  //             ];
  //           }
  //         });
  //       })
  //     );

  //     obj.map((e) => {
  //       let sorted = e.totalArrivalDates.sort();
  //       let counts = {};
  //       sorted.forEach(function (x) {
  //         counts[x] = (counts[x] || 0) + 1;
  //       });
  //       e.no_of_booking = counts;
  //       delete e.totalArrivalDates;
  //     });

  //     return res.status(200).json({
  //       success: true,
  //       code: 200,
  //       message: "Pickup list.....",
  //       data: obj,
  //     });
  //   } catch (error) {
  //     return next(new ErrorHandler(error.message, 500));
  //   }
  // }

  static async pickUp(req, res, next) {
    try {
      let startDate = new Date(req.query.startDate);
      let endDate = new Date(req.query.endDate);
      let bookingStartDate = new Date(req.query.bookingStartDate);
      let bookingEndDate = new Date(req.query.bookingEndDate);
      const hid= +req.query.hId

      if(!hid){
        return res.status(400).json({
          success: false,
          code: 400,
          message: " hId is required",
        });
      }
      const findProperty= await propertySchemaModel.findOne({hId:hid}).select("hCode")
      const hotelCode=findProperty.hCode

      if (!hotelCode) {
        return res.status(200).json({
          success: true,
          code: 200,
          message: "channel manager is not connected",
        });      
      }

      let dateArray = [];
      for (let date = new Date(bookingStartDate); date <= bookingEndDate; date.setDate(date.getDate() + 1)) {
        dateArray.push(new Date(date));
      }

      let arrivalDateArray = [];
      for (let arrivalDate = new Date(startDate); arrivalDate <= endDate; arrivalDate.setDate(arrivalDate.getDate() + 1)) {
        arrivalDateArray.push(new Date(arrivalDate));
      }

      let result = await Promise.all(dateArray.map(async (date) => {
        const bookingDate = date.toISOString().split('T')[0];
        const bookingDay = await cmDataModel.find({
          hotelCode: hotelCode,
          bookingDate: bookingDate
        });
        let rest = {
          bookingDate: bookingDate,
          no_of_booking: {},
          totalBookingThatDay: bookingDay.length
        };

        await Promise.all(arrivalDateArray.map(async (arrivalDate) => {
          const arrival_date = arrivalDate.toISOString().split('T')[0];

          const booking = await cmDataModel.find({
            hotelCode: hotelCode,
            arrivalDate: arrival_date,
            bookingDate: bookingDate
          });
          rest.no_of_booking[arrival_date] = booking.length;
        }));


        return rest;
      }));

      return res.status(200).json({
        success: true,
        code: 200,
        message: "Pickup list.....",
        data: result,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }

  static async pickUp1(req, res, next) {
    try {
      let startDate = req.query.startDate;
      let endDate = req.query.endDate;
      let bookingStartDate = req.query.bookingStartDate;
      let bookingEndDate = req.query.bookingEndDate;

      let condition = [
        {
          $match: {
            $and: [
              {
                hotelCode: req.query.hotelCode,
              },
              {
                bookingDate: {
                  $gte: startDate,
                  $lte: endDate,
                },
              },
            ],
          },
        },
        {
          $project: {
            _id: 1,
            hotelName: 1,
            bookingDate: 1,
            arrivalDate: 1,
            deptDate: 1,
            hotelCode: 1,
          },
        },
      ];

      let findPickUp = await cmDataModel.aggregate(condition);

      let obj = [];

      findPickUp.forEach((e) => {
        let check = obj.find((el) => el.bookingDate === e.bookingDate);
        if (!check) {
          obj.push({ bookingDate: e.bookingDate, totalArrivalDates: [] });
        }
      });

      await Promise.all(
        findPickUp.map(async (e) => {
          let el = obj.find((el) => el.bookingDate === e.bookingDate);
          if (el) {
            let arrivalDates = await getDaysArray(e.arrivalDate, e.deptDate);
            el.totalArrivalDates.push(...arrivalDates);
          }
        })
      );

      obj.forEach((e) => {
        let sorted = e.totalArrivalDates.sort();
        let counts = {};
        sorted.forEach(function (x) {
          counts[x] = (counts[x] || 0) + 1;
        });
        //e.no_of_booking = counts;

        // Generate all dates within the specified range
        let currentDate = new Date(bookingStartDate);
        let endDate = new Date(bookingEndDate);
        let allDates = {};

        while (currentDate <= endDate) {
          const dateKey = currentDate.toISOString().split('T')[0];
          allDates[dateKey] = counts[dateKey] || 0;
          currentDate.setDate(currentDate.getDate() + 1);
        }

        e.no_of_booking = allDates;

        delete e.totalArrivalDates;
      });

      return res.status(200).json({
        success: true,
        code: 200,
        message: "Pickup list.....",
        data: obj,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }

  // static async Last7DaysPrice(req, res, next) {
  //   try {

  //     if (!req.query.hotelCode_User) {
  //       return next(new ErrorHandler("Your hotel Code is missing", 401));
  //     }

  //     const result = await Promise.all(
  //       Array.from({ length: 7 }, async (_, i) => {
  //         let pipeline = [];
  //         let startDate = JSON.stringify(
  //           new Date(
  //             new Date().setUTCHours(0, 0, 0, 0) - i * 24 * 60 * 60 * 999.99
  //           )
  //         )
  //           .split("T")[0]
  //           .slice(1);
  //         pipeline.push({
  //           $match: {
  //             hId: {
  //               $in: [+req.query.hotelCode_User, +req.query.hotelCode_Compset],
  //             },
  //           },
  //         });
  //         pipeline.push({
  //           $match: {
  //             timestamp: startDate,
  //           },
  //         });

  //         pipeline.push({
  //           $match: {
  //             otaId: req.query.otaId,
  //           }
  //         });


  //         pipeline.push({
  //           $unwind: { path: "$rates", preserveNullAndEmptyArrays: false },
  //         });

  //         pipeline.push(
  //           {
  //             $match: {
  //               "rates.checkIn": startDate,
  //             },
  //           },
  //           {
  //             $lookup: {
  //               from: "properties",
  //               localField: "hId",
  //               foreignField: "hId",
  //               as: "hotel",
  //             },
  //           },
  //           { $unwind: { path: "$hotel", preserveNullAndEmptyArrays: false } }
  //         );

  //         pipeline.push({
  //           $group: {
  //             _id: {
  //               hId: "$hId",
  //               hName: "$hotel.hName",
  //             },
  //             timestamp: { $first: "$timestamp" },
  //             rates: {
  //               $min: "$rates.price",
  //             },
  //           },
  //         });

  //         pipeline.push({
  //           $project: {
  //             hId: "$_id.hId",
  //             timestamp: 1,
  //             rates: 1,
  //             hName: "$_id.hName",
  //             _id: 0,
  //           },
  //         });

  //         return Rates.aggregate(pipeline);
  //       })
  //     ).then((data) => data.flat());


  //     return res.status(200).json({
  //       success: true,
  //       code: 200,
  //       message: "last 7 days list",
  //       data: result,
  //     });
  //   } catch (error) {
  //     return next(new ErrorHandler(error.message, 500));
  //   }
  // }

  static async Last7DaysPrice(req, res, next) {
    try {

      if (!req.query.hotelCode_User) {
        return next(new ErrorHandler("Your hotel Code is missing", 401));
      }

      const baseotaId = +req.query.otaId || 1;

      const result = await Promise.all(
        Array.from({ length: 7 }, async (_, i) => {
          let pipeline = [];
          let startDate = JSON.stringify(
            new Date(
              new Date(req.propertyData?.extractionDate || new Date()).setUTCHours(0, 0, 0, 0) - i * 24 * 60 * 60 * 999.99
            )
          )
            .split("T")[0]
            .slice(1);
          pipeline.push({
            $match: {
              hId: {
                $in: [+req.query.hotelCode_User, +req.query.hotelCode_Compset],
              },
            },
          });
          pipeline.push({
            $match: {
              timestamp: startDate,
            },
          });

          pipeline.push({
            $match: {
              otaId: baseotaId,
            }
          });


          pipeline.push({
            $unwind: { path: "$rates", preserveNullAndEmptyArrays: false },
          });

          pipeline.push(
            {
              $match: {
                "rates.checkIn": startDate,
              },
            },
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

          pipeline.push({
            $group: {
              _id: {
                hId: "$hId",
                hName: "$hotel.hName",
              },
              timestamp: { $first: "$timestamp" },
              rates: {
                $min: "$rates.price",
              },
            },
          });

          pipeline.push({
            $project: {
              hId: "$_id.hId",
              timestamp: 1,
              rates: 1,
              hName: "$_id.hName",
              _id: 0,
            },
          });

          const rate = await Rates.aggregate(pipeline);
          if (rate.length === 2) {
            return rate;
          } else {
            if (rate.length === 1) {
              const isYourHotel = false;
              if (rate[0].hId === req.query.hotelCode_User) {
                isYourHotel = true;
              }

              if (isYourHotel) {
                const compHotelName = await propertySchemaModel.findOne({ hId: req.query.hotelCode_Compset }).select("hName");
                

                return [
                  rate[0]
                  , {
                    hId: req.query.hotelCode_Compset,
                    hName: compHotelName.hName,
                    rates: 0,
                    timestamp: startDate
                  }]
              } else {
                const yourHotelName = await propertySchemaModel.findOne({ hId: req.query.hotelCode_User }).select("hName");
                return [{
                  hId: req.query.hotelCode_User,
                  hName: yourHotelName.hName,
                  rates: 0,
                  timestamp: startDate
                }, rate[0]]
              }

            } else {

              const yourHotelName = await propertySchemaModel.findOne({ hId: req.query.hotelCode_User }).select("hName");
              const compHotelName = await propertySchemaModel.findOne({ hId: req.query.hotelCode_Compset }).select("hName");
              return [{
                hId: req.query.hotelCode_User,
                hName: yourHotelName.hName,
                rates: 0,
                timestamp: startDate
              }, {
                hId: req.query.hotelCode_Compset,
                hName: compHotelName.hName,
                rates: 0,
                timestamp: startDate
              }]
            }
          }
        })
      ).then((data) => data.flat());


      return res.status(200).json({
        success: true,
        code: 200,
        message: "last 7 days list",
        data: result,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }

  // static async Next7DaysPrice(req, res, next) {
  //   try {
  //     if (!req.query.hotelCode_User) {
  //       return next(new ErrorHandler("Your hotel Code is missing", 401));
  //     }
  //     let pipeline = [];
  //     let startDate = JSON.stringify(
  //       new Date(new Date().setUTCHours(0, 0, 0, 0))
  //     )
  //       .split("T")[0]
  //       .slice(1);

  //     let nextDate = JSON.stringify(
  //       new Date(
  //         new Date(startDate).setUTCHours(0, 0, 0, 0) +
  //         7 * 24 * 60 * 60 * 999.99
  //       )
  //     )
  //       .split("T")[0]
  //       .slice(1);


  //     pipeline.push({
  //       $match: {
  //         otaId: +req.query.otaId || 1
  //       },
  //     });

  //     pipeline.push({
  //       $match: {
  //         hId: {
  //           $in: [+req.query.hotelCode_User, +req.query.hotelCode_Compset],
  //         },
  //       },
  //     });
  //     pipeline.push({
  //       $match: {
  //         timestamp: startDate,
  //       },
  //     });

  //     pipeline.push({
  //       $unwind: { path: "$rates", preserveNullAndEmptyArrays: true },
  //     });

  //     pipeline.push({
  //       $match: {
  //         $expr: {
  //           $and: [
  //             {
  //               $gte: [
  //                 { $dateFromString: { dateString: "$rates.checkIn" } },
  //                 new Date(startDate),
  //               ],
  //             },
  //             {
  //               $lt: [
  //                 { $dateFromString: { dateString: "$rates.checkIn" } },
  //                 new Date(nextDate),
  //               ],
  //             },
  //           ],
  //         },
  //       },
  //     });

  //     pipeline.push(
  //       {
  //         $lookup: {
  //           from: "properties",
  //           localField: "hId",
  //           foreignField: "hId",
  //           as: "hotel",
  //         },
  //       },
  //       { $unwind: { path: "$hotel", preserveNullAndEmptyArrays: true } }
  //     );
  //     pipeline.push({
  //       $group: {
  //         _id: {
  //           hId: "$hId",
  //           hName: "$hotel.hName",
  //           checkInDate: "$rates.checkIn",
  //         },
  //         timestamp: { $first: "$timestamp" },
  //         rates: {
  //           $min: "$rates.price",
  //         },
  //       },
  //     });

  //     pipeline.push({
  //       $project: {
  //         hId: "$_id.hId",
  //         hName: "$_id.hName",
  //         timestamp: "$_id.checkInDate",
  //         rates: {
  //           $min: "$rates",
  //         },
  //         _id: 0,
  //       },
  //     });
  //     pipeline.push({
  //       $sort: {
  //         timestamp: 1,
  //         hId: 1,
  //       },
  //     });

  //     const data = await Rates.aggregate(pipeline);

  //     return res.status(200).json({
  //       success: true,
  //       code: 200,
  //       message: " Data Fetched Successfully",
  //       data: data,
  //     });
  //   } catch (error) {
  //     return next(new ErrorHandler(error.message, 500));
  //   }
  // }

  static async Next7DaysPrice(req, res, next) {
    try {
      if (!req.query.hotelCode_User) {
        return next(new ErrorHandler("Your hotel Code is missing", 401));
      }

      let startDate = JSON.stringify(
        new Date(new Date(req.propertyData?.extractionDate || new Date()).setUTCHours(0, 0, 0, 0))
      )
        .split("T")[0]
        .slice(1);

      const result = await Promise.all(
        Array.from({ length: 7 }, async (_, i) => {
          let pipeline = [];
          let nextDate = JSON.stringify(
            new Date(
              new Date().setUTCHours(0, 0, 0, 0) + (i + 1) * 24 * 60 * 60 * 999.99
            )
          )
            .split("T")[0]
            .slice(1);

          pipeline.push({
            $match: {
              otaId: +req.query.otaId || 1
            },
          });

          pipeline.push({
            $match: {
              hId: {
                $in: [+req.query.hotelCode_User, +req.query.hotelCode_Compset],
              },
            },
          });
          pipeline.push({
            $match: {
              timestamp: startDate,
            },
          });

          pipeline.push({
            $unwind: { path: "$rates", preserveNullAndEmptyArrays: true },
          });

          pipeline.push({
            $match: {
              "rates.checkIn": nextDate,
            },
          });

          pipeline.push({
            $group: {
              _id: {
                hId: "$hId",
                hName: "$hotel.hName",
                checkInDate: "$rates.checkIn",
              },
              timestamp: { $first: "$timestamp" },
              rates: {
                $min: "$rates.price",
              },
            },
          });

          pipeline.push({
            $project: {
              hId: "$_id.hId",
              hName: "$_id.hName",
              timestamp: "$_id.checkInDate",
              rates: {
                $min: "$rates",
              },
              _id: 0,
            },
          });
          pipeline.push(
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

          pipeline.push({
            $project: {
              hId: 1,
              hName: "$hotel.hName",
              timestamp: 1,
              rates: 1,
            },
          });

          const rate = await Rates.aggregate(pipeline);
          if (rate.length === 2) {
            return rate;
          } else {
            if (rate.length === 1) {
              const isYourHotel = false;
              if (rate[0].hId === req.query.hotelCode_User) {
                isYourHotel = true;
              }

              if (isYourHotel) {
                const compHotelName = await propertySchemaModel.findOne({ hId: req.query.hotelCode_Compset }).select("hName");

                return [
                  rate[0]
                  , {
                    hId: req.query.hotelCode_Compset,
                    hName: compHotelName.hName,
                    rates: 0,
                    timestamp: nextDate
                  }]
              } else {
                const yourHotelName = await propertySchemaModel.findOne({ hId: req.query.hotelCode_User }).select("hName");
                return [{
                  hId: req.query.hotelCode_User,
                  hName: yourHotelName.hName,
                  rates: 0,
                  timestamp: nextDate
                }, rate[0]]
              }

            } else {

              const yourHotelName = await propertySchemaModel.findOne({ hId: req.query.hotelCode_User }).select("hName");
              const compHotelName = await propertySchemaModel.findOne({ hId: req.query.hotelCode_Compset }).select("hName");
              return [{
                hId: req.query.hotelCode_User,
                hName: yourHotelName.hName,
                rates: 0,
                timestamp: nextDate
              }, {
                hId: req.query.hotelCode_Compset,
                hName: compHotelName.hName,
                rates: 0,
                timestamp: nextDate
              }]
            }
          }
        })
      ).then((data) => data.flat());

      return res.status(200).json({
        success: true,
        code: 200,
        message: " Data Fetched Successfully",
        data: result,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }

  static async Last5Days(req, res, next) {
    try {
      if (!req.query.hotelCode) {
        return next(new ErrorHandler("Hotel Code is Missing", 500));
      }
      let pipeline = [];
      let startDate = JSON.stringify(
        new Date(new Date(req.propertyData?.extractionDate || new Date()).setUTCHours(0, 0, 0, 0))
      )
        .split("T")[0]
        .slice(1);

      let prevDate = JSON.stringify(
        new Date(
          new Date(req.propertyData?.extractionDate || new Date()).setUTCHours(0, 0, 0, 0) -
          6 * 24 * 60 * 60 * 999.99
        )
      )
        .split("T")[0]
        .slice(1);

      pipeline.push({
        $match: {
          hotelCode: req.query.hotelCode,
        },
      });

      pipeline.push({
        $match: {
          $expr: {
            $and: [
              {
                $gte: [
                  { $dateFromString: { dateString: "$bookingDate" } },
                  new Date(prevDate),
                ],
              },
              {
                $lt: [
                  { $dateFromString: { dateString: "$bookingDate" } },
                  new Date(startDate),
                ],
              },
            ],
          },
        },
      });

      // pipeline.push(
      //   {
      //     $lookup: {
      //       from: "properties",
      //       localField: "hId",
      //       foreignField: "hId",
      //       as: "hotel",
      //     },
      //   },
      //   { $unwind: { path: "$hotel", preserveNullAndEmptyArrays: false } }
      // );
      pipeline.push({
        $group: {
          _id: {
            source: "$source",
          },
          noOfBooking: { $sum: 1 },
          totalRev: { $sum: "$totalCharges" },
        },
      });

      pipeline.push({
        $addFields: {
          adr: {
            $cond: {
              if: { $gt: ["$noOfBooking", 0] }, // Check if roomNights > 0 to avoid division by zero
              then: { $divide: ["$totalRev", "$noOfBooking"] },
              else: null, // Set ADR to null if roomNights = 0
            },
          },
        },
      });

      pipeline.push({
        $project: {
          source: "$_id.source",
          adr: 1,
          noOfBooking: 1,
          totalRev: 1,
          _id: 0,
        },
      });

      const data = await CMData.aggregate(pipeline);

      return res.status(200).json({
        success: true,
        code: 200,
        message: "Pickup list",
        data: data,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }

  static async PricePridictionRoomWise(req, res, next) {
    try {
      const hid=+req.query.hId
      if (!hid) {
        return next(new ErrorHandler(" hId is missing", 401));
      }
      const findProperty= await propertySchemaModel.findOne({hId:hid}).select("hCode")
      const hotelCode=findProperty.hCode

      if (!hotelCode) {
        return res.status(200).json({
          success: true,
          code: 200,
          message: "channel manager is not conneccted",
        });      
      }

      let today = JSON.stringify(
        new Date(new Date(req.propertyData?.extractionDate || new Date()).setUTCHours(0, 0, 0, 0))
      )
        .split("T")[0]
        .slice(1);
      let pipeline = [
        {
          $match: {
            hotelCode: hotelCode,
          },
        }, {
          $match: {
            arrivalDate: {
              $lte: today,
            },
            deptDate: {
              $gt: today,
            },
          },
        },
        {
          $group: {
            _id: {
              room: "$room",
            },
            totalRoom: { $sum: 1 },
          },
        },
        {
          $project: {
            roomName: "$_id.room",
            roomBooked: "$totalRoom",
            _id: 0,
          },
        },
        {
          $sort: {
            roomBooked: -1,
          },
        }
      ];
      const occupancyRoomType = await CMData.aggregate(pipeline);

      let prevDate = JSON.stringify(
        new Date(
          new Date(req.propertyData?.extractionDate || new Date()).setUTCHours(0, 0, 0, 0) -
          1 * 24 * 60 * 60 * 999.99
        )
      )
        .split("T")[0]
        .slice(1);
      let pipeline1 = [
        {
          $match: {
            hotelCode: hotelCode,
          },
        }, {
          $match: {
            arrivalDate: {
              $lte: prevDate,
            },
            deptDate: {
              $gt: prevDate,
            },
          },
        },
        {
          $group: {
            _id: {
              room: "$room",
            },
            totalRoom: { $sum: 1 },
          },
        },
        {
          $project: {
            roomName: "$_id.room",
            roomBooked: "$totalRoom",
            _id: 0,
          },
        },
        {
          $sort: {
            roomBooked: -1,
          },
        }
      ];
      const occupancyRoomTypePrevDay = await CMData.aggregate(pipeline1);


      const inventoryData = await InventoryModel.aggregate([
        {
          $match: {
            hotelCode: hotelCode,
          }
        }
      ]);

      const { immediateHigh, immediateLow, primaryOta } = await propertySchemaModel.findOne({ hId: inventoryData[0].hId }).lean();

      const result = await Promise.all(inventoryData[0].granular.map(async (room) => {
        room.totalBooking = 0;
        room.totalBookingPrevDay = 0;
        occupancyRoomType.map((occupancy) => {
          if (room.roomName == occupancy.roomName) {
            room.totalBooking = occupancy.roomBooked;
          }
        });
        occupancyRoomTypePrevDay.map((occupancy) => {
          if (room.roomName == occupancy.roomName) {
            room.totalBookingPrevDay = occupancy.roomBooked;
          }
        });
        room.roomsLeft = room.inventory - room.totalBooking;
        room.roomsLeftPrevDay = room.inventory - room.totalBookingPrevDay;
        room.occupancy = ((room.inventory - room.roomsLeft) / room.inventory) * 100;
        room.occupancyPrevDay = ((room.inventory - room.roomsLeftPrevDay) / room.inventory) * 100;
        return room;
      }));
      const baseotaId = primaryOta;
      const roomDetails = await roomSchemaModel.findOne({ hId: inventoryData[0].hId }).lean();
      const minPricesArray = await Promise.all(roomDetails.activeRooms.map(async (rooms) => {
        const roomId = rooms.ota.find(room => room.otaId === baseotaId)?.roomID;
        const rates = await Rates.aggregate([
          {
            $match: {
              hId: inventoryData[0].hId,
              otaId: baseotaId,
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
              "rates.roomID": roomId,
              "rates.checkIn": today
            }
          },
          {
            $group: {
              _id: "$_id",
              minPrice: {
                $min: "$rates.price"
              }
            }
          }
        ])
        let lowRateRSuggest = 0;
        let highRateRSuggest = 0;
        let occupancyToday = result.find(r => +r.RId === rooms.RId).occupancy;
        let occupancyPreviousDay = result.find(r => +r.RId === rooms.RId).occupancyPrevDay;;
        const minRateComp = await Promise.all(rooms.compsetRooms.map(async (comp) => {
          const compSetDetails = await roomSchemaModel.findOne({ hId: comp.compsetid });
          const compRoomDetails = compSetDetails.activeRooms.find(room => room.RId === comp.compsetRId);
          const roomIdComp = compRoomDetails.ota.find(room => room.otaId === baseotaId)?.roomID;
          const rates = await Rates.aggregate([
            {
              $match: {
                hId: comp.compsetid,
                otaId: baseotaId,
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
                "rates.roomID": roomIdComp,
                "rates.checkIn": today
              }
            },
            {
              $group: {
                _id: "$_id",
                minPrice: {
                  $min: "$rates.price"
                }
              }
            }
          ])
          if (comp.compsetid === immediateLow) {
            lowRateRSuggest = rates[0]?.minPrice || 0;
          }
          if (comp.compsetid === immediateHigh) {
            highRateRSuggest = rates[0]?.minPrice || 0;
          }
          return rates[0]?.minPrice || 0;
        }))
        const filteredArr = minRateComp.filter((value) => value !== 0);
        const sum = filteredArr.reduce((a, b) => a + b, 0);
        const comSetAvg = filteredArr.length > 0 ? sum / filteredArr.length : 0;
        return {
          roomName: rooms.roomName,
          basePrice: rates[0]?.minPrice || 0,
          comSetAvg: comSetAvg,
          RId: rooms.RId,
          RSuggestPrice: getRSuggestionPrice(lowRateRSuggest, highRateRSuggest, occupancyToday, occupancyPreviousDay, (rates[0]?.minPrice || 0))
        };
      }));


      let combinedArray = [];
      let groupedArray = {};
      for (let obj of result.concat(minPricesArray)) {
        if (groupedArray[obj.RId]) {
          Object.assign(groupedArray[obj.RId], obj);
        } else {
          groupedArray[obj.RId] = obj;
          combinedArray.push(obj);
        }
      }

      return res.status(200).json({
        success: true,
        code: 200,
        message: "Ocuupancy List",
        data: combinedArray,
      });
    } catch (error) {
      console.log(error);
      return next(new ErrorHandler(error.message, 500));
    }
  }

  static async OccupancyData(req, res, next) {
    try {

      const baseOtaId = req.query.otaId || 1;
      const hid= +req.query.hId

      if (!hid) {
        return next(new ErrorHandler("hId is missing", 401));
      }
      const findProperty= await propertySchemaModel.findOne({hId:hid}).select("hCode")
      const hotelCode=findProperty.hCode

      if (!hotelCode) {
        return res.status(200).json({
          success: true,
          code: 200,
          message: "channel manager is not conneccted",
        });      
      }

      let pipeline = [];
      let today = JSON.stringify(
        new Date(new Date(req.propertyData?.extractionDate || new Date()).setUTCHours(0, 0, 0, 0))
      )
        .split("T")[0]
        .slice(1);

      pipeline.push({
        $match: {
          hotelCode: hotelCode,
        },
      });

      pipeline.push({
        $match: {
          arrivalDate: {
            $lte: today,
          },
          deptDate: {
            $gt: today,
          },
        },
      });

      pipeline.push({
        $group: {
          _id: null,
          hotelCode: { $first: "$hotelCode" },
          occupancy: { $sum: 1 },
        },
      });
      pipeline.push(
        {
          $lookup: {
            from: "inventories",
            localField: "hotelCode",
            foreignField: "hotelCode",
            as: "inventory",
          },
        },
        { $unwind: { path: "$inventory", preserveNullAndEmptyArrays: false } },
        {
          $project: {
            hotelCode: 1,
            occupancy: 1,
            totalInventory: "$inventory.totalInvetory",
            _id: 0,
          },
        },
        {
          $addFields: {
            occupancyPercentage: {
              $cond: {
                if: { $gt: ["$totalInventory", 0] },
                then: {
                  $multiply: [
                    { $divide: ["$occupancy", "$totalInventory"] },
                    100,
                  ],
                },
                else: null,
              },
            },
            leftInventory: {
              $cond: {
                if: { $gt: ["$totalInventory", 0] },
                then: { $subtract: ["$totalInventory", "$occupancy"] },
                else: null,
              },
            },
          },
        },
        {
          $lookup: {
            from: "inventories",
            localField: "hotelCode",
            foreignField: "hotelCode",
            as: "rooms",
          },
        },
        { $unwind: { path: "$rooms", preserveNullAndEmptyArrays: false } },
        {
          $project: {
            "hotelCode": 1,
            "occupancy": 1,
            "totalInventory": 1,
            "occupancyPercentage": 1,
            "leftInventory": 1,
            "hId": "$rooms.hId",
          }
        }
      );

      const data = await CMData.aggregate(pipeline);

      pipeline = [
        {
          $match: {
            hId: data[0].hId,
            otaId: baseOtaId,
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
            "rates.checkIn": today
          }
        },
        {
          $group: {
            _id: null,
            basePrice: {
              $min: "$rates.price"
            }
          }
        }
      ];
      const rates = await Rates.aggregate(pipeline);


      return res.status(200).json({
        success: true,
        code: 200,
        message: "Ocuupancy List",
        data: { ...data[0], basePrice: (rates[0]?.basePrice ? rates[0].basePrice : 0) }
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }

  static async AddPriceBand(req, res, next) {
    try {
      let hotelId = req.body.hotelId;
      // let hotelCode = req.body.hotelCode;
      let occupancyRules_type = req.body.occupancyRules_type;
      let occupancyRules = req.body.occupancyRules;
      let compsetRules_type = req.body.type;
      let compSetRule = req.body.compSetRule;
      let day = req.body.day;
      let from = req.body.from;
      let to = req.body.to;
      let bandRangeType=req.body.bandRangeType;
      let value = req.body.percentageValue;
      let comsetId = req.body.compSetRule;
      let priceChange = req.body.priceChange


      let findBand = await priceBandSchema.findOne({ hotelId }).lean();

      if (findBand) {
        let updateBand = await priceBandSchema.findOneAndUpdate(
          { hotelId },
          { ...req.body },
          { new: true }
        );

        return res.status(200).json({
          success: true,
          code: 200,
          message: "Price Band Updated...",
          data: updateBand,
        });
      } else {
        let newBand = await priceBandSchema.create(req.body);

        return res.status(200).json({
          success: true,
          code: 200,
          message: "Price Band Created...",
          data: newBand,
        });
      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }

  static async getPriceBand(req, res, next) {
    try {
      let hotelId = req.query.hotelId;

      if (!hotelId) {
        return res.status(422).json({
          success: false,
          code: 422,
          message: "Please provide hotel code or hotel id",
        });
      }

      let findBand = await priceBandSchema.findOne({ hotelId }).lean();

      let findRate = await Rates.findOne({ hId: hotelId }).lean();

      let sortedRates = findRate.rates.sort((a, b) => {
        return a.price - b.price;
      });

      delete findRate.rates;

      let rates = sortedRates[0]?.price || 0;

      return res.status(200).json({
        success: true,
        code: 200,
        message: "Price Band...",
        data: {...findBand,rates},
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }

  static async getBasePrice(req, res, next) {
    try {
      let hId = +req.query.hId;

      let findProperty = await propertySchemaModel.findOne({ hId: hId }).lean();

      let obj = [];

      await Promise.all(
        findProperty.compsetIds.map(async (e) => {
          let findRate = await Rates.findOne({ hId: e }).lean();
          if (findRate) {
            let sortedRates = findRate?.rates?.sort((a, b) => {
              return a.price - b.price;
            });
            let findProperty = await propertySchemaModel
              .findOne({ hId: e })
              .lean();

            let priceBandRecord = await priceBandSchema.findOne({ hotelId: hId }, 'hotelId compSetRule').lean()
            // console.log('priceBandRecord: ', priceBandRecord.compSetRule);
            const compsetInfo = priceBandRecord.compSetRule.find((compSet) => {
              return compSet.compSetId === e;
            });

            // console.log(compsetInfo, "asfds");
            delete findRate.rates;
            obj.push({
              hId: e,
              rates: sortedRates[0],
              name: findProperty?.hName || "",
              priceChange: compsetInfo?.priceChange || "",
              type: compsetInfo?.type || "",
              adjustPrice: compsetInfo?.adjustPrice || ""
            });
          }
        })
      );

      let findRate = await Rates.findOne({ hId: hId }).lean();

      // Clone the rates array to avoid modifying the original data
      let sortedRates = [...findRate.rates].sort((a, b) => {
        return a.price - b.price;
      });

      // Create a new object without modifying the original data
      let updatedFindRate = {
        ...findRate,
        rates: sortedRates[0],
        compset: obj,
      };

      return res.status(200).json({
        success: true,
        code: 200,
        message: "Data fetched..",
        data: updatedFindRate,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
}

export default PPModel;
