import ErrorHandler from '../utils/errorHandler.js'

const ErrorMiddleware = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.message = err.message || 'Internal Servel Error'

    // Wrong mongodb id Error
    if(err.name === 'CastError'){
        const messgae = `Resource not found. Invalid: ${err.path}`
        err = new ErrorHandler(messgae, 400);
    }

    // Duplicate Key Error
    if(err.statusCode === 11000){
        const messgae = `Duplicate ${Object.keys(err.keyValue)} entered`
        err = new ErrorHandler(messgae, 400);
    }

    // wrong JWT error
    if(err.name === 'JsonWebTokenError'){
        const messgae = `Json web token is invalid, try again.`
        err = new ErrorHandler(messgae, 400);
    }

    // wrong JWT expire error
    if(err.name === 'TokenExpiredError'){
        const messgae = `Json web token is expired, try again.`
        err = new ErrorHandler(messgae, 400);
    }

    res.status(err.statusCode).json({
        success : false,
        message : err.message
    });
}

export { ErrorMiddleware }