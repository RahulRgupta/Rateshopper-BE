import ContactUs from "../model/ContactUs.js";

class ContactModel {
    static async contactus(req, res, next) {
        try {
            const {
                email,
                description
            } = req.body;

            await ContactUs.create({
                email,
                description
            });

            // Email Send TODO

            return res.status(200).json({
                code: 200,
                status: true,
                message: "We Will Contact You With in Few Days",
            });

            return res.status(200).json({
                success: true,
                code: 200,
                message: "We Will Contact You With-In Few Days",
            });
        } catch (error) {
            return next(new ErrorHandler(error.message, 500));
        }
    }
}

export default ContactModel;
