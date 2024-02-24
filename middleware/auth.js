import JWT from 'jsonwebtoken';
import User from '../model/User.js'
import ErrorHandler from '../utils/errorHandler.js'
import propertySchemaModel from '../model/Property.js';

async function signJwtBi(payloadData) {
  const jwtPayload = payloadData;

  const addToken = { ...payloadData };

  // JWT token with Payload and secret.
  addToken.token = JWT.sign(jwtPayload, process.env.jwtsecretkey, {
    expiresIn: process.env.ACCESS_TOKEN_TIMEOUT_DURATION,
  });

  return addToken;
}


async function signJwt(payloadData) {
  const jwtPayload = payloadData;

  const addToken = { ...payloadData };

  // JWT token with Payload and secret.
  addToken.token = JWT.sign(jwtPayload, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_TIMEOUT_DURATION,
  });

  return addToken;
}

async function verifyJwt(req, res, next) {
  const { authorization } = req.headers;

  try {
    if (!authorization) {
      return res.status(401).json({
        success: false,
        code: 401,
        message: "Not Authorized",
      });
    } else if (authorization) {
      const verifyValidToken = JWT.decode(authorization);

      if (!verifyValidToken) {
        return res
          .status(401)
          .json({ success: false, code: 401, message: "Not Authorized" });
      } else {
        const decoded = await JWT.verify(
          authorization,
          process.env.ACCESS_TOKEN_SECRET,
          {
            ignoreExpiration: true,
          }
        );

        const findUserWithAuth = await User.findOne({
          email: decoded.email,
        }).populate({
          path : "recent_property",
          model : propertySchemaModel,
          select : "extractionDate extractionCount hId"
        }).lean();

        const todayDate = new Date().getTime();

        if (decoded.exp < todayDate / 1000) {
          return res
            .status(401)
            .json({ status: false, code: 401, message: "Not Authorized" });
        } else if (decoded.is_active && decoded.is_active === 0) {
          return res
            .status(401)
            .json({ status: false, code: 401, message: "Not Authorized" });
        } else if (findUserWithAuth) {
          req.authData = decoded;
          req.propertyData = findUserWithAuth.recent_property;
          next();
        } else {
          return res
            .status(401)
            .json({ status: false, code: 401, message: "Not Authorized" });
        }
      }
    }
  } catch (error) {
    if (error.message === "invalid signature") {
      return res
        .status(401)
        .json({ status: false, code: 401, message: "Not Authorized" });
    } else {
      return next(new ErrorHandler(error.message, 500));
    }
  }
}

export { signJwtBi, signJwt, verifyJwt };
