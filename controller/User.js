import User from "../model/User.js";
import { signJwt } from "../middleware/auth.js";
import ErrorHandler from "../utils/errorHandler.js";
import bcrypt from "bcryptjs";
import Randomstring from "randomstring";
import otaModel from "../model/Ota.js";
import propertySchemaModel from "../model/Property.js";
import mongoose, { Mongoose } from "mongoose";
import roomSchemaModel from "../model/Room.js";
import propertyLinkSchemaModel from "../model/PropertyLink.js";
import { randomString } from "../middleware/custom.js";
import { sendMail } from "../utils/sendMail.js";
import ChannelManagerSchema from "../model/ChannelManager.js";
import CMModel from "../model/CM.js";
import priceBandSchema from "../model/BandRange.js";
import hotellogin from "../model/bi.js";

// Generate a single compsetId
const commonCompsetId = Randomstring.generate({
  charset: "numeric",
  length: 6,
});

class UserModel {
  static async UserLogin(req, res, next) {
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
        let findUser = await User.findOne({ email }).lean();
        const recent_property = findUser.recent_property;
        if (!findUser) {
          return res.status(404).json({
            status: false,
            code: 404,
            message: "Email Not Found",
          });
        } else {
          if (findUser.is_active === 0) {
            return res.status(401).json({
              status: false,
              code: 401,
              message: `Your account is not active due to ${findUser.reason}. Please contact to admin for more details.`,
            });
          }
          let findPropertyLink = await propertyLinkSchemaModel
            .find({ user_id: findUser._id })
            .lean();

          const validatePassword = await bcrypt.compare(
            password,
            findUser.password
          );
          // console.log(await bcrypt.hash(password,10));
          // console.log(findUser.password);

          if (validatePassword) {
            const _id = findUser._id;
            const role = findUser.role;
            const name = findUser.name;
            const email = findUser.email;
            const date = findUser.date;
            let added_by = findUser.added_by;
            //const hotels =findUser?.hotels

            const jwtToken = await signJwt({
              _id,
              role,
              name,
              email,
              added_by,
              date,
              // hotels
            });
            if (findUser.recent_property) {
              jwtToken.recent_property = findUser.recent_property;
              const Property = await propertySchemaModel.findById(
                findUser.recent_property
              );
              jwtToken.hId = Property.hId;
            } else {
              jwtToken.hId = findPropertyLink.at(-1)?.hId;
              if (findPropertyLink.length > 0) {
                jwtToken.is_property_link = true;

                let findProperty = await propertySchemaModel
                  .findOne({
                    hId: findPropertyLink.at(-1).hId,
                    recent_property: recent_property,
                  })
                  .lean();
                if (findProperty) {
                  let updateUser = await User.findByIdAndUpdate(
                    {
                      _id: findUser._id,
                    },
                    {
                      recent_property: findProperty._id,
                    },
                    { new: true }
                  ).lean();

                  jwtToken.recent_property = findProperty._id;
                }
              } else {
                jwtToken.is_property_link = false;
              }
            }

            return res.status(200).json({
              status: true,
              code: 200,
              message: "Logged in successfully!!",
              data: jwtToken,
            });
          } else {
            return res.status(401).json({
              code: 401,
              status: false,
              message: "Password didn't match",
            });
          }
        }
      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }

  static async propertyListing(req, res, next) {
    try {
      let condition = [
        {
          $unwind: { path: "$user_id", preserveNullAndEmptyArrays: true },
        },
        {
          $match: {
            user_id: new mongoose.Types.ObjectId(req.authData._id),
          },
        },
        {
          $unwind: { path: "$compsetIds", preserveNullAndEmptyArrays: true },
        },
        {
          $lookup: {
            from: "properties",
            localField: "compsetIds",
            foreignField: "hId",
            as: "ota",
          },
        },

        {
          $unwind: {
            path: "$ota",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "channel_managers",
            localField: "hId",
            foreignField: "hId",
            as: "channel_managers",
          },
        },
        {
          $unwind: {
            path: "$channel_managers",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $group: {
            _id: "$_id",
            hId: { $first: "$hId" },
            hName: { $first: "$hName" },
            user_id: { $first: "$user_id" },
            cityCode: { $first: "$cityCode" },
            compset_ota: {
              $push: {
                hId: "$ota.hId",
                hName: "$ota.hName",
                activeOta: "$ota.activeOta",
              },
            },
            activeOta: { $first: "$activeOta" },
            isRetvens: { $first: "$isRetvens" },
            rCode: { $first: "$rCode" },
            channel_manager: { $first: "$channel_managers" },
          },
        },
        {
          $project: {
            "channel_manager.cmcred.Password": 0, // Exclude the Password field
          },
        },
      ];

      const data = await propertySchemaModel.aggregate(condition);

      return res.status(200).json({
        code: 200,
        status: true,
        message: "Property List",
        data: data,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }

  static async switchProperty(req, res, next) {
    try {
      let property_id = req.query.id;

      if (!property_id) {
        return res.status(422).json({
          code: 422,
          status: false,
          message: "Please select property",
        });
      } else {
        let updateProperty = await User.findByIdAndUpdate(
          req.authData._id,
          { recent_property: property_id },
          { new: true }
        );

        delete updateProperty.password;

        return res.status(200).json({
          code: 200,
          status: false,
          message: "Switched property",
          data: updateProperty,
        });
      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }

  // static async ProfileView(req, res, next) {
  //   try {
  //     let _id = req.authData._id;
  //     if (!_id) {
  //       return res.status(422).json({
  //         status: false,
  //         code: 422,
  //         message: "Please provide token",
  //       });
  //     }
  //      else {
  //       let condition = [
  //         {
  //           $match: {
  //             _id: new mongoose.Types.ObjectId(req.authData._id),
  //           },
  //         },
  //         {
  //           $lookup: {
  //             from: "properties",
  //             localField: "recent_property",
  //             foreignField: "_id",
  //             as: "property",
  //           },
  //         },
  //         {
  //           $unwind: { path: "$property", preserveNullAndEmptyArrays: true },
  //         },
  //         {
  //           $project: {
  //             _id: 1,
  //             role: 1,
  //             name: 1,
  //             hCode:1,
  //             is_active: 1,
  //             is_profile_completed: 1,
  //             is_deleted: 1,
  //             email: 1,
  //             created_at: 1,
  //             recent_property: 1,
  //             accountStatus: 1,
  //             added_by: 1,
  //             property_name: "$property.hName",
  //           },
  //         },
  //       ];

  //       let findUser = await User.aggregate(condition);
  //       if (findUser.length === 0) {
  //         return res.status(404).json({
  //           status: false,
  //           code: 404,
  //           message: "Email Not Found",
  //         });
  //       } else {
  //         await User.updateOne({accountStatus:"signup"})
  //         return res.status(200).json({
  //           status: true,
  //           code: 200,
  //           message: "Profile fetched..",
  //           data: findUser[0],
  //         });
  //       }
  //     }
  //   } catch (error) {
  //     return next(new ErrorHandler(error.message, 500));
  //   }
  // }

  static async ProfileView(req, res, next) {
    try {
      let _id = req.authData._id;
      const findUser = await User.findById(_id);

      let hotelIds = findUser?.hotels?.map((hotel) => hotel.hId);

      //console.log(hotelIds);

      if (!_id) {
        return res.status(422).json({
          status: false,
          code: 422,
          message: "Please provide token",
        });
      } else {
        let findUser = await User.findOne({
          _id: new mongoose.Types.ObjectId(req.authData._id),
        });

        if (!findUser) {
          return res.status(404).json({
            status: false,
            code: 404,
            message: "Email Not Found",
          });
        } else {
          // Assuming you want to update the user's accountStatus to "signup"
          await User.updateOne(
            { _id: findUser._id },
            { accountStatus: "signup" }
          );

          // Array to store property names
          let propertyNames = [];

          // Iterate over hotelIds and find corresponding hName
          for (const hId of hotelIds) {
            const property = await propertySchemaModel.findOne({ hId: hId });

            const compsetIds = property?.compsetIds;
            //console.log(compsetIds)
            let compsetIdsArray = [];

            // Get compsetIds from the corresponding property
            const compsetproperty = await propertySchemaModel.find({
              hId: { $in: compsetIds },
            });

            // Extract hId, hName, and activeOta array from compsetIds and add them to the array
            compsetproperty.forEach((compsetProperty) => {
              compsetIdsArray.push({
                hId: compsetProperty.hId,
                hName: compsetProperty.hName,
                activeOta: compsetProperty.activeOta,
              });
            });

            if (property) {
              propertyNames.push({
                hId: property.hId,
                hName: property.hName,
                cityCode: property.cityCode,
                _id: property._id,
                activeOta: property.activeOta,
                compsetData: compsetIdsArray,
              });
            }
          }


          return res.status(200).json({
            status: true,
            code: 200,
            message: "Profile fetched..",
            data: {
              _id: findUser._id,
              role: findUser.role,
              name: findUser.name,
              hCode: findUser.hCode,
              is_active: findUser.is_active,
              is_profile_completed: findUser.is_profile_completed,
              is_deleted: findUser.is_deleted,
              email: findUser.email,
              created_at: findUser.created_at,
              recent_property: findUser.recent_property,
              accountStatus: findUser.accountStatus,
              added_by: findUser.added_by,
              property_name: propertyNames,
            },
          });
        }
      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }

  static async RoomListAccProperty(req, res, next) {
    try {
      let hId = req.query.hId;

      if (!hId) {
        return res.status(422).json({
          status: false,
          code: 422,
          message: "Please provide Hotel Id",
        });
      } else {
        let findfindRooms = await roomSchemaModel
          .findOne({ hId: req.query.hId })
          .lean();

        return res.status(200).json({
          status: true,
          code: 200,
          message: "Rooms fetched..",
          data: findfindRooms,
        });
      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }

  static async SignUp(req, res, next) {
    try {
      let email = req.body.email;
      let password = req.body.password;
      let name = req.body.name;

      if (!email && !password && !name) {
        return res.status(422).json({
          status: false,
          code: 422,
          message: "Please fill all the required field",
        });
      } else {
        let findUser = await User.findOne({ email }).lean();

        if (findUser) {
          return res.status(409).json({
            status: false,
            code: 409,
            message: "User Already exists",
          });
        }
        let findBiUser = await hotellogin
          .findOne({ email })
          .select("-_id -password")
          .lean();
        if (findBiUser) {
          // await bidata(findBiUser)
          return res.status(200).json({
            status: true,
            code: 200,
            message: "You already have an account in BI",
            userDetails: findBiUser,
          });
        } else {
          let encryptedPassword = await bcrypt.hash(req.body.password, 10);
          let newUser = await User.create({
            name: req.body.name,
            email: req.body.email,
            password: encryptedPassword,
            added_by: "SELF",
            accountStatus: "signedUp",
          });

          const _id = newUser._id;
          const role = newUser.role;
          const name = newUser.name;
          const email = newUser.email;
          const added_by = newUser.added_by;

          const jwtToken = await signJwt({ _id, role, name, email, added_by });

          return res.status(200).json({
            status: true,
            code: 200,
            message: "User registered",
            data: jwtToken,
          });
        }
      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }

  static async AddPropertyLink(req, res, next) {
    try {
      let user_id = req.body.id;

      if (!user_id) {
        return res.status(422).json({
          code: 422,
          status: false,
          message: "Please provide user id",
        });
      } else if (req.body.ota_detail.length >= 4) {
        return res.status(406).json({
          code: 406,
          status: false,
          message: "Limit exceeded",
        });
      } else {
        let findProperty = await propertySchemaModel.find().lean();
        let olHid =
          Math.max.apply(
            Math,
            findProperty.map((o) => o.hId)
          ) || 0;
        let findHidInpropertyLink = await propertyLinkSchemaModel.find().lean();
        let lastHid = findHidInpropertyLink.at(-1)?.hId || 0;

        let newhid;

        if (olHid > lastHid) {
          newhid = olHid + 1;
        } else {
          newhid = lastHid + 1;
        }

        let payload = {
          hId: newhid,
          user_id,
          ota_detail: req.body.ota_detail,
        };

        let newPropertyLink = await propertyLinkSchemaModel.create(payload);
        await User.findOneAndUpdate(
          { _id: new mongoose.Types.ObjectId(req.body.id) },
          { $set: { accountStatus: "in-progress" } }
        );

        return res.status(200).json({
          status: true,
          code: 200,
          message: "Link Added",
          data: newPropertyLink,
        });
      }
    } catch (error) {
      console.log(error);
      return next(new ErrorHandler(error.message, 500));
    }
  }

  static async forgotPassword(req, res, next) {
    try {
      const email = req.body.email;

      let findOldUser = await User.findOne({ email }).lean();

      if (!findOldUser) {
        return res.status(404).json({
          success: false,
          code: 404,
          message: "User does not exists",
        });
      } else {
        const randomPassword = await randomString(
          8,
          "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
        );
        const encryptedPassword = await bcrypt.hash(randomPassword, 10);
        await sendMail({
          email: email,
          subject: "New Password",
          template: "crudential-mail.ejs",
          data: {
            name: findOldUser.name ? findOldUser.name : "USER",
            password: randomPassword,
          },
        });

        await User.findOneAndUpdate(
          { email },
          {
            password: encryptedPassword,
          },
          { new: true }
        );
        res.status(200).json({
          status: true,
          code: 200,
          message: "New password sent to your registered email...",
        });
      }
    } catch (error) {
      console.log(error);
      return next(new ErrorHandler(error.message, 500));
    }
  }

  static async AddChannelManager(req, res, next) {
    try {
      let HId = req.body.hId;
      let channel_manager = req.body.channel_manager;
      let cmcred = req.body.cmcred;

      if (!HId && !channel_manager) {
        return res.status(422).json({
          status: false,
          code: 422,
          message: "Please fill all the required field",
        });
      } else {
        let findChannelManager = await ChannelManagerSchema.findOne({
          hId: req.body.hId,
          is_deleted: false, // Adding is_deleted condition here
        }).lean();

        if (findChannelManager) {
          return res.status(406).json({
            status: false,
            code: 406,
            message: "Channel Manager already added for the property",
          });
        } else {
          let newChannelManager = await ChannelManagerSchema.create({
            cmcred,
            channel_manager,
            hId: HId,
          });

          return res.status(200).json({
            status: true,
            code: 200,
            message: "Channel Manager Added",
            data: newChannelManager,
          });
        }
      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }

  static async channelManagerDetail(req, res, next) {
    try {
      let hId = req.query.hId;

      if (!hId) {
        return res.status(422).json({
          status: false,
          code: 422,
          message: "Please provide hotel Id",
        });
      } else {
        let findChannelManager = await ChannelManagerSchema.findOne({
          $and: [
            {
              hId: +req.query.hId,
            },
            { is_deleted: false },
          ],
        }).lean();

        if (!findChannelManager) {
          return res.status(404).json({
            status: false,
            code: 404,
            message: "Channel Manager not added",
          });
        } else {
          return res.status(200).json({
            status: true,
            code: 200,
            message: "Channel Manager detail",
            data: findChannelManager,
          });
        }
      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }

  static async editChannelManager(req, res, next) {
    try {
      let hId = req.body.id;

      if (!hId) {
        return res.status(422).json({
          status: false,
          code: 422,
          message: "Please provide hotel Id",
        });
      } else {
        let findChannelManager = await ChannelManagerSchema.findOne({
          hId: req.body.id,
        }).lean();

        if (!findChannelManager) {
          return res.status(404).json({
            status: false,
            code: 404,
            message: "Channel Manager not added",
          });
        } else {
          let channel_manager =
            req?.body?.channel_manager || findChannelManager?.channel_manager;
          let cmcred = req?.body?.cmcred || findChannelManager?.cmcred;
          let updateChannelManager =
            await ChannelManagerSchema.findOneAndUpdate(
              {
                hId: req.body.id,
              },
              {
                channel_manager,
                cmcred,
              },
              {
                new: true,
              }
            ).lean();

          return res.status(200).json({
            status: true,
            code: 200,
            message: "Channel Manager detail",
            data: updateChannelManager,
          });
        }
      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }

  static async deleteChannelManager(req, res, next) {
    try {
      let hId = req.params.id;

      if (!hId) {
        return res.status(422).json({
          status: false,
          code: 422,
          message: "Please provide hotel Id",
        });
      } else {
        let findChannelManager = await ChannelManagerSchema.updateMany(
          {
            hId: +req.params.id,
          },
          {
            is_deleted: true,
          },
          { new: true }
        ).lean();

        return res.status(200).json({
          status: true,
          code: 200,
          message: "Channel Manager removed",
        });
      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }

  static async resetPassword(req, res, next) {
    try {
      let _id = req.authData._id;
      let oldPass = req.body.oldPass;
      let newPass = req.body.newPass;

      let findOldUser = await User.findById(_id).lean();

      if (!findOldUser) {
        return res.status(404).json({
          success: false,
          code: 404,
          message: "User does not exists",
        });
      } else {
        const validatePassword = await bcrypt.compare(
          oldPass,
          findOldUser.password
        );

        if (!validatePassword) {
          return res.status(401).json({
            status: true,
            code: 401,
            message: "Entered wrong old password",
          });
        } else {
          const encryptedPassword = await bcrypt.hash(newPass, 10);

          await User.findByIdAndUpdate(
            { _id },
            {
              password: encryptedPassword,
            }
          );
          return res.status(200).json({
            status: true,
            code: 200,
            message: "Password updated..",
          });
        }
      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }

  static async editPropertyName(req, res, next) {
    try {
      let _id = req.body.id;

      if (!_id) {
        return res.status(422).json({
          status: false,
          code: 422,
          message: "Please provide Id",
        });
      } else {
        let findProperty = await propertySchemaModel.findById(_id).lean();

        if (!findProperty) {
          return res.status(404).json({
            status: false,
            code: 404,
            message: "Property not found",
          });
        } else {
          let hName = req?.body?.hName || findProperty?.hName;

          let updateChannelManager = await propertySchemaModel
            .findByIdAndUpdate(
              _id,
              {
                hName,
              },
              {
                new: true,
              }
            )
            .lean();

          return res.status(200).json({
            status: true,
            code: 200,
            message: "Property name updated",
          });
        }
      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }

  // static async propertyLinkView(req, res, next) {
  //   try {
  //     let hId = +req.query.id;

  //     if (!hId) {
  //       return res.status(422).json({
  //         status: false,
  //         code: 422,
  //         message: "Please provide hotel Id",
  //       });
  //     } else {
  //       let findProperty = await propertyLinkSchemaModel
  //         .findOne({ hId })
  //         .lean();

  //       if (!findProperty) {
  //         return res.status(404).json({
  //           status: false,
  //           code: 404,
  //           message: "Property not found",
  //         });
  //       } else {
  //         return res.status(200).json({
  //           status: true,
  //           code: 200,
  //           message: "Property link fetched",
  //           data: findProperty,
  //         });
  //       }
  //     }
  //   } catch (error) {
  //     return next(new ErrorHandler(error.message, 500));
  //   }
  // }
  static async propertyLinkView(req, res, next) {
    try {
      let hId = +req.query.id;

      if (!hId) {
        return res.status(422).json({
          status: false,
          code: 422,
          message: "Please provide hotel Id",
        });
      } else {
        let findProperty = await propertyLinkSchemaModel
          .findOne({ hId })
          .lean();

        let otaDetailArray = findProperty.ota_detail.map((ota) => {
          return ota.ota_name;
        });

        const getOtaImages = await otaModel
          .find({
            otaName: { $in: otaDetailArray },
          })
          .select("otaImage otaName -_id");
        // console.log(getOtaImages, "Aefrht")
        // console.log(otaDetailArray, "sdfs");

        // Add otaName from getOtaImages to each OTA in findProperty
        findProperty.ota_detail.forEach((ota) => {
          const matchingOtaImage = getOtaImages.find(
            (img) => img.otaName === ota.ota_name
          );
          if (matchingOtaImage) {
            ota.ota_image = matchingOtaImage.otaImage;
          } else {
            ota.ota_image = "";
          }
        });

        if (!findProperty) {
          return res.status(404).json({
            status: false,
            code: 404,
            message: "Property not found",
          });
        } else {
          return res.status(200).json({
            status: true,
            code: 200,
            message: "Property link fetched",
            data: findProperty,
          });
        }
      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }

  static async editPropertyLink(req, res, next) {
    try {
      let hId = req.body.hId;

      if (!hId) {
        return res.status(422).json({
          code: 422,
          status: false,
          message: "Please provide hotel id",
        });
      } else {
        let updatedPropertyLink =
          await propertyLinkSchemaModel.findOneAndUpdate(
            { hId },
            {
              $push: {
                ota_detail: req.body.ota_detail,
              },
            },
            {
              new: true,
            }
          );

        // console.log(updatedPropertyLink, "updatedPropertyLink");
        return res.status(200).json({
          status: true,
          code: 200,
          message: "Link Added",
          data: updatedPropertyLink,
        });
      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }

  static async competitorList(req, res, next) {
    try {
      let hId = req.query.hId;

      if (!hId) {
        return res.status(422).json({
          code: 422,
          status: false,
          message: "Please provide hotel id",
        });
      } else {
        let condition = [
          {
            $match: {
              hId: +req.query.hId,
            },
          },
          {
            $unwind: "$compsetIds",
          },
          {
            $lookup: {
              from: "properties",
              localField: "compsetIds",
              foreignField: "hId",
              as: "property",
            },
          },
          {
            $unwind: "$property",
          },
          {
            $group: {
              _id: "$hId",
              property: {
                $push: { hName: "$property.hName", hId: "$property.hId" },
              },
            },
          },
        ];
        let findCompetitor = await propertySchemaModel.aggregate(condition);

        return res.status(200).json({
          status: true,
          code: 200,
          message: "Link Added",
          data: findCompetitor[0],
        });
      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }

  static async removeCompset(req, res, next) {
    try {
      let hId = +req.query.hId;
      let compsetId = +req.query.compsetId;

      if (!hId || !compsetId) {
        return res.status(422).json({
          code: 422,
          status: false,
          message: "Please provide all the required field",
        });
      } else {
        let findCompetitor = await propertySchemaModel.findOne({ hId });

        let findIndex = await findCompetitor.compsetIds.findIndex((e) => {
          return e === +req.query.compsetId;
        });

        let updateCompetitior = await propertySchemaModel.findOneAndUpdate(
          { hId },
          { $pull: { compsetIds: +req.query.compsetId } },
          {
            new: true,
          }
        );
        const updatecompSetRule = await priceBandSchema.findOneAndUpdate(
          { hotelId: hId },
          {
            $pull: {
              compSetRule: {
                compSetId: +req.query.compsetId,
              },
            },
          },
          { new: true }
        );
        let findPropertyLink = await propertyLinkSchemaModel
          .findOne({ hId })
          .lean();

        // Iterate through ota_detail to remove the compsetId from propertyLinkSchemaModel
        let updatedOtaDetail = findPropertyLink?.ota_detail.map((e) => {
          let obj = { ...e };
          obj.competitor = obj.competitor.filter((competitor) => {
            return competitor.compsetId !== +req.query.compsetId;
          });
          return obj;
        });

        let updatePropertyLink = await propertyLinkSchemaModel.findOneAndUpdate(
          { hId },
          { $set: { ota_detail: updatedOtaDetail } },
          {
            new: true,
          }
        );

        return res.status(200).json({
          status: true,
          code: 200,
          message: "Removed competitior",
          data: findCompetitor[0],
        });
      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }

  static async fetchMyOta(req, res, next) {
    try {
      let condition = [
        {
          $match: {
            $and: [
              { hId: +req.query.hId },
              { user_id: new mongoose.Types.ObjectId(req.authData._id) },
            ],
          },
        },
        {
          $unwind: "$ota_detail",
        },
        {
          $group: {
            _id: "$_id",
            hId: { $first: "$hId" },
            ota_name: { $push: "$ota_detail.ota_name" },
          },
        },
      ];

      let findOta = await propertyLinkSchemaModel.aggregate(condition);

      return res.status(200).json({
        status: true,
        code: 200,
        message: "My Ota List...",
        data: findOta,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }

  // static async addNewCompset(req, res, next) {
  //   try {
  //     let hId = req.body.hId;

  //     let ota_detail = req.body.ota_detail;

  //     let findHidInpropertyLink = await propertyLinkSchemaModel
  //       .findOne({ hId: req.body.hId })
  //       .lean();

  //     if (findHidInpropertyLink.ota_detail.length > 5) {
  //       return res.status(406).json({
  //         status: true,
  //         code: 406,
  //         message: "Competitor limit exceeded"
  //       });
  //     } else {
  //       let newDetail = await findHidInpropertyLink.ota_detail.map((e) => {
  //         req.body.ota_detail.map((el) => {
  //           if (e.ota_name === el.ota_name) {
  //             e.competitor.push({
  //               name: el.compset_name,
  //               link: el.compset_link,
  //             });
  //           }
  //         });
  //         return e;
  //       });

  //       let updatePropertyLink = await propertyLinkSchemaModel.findOneAndUpdate(
  //         { hId },
  //         { $set: { ota_detail: newDetail } },
  //         { new: true }
  //       );

  //       console.log(newDetail, "newDetailnewDetailnewDetailnewDetailnewDetail");
  //       return res.status(200).json({
  //         status: true,
  //         code: 200,
  //         message: "Removed competitior",
  //         data: updatePropertyLink,
  //       });
  //     }
  //   } catch (error) {
  //     return next(new ErrorHandler(error.message, 500));
  //   }
  // }

  // static async addNewCompset(req, res, next) {
  //   try {
  //     const hId = req.body.hId; // Assuming the hId is in the route parameters
  //     const otaDetails = req.body.ota_detail;

  //     const findHidInpropertyLink = await propertyLinkSchemaModel
  //       .findOne({ hId })
  //       .lean();

  //     if (!findHidInpropertyLink) {
  //       return res.status(404).json({
  //         status: false,
  //         code: 404,
  //         message: "Property link not found"
  //       });
  //     }

  //     const updatedOtaDetails = findHidInpropertyLink.ota_detail.map((existingOta) => {
  //       const matchedOta = otaDetails.find((newOta) => newOta.ota_name === existingOta.ota_name);
  //       if (matchedOta) {
  //         const totalCompetitors = existingOta.competitor.length + matchedOta.competitor.length;
  //         if (totalCompetitors <= 5) {
  //           existingOta.competitor = [
  //             ...existingOta.competitor,
  //             ...matchedOta.competitor.slice(0, 5 - existingOta.competitor.length)
  //           ];
  //         } else {
  //           return res.status(406).json({
  //             status: false,
  //             code: 406,
  //             message: `Competitor limit exceeded for ${existingOta.ota_name}`
  //           });
  //         }
  //       }
  //       return existingOta;
  //     });

  //     const updatePropertyLink = await propertyLinkSchemaModel.findOneAndUpdate(
  //       { hId },
  //       { $set: { ota_detail: updatedOtaDetails } },
  //       { new: true }
  //     );

  //     console.log(updatedOtaDetails, "Updated OTA Details");

  //     return res.status(200).json({
  //       status: true,
  //       code: 200,
  //       message: "Added competitor details",
  //       data: updatePropertyLink,
  //     });
  //   } catch (error) {
  //     return next(new ErrorHandler(error.message, 500));
  //   }
  // }

  static async addNewCompset(req, res, next) {
    try {
      const hId = req.body.hId;
      const otaDetails = req.body.ota_detail;

      // Generate a new compsetId for each API call
      const commonCompsetId = Randomstring.generate({
        charset: "numeric",
        length: 6,
      });

      const findHidInpropertyLink = await propertyLinkSchemaModel
        .findOne({ hId })
        .lean();

      if (!findHidInpropertyLink) {
        return res.status(404).json({
          status: false,
          code: 404,
          message: "Property link not found",
        });
      }

      const newCompSetRule = {
        compSetId: commonCompsetId,
        priceChange: 0,
        type: "",
        adjustPrice: "",
      };

      const updatedOtaDetails = findHidInpropertyLink.ota_detail.map(
        (existingOta) => {
          const matchedOta = otaDetails.find(
            (newOta) => newOta.ota_name === existingOta.ota_name
          );
          if (matchedOta) {
            const totalCompetitors =
              existingOta.competitor.length + matchedOta.competitor.length;
            if (totalCompetitors <= 5) {
              const competitorsToAdd = matchedOta.competitor.slice(
                0,
                5 - existingOta.competitor.length
              );
              competitorsToAdd.forEach((comp) => {
                existingOta.competitor.push({
                  compsetId: commonCompsetId, // Use the common compsetId for all competitors within this API call
                  name: comp.name,
                  link: comp.link,
                });
              });
            } else {
              return res.status(406).json({
                status: false,
                code: 406,
                message: `Competitor limit exceeded for ${existingOta.ota_name}`,
              });
            }
          }
          return existingOta;
        }
      );

      const updatePropertyLink = await propertyLinkSchemaModel.findOneAndUpdate(
        { hId },
        { $set: { ota_detail: updatedOtaDetails } },
        { new: true }
      );
      const updatecompSetRule = await priceBandSchema.findOneAndUpdate(
        { hotelId: hId },
        {
          $push: {
            compSetRule: {
              $each: [newCompSetRule],
              $position: 0,
            },
          },
        },
        { new: true }
      );

      // console.log(updatedOtaDetails, "Updated OTA Details");
      // console.log(updatecompSetRule, "Updated updatecompSetRule Details");

      return res.status(200).json({
        status: true,
        code: 200,
        message: "Added competitor details",
        data: updatePropertyLink,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }

  static async getChannelManager(req, res, next) {
    try {
      const data = await CMModel.find();
      return res.status(200).json({
        status: true,
        code: 200,
        message: "Successfully fetched",
        data: data,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }

  static async bidata(req, res, next) {
    let findBiUser = await hotellogin.findOne({ email: req.body.email }).lean();
    let encryptedPassword = await bcrypt.hash(findBiUser.password, 10);

    let newUser = new User({
      email: findBiUser.email,
      name: findBiUser.name,
      password: encryptedPassword,
      added_by: "SELF",
      accountStatus: "signedUp",
    });

    await newUser.save();

    const _id = newUser._id;
    const role = newUser.role;
    const name = newUser.name;
    const email = newUser.email;
    const added_by = newUser.added_by;

    const jwtToken = await signJwt({ _id, role, name, email, added_by });

    return res.status(200).json({
      status: true,
      code: 200,
      message: "User registered",
      data: jwtToken,
    });
  }
  static async getmobileNumber(req, res, next) {
    try {
      let _id = req.authData._id;

      const data = await User.find({ _id }).select(
        "mobileNumber notification.whatsApp notification.email"
      );
      return res.status(200).json({
        status: true,
        code: 200,
        message: "Successfully fetched",
        data: data,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
  static async patchmobileNumber(req, res, next) {
    try {
      let _id = req.authData._id;
      if (!_id) {
        return res.status(401).json({
          status: false,
          code: 401,
          message: "authcode is required",
        });
      }
      const findUser = await User.findById(_id);

      if (!findUser) {
        return res.status(401).json({
          status: false,
          code: 401,
          message: "email is does not exist",
        });
      }

      let { newPhone,notification } = req.body;
      console.log(req.body)

      if (!newPhone && !notification) {
        return res.status(401).json({
          status: false,
          code: 401,
          message: "body is required",
        });
      }

      let findOldPhone = findUser["mobileNumber"];
      let updateUser 
      if (newPhone){

        updateUser = await User.findOneAndUpdate(
          { _id: new mongoose.Types.ObjectId(_id) },
          {
            $set: {
              mobileNumber: newPhone
            }
          }
        
        );
      }
        updateUser = await User.findOneAndUpdate(
          { _id: new mongoose.Types.ObjectId(_id) },
          {
            $set: {
              'notification.whatsApp': notification.whatsApp
            }
          }
        
        );

        updateUser = await User.findOneAndUpdate(
          { _id: new mongoose.Types.ObjectId(_id) },
          {
            $set: {
              'notification.email': notification.email
            }
          }
        
        );
      return res.status(200).json({
        status: true,
        code: 200,
        message: " newPhone is updated sucessfully",
        data: updateUser,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
}

export default UserModel;
