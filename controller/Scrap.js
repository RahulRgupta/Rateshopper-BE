  // static async fluctionTrendByMinRate(req, res, next) {
  //   try {
  //     let type = 7;
  //     if (req.query.type === "WEEKLY") {
  //       type = 7;
  //     } else if (req.query.type === "MONTHLY") {
  //       type = 30;
  //     } else if (req.query.type === "QUARTERLY") {
  //       type = 90;
  //     }
  
  //     let startDate = new Date();
  //     let prevDate = new Date(startDate.getTime() - type * 24 * 60 * 60 * 1000);
  
  //     const pipeline = [
  //       {
  //         $match: {
  //           hId: +req.query.hId,
  //           otaId: +req.query.otaId,
  //           timestamp: { $lte: startDate.toISOString(), $gte: prevDate.toISOString() }
  //         },
  //       },
  //       {
  //         $unwind: "$rates"
  //       },
  //       {
  //         $group: {
  //           _id: {
  //             date: { $dateToString: { format: "%Y-%m-%d", date: { $toDate: "$timestamp" } } },
  //           },
  //           minRate: { $min: "$rates.price" }, // Calculating the minimum rate within the 'rates' array
  //         }
  //       },
  //       {
  //         $project: {
  //           _id: 0,
  //           date: "$_id.date",
  //           minRate: "$minRate" // Renaming 'minRate' field to 'rate'
  //         }
  //       },
  //       {
  //         $sort: {
  //           date: 1 // Sorting dates in ascending order
  //         }
  //       }
  //     ];
  
  //     const data = await Rates.aggregate(pipeline);
  
  //     return res.status(200).json({
  //       status: true,
  //       code: 200,
  //       message: "Data Fetched Successfully",
  //       Rate: data,
  //     });
  //   } catch (error) {
  //     return next(new ErrorHandler(error.message, 500));
  //   }
  // }a