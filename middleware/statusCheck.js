import User from "../model/User.js";
import ErrorHandler from "../utils/errorHandler.js";

async function checkUserStaus(req, res, next) {
  try {
    let auth = req.authData._id;
    let findUserStatus = await User.findById(auth).lean();

    if (findUserStatus.is_active === 0) {
      return res.status(401).json({
        status: false,
        code: 401,
        message: `Your account is not active due to ${findUserStatus.reason}. Please contact to admin for more details.`,
      });
    } else {
      next();
    }
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
}

export { checkUserStaus };
