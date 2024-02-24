import dotenv from "dotenv";
dotenv.config({ path: "./.env" });
import ejs from "ejs";
import path from "path";
import sgMail from '@sendgrid/mail';
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// const sendMail = async (options) => {
//   // Create a reusable transporter object using the default SMTP transport
//   let transporter = nodeMailer.createTransport({
//     host: process.env.SMTP_HOST,
//     port: process.env.SMTP_PORT,
//     service: process.env.SMTP_SERVICE,
//     auth: {
//       user: process.env.SMTP_MAIL,
//       pass: process.env.SMTP_PASSWORD,
//     },
//   });

//   console.log(
//     process.env.SMTP_HOST,
//     "process.env.SMTP_HOST",
//     process.env.SMTP_PORT,
//     process.env.SMTP_SERVICE,
//     process.env.SMTP_MAIL,
//     process.env.SMTP_PASSWORD
//   );

//   const { email, subject, template, data } = options;

//   let __dirname = path.resolve();

//   // Specify the path to the EJS template
//   const templatePath = path.resolve(__dirname, "./mails", template);

//   // Render the EJS template
//   const html = await ejs.renderFile(templatePath, data);

//   // Setup email data with unicode symbols
//   const mailOptions = {
//     from: process.env.SMTP_MAIL,
//     to: email,
//     subject, // Subject line
//     html, // html body
//   };

//   // Send mail with defined transport object
//   await transporter.sendMail(mailOptions);
// };


const sendMail = async (options) => {
  const { email, subject, template, data } = options;

  let __dirname = path.resolve();

  // Specify the path to the EJS template
  const templatePath = path.resolve(__dirname, "./mails", template);

  // Render the EJS template
  const html = await ejs.renderFile(templatePath, data);

  // Setup email data with unicode symbols
  const msg = {
    to: email, // Change to your recipient
    from: process.env.SENDGRID_MAIL, // Change to your verified sender
    subject: subject,
    html: html,
  };

  // Send mail with defined transport object
  await sgMail.send(msg);
};


export { sendMail };
