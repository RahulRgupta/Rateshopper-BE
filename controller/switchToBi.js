import { signJwt, signJwtBi } from "../middleware/auth.js";
import hotellogin from "../model/bi.js";
import Jwt from "jsonwebtoken";
import hotelRecord from "../model/hotelRecordsBi.js"
const biLogin = async (req, res) => {
  const email = req.body.email;

  const bi = await hotellogin.findOne({ email });

  const data = bi.hotelCode;

  const d = await Promise.all(data.map(async (element) => {
    const records = await hotelRecord.findOne({ hotelCode: element.hotelCode });
    return records;
  }));

  const hotelNames = d.map((record) => record.hotelName);
  
  const details = data.map((element, index) => ({
    hotelCode: element.hotelCode,
    hotelName: hotelNames[index]
  }));


  if (!bi) {
    return res.status(401).json({
      message: "Data not found",
    });
  }


  const jwtToken = await signJwtBi({
    email,
    // _id : bi.id,
  });


  return res.status(200).json({
    data: {
      jwtToken,
      details,
    }
  });

};
export default biLogin;
