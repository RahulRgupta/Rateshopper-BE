import User from "../model/User.js";
import { signJwt } from "../middleware/auth.js";
import ErrorHandler from "../utils/errorHandler.js";
import bcrypt from "bcryptjs";
import { randomString } from "../middleware/custom.js";
import propertySchemaModel from "../model/Property.js";
import mongoose from "mongoose";
import City from "../model/City.js";
import OtaSchemaModel from "../model/Ota.js";
import { sendMail } from "../utils/sendMail.js";
import ejs from 'ejs'
import path from 'path'
import dump from "../model/dump.js"
import room from "../model/Room.js"
import HotelNotification from "../model/HotelNotification.js";
import axios from 'axios';
import { log } from "console";
import util from "util"
import { request } from "http";
import dotenv from 'dotenv'; 
import rateModel from "../model/Rate.js";

dotenv.config();

class AdminModel {
  static async AdminLogin(req, res, next) {
    try {
      let email = req.body.email;
      let password = req.body.password;

      if (!email && !password) {
        return res.status(422).json({
          status: false,
          code: 422,
          message: "Please fill all the required field",
        });
      } else {
        let findAdmin = await User.findOne({ email }).lean();

        if (!findAdmin) {
          return res.status(404).json({
            status: false,
            code: 404,
            message: "Email Not Found",
          });
        } else if (findAdmin && findAdmin.role !== "ADMIN") {
          return res.status(401).json({
            status: false,
            code: 401,
            message: "Not Authorized",
          });
        } else {
          const validatePassword = await bcrypt.compare(
            password,
            findAdmin.password
          );

          if (validatePassword) {
            const _id = findAdmin._id;
            const role = findAdmin.role;
            const name = findAdmin.name;
            const email = findAdmin.email;

            const jwtToken = await signJwt({ _id, role, name, email });

            return res.status(200).json({
              status: true,
              code: 200,
              message: "Logged in successfully!!",
              data: jwtToken,
            });
          } else {
            return res.status(401).json({
              code: 401,
              success: false,
              message: "Password didn't match",
            });
          }
        }
      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }

  static async AddUser(req, res, next) {
    try {
      if (req.authData.role === "ADMIN") {
        let email = req.body.email;
        let name = req.body.name;

        let findOldUser = await User.findOne({ email }).lean();

        if (findOldUser) {
          return res.status(409).json({
            success: false,
            code: 409,
            message: "User already exists",
          });
        } else {
          const randomPassword = await randomString(
            8,
            "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
          );
          const encryptedPassword = await bcrypt.hash(randomPassword, 10);

          let __dirname = path.resolve();

          await sendMail({
            email: email,
            subject: 'Login Credential of your account',
            template: 'crudential-mail.ejs',
            data: {
              name: req.body.name,
              password: randomPassword
            }
          });

          let newUser = await User.create({
            email,
            name,
            password: encryptedPassword,
            added_by: "ADMIN"
          });


          return res.status(200).json({
            success: true,
            code: 200,
            message: `User Created`,
          });

        }
      } else {
        return res.status(401).json({
          success: false,
          code: 401,
          message: "Not Authorized",
        });
      }
    } catch (error) {
      console.log(error)
      return next(new ErrorHandler(error.message, 500));
    }
  }

  static async UserList(req, res, next) {
    try {
      if (req.authData.role === "ADMIN") {
        let condition = [
          {
            $match: {
              role: "USER",
            },
          },
          {
            $project: {
              _id: 0,
              role: 1,
              email: 1,
            },
          },
        ];

        const userCount = await User.aggregate(condition);
        const pagination = {
          skip: 0,
          limit: 1000,
        };

        if (req.query.limit) {
          pagination.limit = Number(req.query.limit);
          if (req.query.page) {
            pagination.skip = req.query.limit * (req.query.page - 1);
            pagination.page = Number(req.query.page);
          }
        }

        pagination.totalRecord = userCount.length;
        condition.push({
          $skip: pagination.skip,
        });
        condition.push({
          $limit: pagination.limit,
        });

        let userList = await User.aggregate(condition);

        return res.status(200).json({
          success: true,
          code: 200,
          message: "User List....",
          data: userList, pagination: pagination,
        });
      } else {
        return res.status(401).json({
          success: false,
          code: 401,
          message: "Not Authorized",
        });
      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }

  static async getAllPropertiesforAdmin(req, res, next) {
    try {

      const { cityCode, hName, hId } = req.query;
      const { property_id } = req.params;

      let pipeline = [{ $match: {} }];

      if (property_id) {
        pipeline.push({
          $match: {
            _id: new mongoose.Types.ObjectId(property_id)
          }
        });
      }

      if (cityCode) {
        pipeline.push({
          $match: {
            cityCode: cityCode
          }
        });
      }

      if (hId) {
        pipeline.push({
          $match: {
            hId: +hId
          }
        });
      }

      if (hName) {
        const hNamesArray = hName.split(",");
        pipeline.push({
          $match: {
            hName: { $in: hNamesArray },
          },
        });
      }


      const propertyCount = await User.aggregate(pipeline);
      const pagination = {
        skip: 0,
        limit: 1000,
      };

      if (req.query.limit) {
        pagination.limit = Number(req.query.limit);
        if (req.query.page) {
          pagination.skip = req.query.limit * (req.query.page - 1);
          pagination.page = Number(req.query.page);
        }
      }

      pagination.totalRecord = propertyCount.length;
      pipeline.push({
        $skip: pagination.skip,
      });
      pipeline.push({
        $limit: pagination.limit,
      });

      const data = await propertySchemaModel.aggregate(pipeline);

      if (property_id) {
        res.status(200).json({
          status: true,
          code: 200,
          message: "Data Fetched Successfully",
          data: data[0],
        });
      } else {
        res.status(200).json({
          status: true,
          code: 200,
          message: "Data Fetched Successfully",
          data,
        });
      }

    } catch (error) {
      console.log(error.message);
      return next(new ErrorHandler(error.message, 500));
    }
  };

  static async addUserIdByAdmin(req, res, next) {
    try {

      const { user_id } = req.body;
      const { property_id } = req.query;

      const user = await User.findById(user_id);
      if (!user.recent_property) {
        await User.findByIdAndUpdate(user_id, { recent_property: property_id });
      }

      const userPresent = await propertySchemaModel.findOne({ user_id: user_id });

      if (!userPresent) {
        const data = await propertySchemaModel.findByIdAndUpdate(property_id, { $push: { user_id: user_id } }, { new: true });
        return res.status(200).json({
          status: true,
          code: 200,
          message: "UserId Added Successfully",
          data
        });
      } else {
        return res.status(401).json({
          status: false,
          code: 409,
          message: "Already user Added",
        });
      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }

  static async cityList(req, res, next) {
    try {

      const { search } = req.query;
      let pipeline = [{ $match: {} }];

      if (search) {
        pipeline.push({
          $match: {
            $or: [
              { Name: RegExp(search, 'i') },
              { cityCode: RegExp(search, 'i') },
            ],
          }
        })
      }

      const data = await City.aggregate(pipeline);

      return res.status(200).json({
        status: true,
        code: 200,
        message: "Data Fetched Successfully",
        data
      })

    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }

  static async otaList(req, res, next) {
    try {

      let pipeline = [{ $match: {} }];

      const data = await OtaSchemaModel.aggregate(pipeline);

      return res.status(200).json({
        status: true,
        code: 200,
        message: "Data Fetched Successfully",
        data
      })

    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }

  static async statusUpdate(req, res, next) {
    try {

      const { userIds, reason, status } = req.body;

      const updatedDocuments = await User.updateMany({ _id: { $in: userIds } }, { is_active: status, reason: reason }, { multi: true });

      res.status(200).json({
        status: true,
        code: 200,
        message: "Users status updated Successfully"
      });

    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }

  static async ProfileView(req, res, next) {
    try {
      let _id = req.authData._id;

      if (!_id) {
        return res.status(422).json({
          status: false,
          code: 422,
          message: "Please provide token",
        });
      } else {
        let findUser = await User.findById({ _id }).lean();
        delete findUser.password;

        if (!findUser) {
          return res.status(404).json({
            status: false,
            code: 404,
            message: "Email Not Found",
          });
        } else {
          return res.status(200).json({
            status: true,
            code: 200,
            message: "Profile fetched..",
            data: findUser,
          });
        }
      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }

  static async getRoomDumpData(req, res, next) {

    if (req.authData) {
      const hid = +req.query.hid;

      //null check
      if (hid == null) {
        console.log('wrong hotel ID')
        return res.status(400).json({
          status: true,
          code: 200,
          data: 'Wrong hotel ID'
        });
      }

      //initalizing
      const id = [];
      var details = [];
      const propertyData = await propertySchemaModel.findOne({ hId: hid });

      const { compsetIds, hId } = propertyData;

      compsetIds.unshift(hId)

      // Use Promise.all to wait for all asynchronous operations to complete
      await Promise.all(compsetIds.map(async (item) => {
        let roomdump = await dump.find({ hId: item });
        if (roomdump) {
          details.push({
            'hId': item,
            'roomdump': roomdump
          });
        }
      }));

      //this function delete unnecessary ota from other hotel that are not present in my hotel//
      function filterSupportedOTA(myHotelId, hotelData) {
        // Find my hotel in the array
        const myHotel = hotelData.find((hotel) => hotel.hId === myHotelId);

        if (!myHotel) {
          console.error('Hotel not found');
          return hotelData; // Return the original array if my hotel is not found
        }

        // Get the list of supported OTAs by my hotel
        const supportedOTAs = myHotel.roomdump.map((room) => room.otaId);

        // Filter other hotels' data to include only supported OTAs
        const filteredHotelData = hotelData.map((hotel) => {
          if (hotel.hId === myHotelId) {
            return hotel; // Keep my hotel's data unchanged
          }

          // Filter out unsupported OTAs from other hotels
          const filteredRooms = hotel.roomdump.map((room) => {
            if (supportedOTAs.includes(room.otaId)) {
              return room;
            }
          });

          return {
            hId: hotel.hId,
            roomdump: filteredRooms.filter(Boolean), // Remove undefined values
          };
        });

        return filteredHotelData;
      }

      await User.findOneAndUpdate({_id:req.authData._id}, {$set : {accountStatus:"In-Progress"}})

      return res.status(200).json({
        status: true,
        code: 200,
        data: filterSupportedOTA(hId, details)
      });

    }
  }
  static async addRoom(req, res, next) {

    try {
      if (req.authData) {
        const roomDetails = new room({
          // _id : new mongoose.Types.ObjectId(req.authData._id),
          hId: req.body.hId,
          activeRooms: req.body.activeRooms
        });

        await roomDetails.save();

        let _id = req.authData._id;
        console.log(_id, 'vnbhbvhjb')
        let findUser = await User.findById({ _id }).lean();
        delete findUser.password;

        await User.findOneAndUpdate({ _id: _id }, { $set: { accountStatus: "in-progress" } })
        return res.status(200).json({
          status: true,
          code: 200,
          message: "data added successfully"
        });
      } else {
        return res.status(422).json({
          status: false,
          code: 422,
          message: "Please provide token",
        });
      }

    } catch (err) {
      console.log(err);
      return res.status(500).json({
        status: false,
        code: 500,
        message: "Internal server error"
      });
    }
  }

  static async notification(req, res, next) {

    try {

      let hId = req.query.hId ;
      if(!hId) {
        return res.status(404).json({
          status: false,
          code: 400,
          message: "hId is required"
        });
      }
      let notification= await HotelNotification.findOne({hId});
      console.log(notification)

      if(!notification){
        return res.status(404).json({
          status: false,
          code: 400,
          message: "notification is required",
          count: 0
        });
      }

       console.log(notification);
      return res.status(200).json({
          status: true,
          code: 200,
          message: "Data",
          data: notification ,
        });

    } catch (err) {
      console.log(err);
      return res.status(500).json({
        status: false,
        code: 500,
        message: "Internal server error"
      });
    }
  }

  static async getRates(req, res, next) {

    try {
      
      const { hId } = req.body
      if(!hId ){
        return res.status(404).json({
          status: false,
          code: 404,
          message: "hId are required",
      });
      }

      const reqBody = {
        "hId" : hId
      }
      let update= await propertySchemaModel.findOne({hId});
      if(!update){
        return res.status(404).json({
          status: false,
          code: 404,
          message: "hId is not found in the database",
          
        });
      }
      else{
      //const updateisExtrated = await propertySchemaModel.findOneAndUpdate({hId :hId}, {$set:{isExtrated:true}})
      const result = await axios.post(`${process.env.APIUrl}/getRates`, reqBody);
     // const update = await propertySchemaModel.findOneAndUpdate({hId :hId}, {$set:{isExtrated:false}},{new:true})
      let updateisExtrated;
      if(result.data.status===true){
        updateisExtrated= await propertySchemaModel.findOneAndUpdate({hId :hId}, {$set:{isExtracting:true}})
      }
      return res.status(200).json({
        status: true,
        code: 200,
        message: "sucess",
        data: result.data.status
      });
    }
    } catch (err) {
      console.log(err);
      return res.status(500).json({
        status: false,
        code: 500,
        message: "Internal server error"
      });
    }
  }

  static async extraction(req, res, next) {

    try {
      
      const hid= req.query.hId;
      let data = await propertySchemaModel.findOne({hId: hid})
      return res.status(200).json({
          status: true,
          code: 200,
          message: "extraction status",
          data: {"extractionStatus": data['isExtracting']},
        });
 
    } catch (err) {
      console.log(err);
      return res.status(500).json({
        status: false,
        code: 500,
        message: "Internal server error"
      });
    }
  }

}


export default AdminModel;
