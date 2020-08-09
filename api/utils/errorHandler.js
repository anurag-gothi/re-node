//importing the error response module
const ErrorResponse = require("./errorResponse");
const errorHandler = (err, req, res, next) => {
    console.log(err);

    let error = { ...err };
    error.message = err.message;

    //checking for badly formatted object id
    if (err.name === "CastError") {
        const message = `Document or Record not found. Wrong ID formate`;
        error = new ErrorResponse(message, 404);
    }

    //checking for duplicate values
    if (err.code === 11000) {
        const message = "Duplicate value found in database";
        error = new ErrorResponse(message, 409);
    }

    //checking for validation error
    if (err.name === "ValidationError") {
        const message = Object.values(err.errors).map((val) => val.message);
        error = new ErrorResponse(message, 422);
    }
    res
        .status(error.statusCode || 500)
        .json({ success: false, error: error.message || "Server Error" });
};

//exporting the module
module.exports = errorHandler;