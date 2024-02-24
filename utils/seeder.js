import fs from "fs";
import User from "../model/User.js";
import bcrypt from "bcryptjs";

/* *************************** Multiple Admin ************************* */
export async function seedAdmin() {
  try {
    const findAdmin = await User.findOne({
      email: "rateshopper.retvens@gmail.com",
    });
    const tempPassword = "retvens@123";

    const encryptedPassword = await bcrypt.hash(tempPassword, 10);

    if (!findAdmin) {
      const seeding = await User.create({
        email: "rateshopper.retvens@gmail.com",
        name: "Rate Shopper",
        password: encryptedPassword,
        verified: true,
        role:"ADMIN"
      });
    }
    return true;
  } catch (error) {
    console.log("From Seeder Function", error);
  }
}
