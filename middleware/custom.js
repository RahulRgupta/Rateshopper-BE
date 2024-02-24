
import crypto from 'crypto';
import RankingSchemaModel from '../model/HotelRanking.js';
import axios from 'axios';
import qs from 'qs';


export async function randomString(
  length,
  chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
) {
  if (!chars) {
    throw new Error('Argument chars is undefined');
  }

  const charsLength = chars.length;
  if (charsLength > 256) {
    throw new Error(
      'Argument chars should not have more than 256 characters' +
        ', otherwise unpredictability will be broken',
    );
  }

  const randomBytes = crypto.randomBytes(length);
  const result = new Array(length);

  let cursor = 0;

  for (let i = 0; i < length; i += 1) {
    cursor += randomBytes[i];
    result[i] = chars[cursor % charsLength];
  }
  return result.join('');
}

export async function getDaysArray (start, end) {
  for (
    var arr = [], dt = new Date(start);
    dt <= new Date(end);
    dt.setDate(dt.getDate() + 1)
  ) {
    arr.push(JSON.stringify(dt).split('T')[0].slice(1));
  }
  return arr;
};

export async function calcPc (n1, n2) {
  if (n2 === 0 && n1 === 0) {
    return 0;
  } else if (n1 === 0) {
    return 100;
  } else if (n2 === 0) {
    return -100;
  } else {
    let P = n2 == 0 ? 1 : n2;
    return (
      parseInt((((n2 - n1) / P) * 100).toFixed(2)) || 0
    );
  }
};

export const findData = (cityCode) => {
  try {
    return RankingSchemaModel.findOne({ cityCode: cityCode }).sort({_id:-1}).select("timestamp");
  } catch (error) {
    console.error('Error in findData:', error);
    throw error; // Rethrow the error or handle it as appropriate for your application.
  }
};

export function categorizeDay(dateString) {
  const dayOfWeek = new Date(dateString).getDay();
  return dayOfWeek >= 1 && dayOfWeek <= 5 ? 'weekday' : 'weekend';
}



// // Function to send WhatsApp message
// export const sendWhatsAppMessage = async (messages, userMobileNumber) => {
//   try {
//     // Ensure userMobileNumbers is an array
//    // userMobileNumber = Array.isArray(userMobileNumber) ? userMobileNumber : [userMobileNumber];
//     const data = qs.stringify({
//       "token": "whs896dr2a2ztzta",
//       "to": userMobileNumber, // Join multiple mobile numbers with a comma
//       "filename": "Pickup(13/02/2024).xlsx",
//       "document": "https://rown-space-bucket.nyc3.digitaloceanspaces.com/hotel_images/sheet.xlsx",
//       "caption": "Your today's daily pickup! To know more click \n \n https://pulse.retvenstechnologies.com"
//     });

//     const config = {
//       method: 'post',
//       url: 'https://api.ultramsg.com/instance54915/messages/document',
//       headers: {
//         'Content-Type': 'application/x-www-form-urlencoded'
//       },
//       data: data
//     };

//     const response = await axios(config);
//   } catch (error) {
//     console.error(error);
//   }
// };
// Function to send WhatsApp message
export const sendWhatsAppMessage = async (messages, userMobileNumber) => {
  try {
    // Ensure userMobileNumbers is an array
   // userMobileNumber = Array.isArray(userMobileNumber) ? userMobileNumber : [userMobileNumber];
    const data = qs.stringify({
      "token": "whs896dr2a2ztzta",
      "to": userMobileNumber, // Join multiple mobile numbers with a comma
      "body": messages // Join messages with double new lines
    });
    console.log(data, 'clgggggggggg')

    const config = {
      method: 'post',
      url: 'https://api.ultramsg.com/instance54915/messages/chat',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: data
    };

    const response = await axios(config);
    
    console.log(JSON.stringify(response.data));
  } catch (error) {
    console.error(error);
  }
};


export function convertToCurrentDate(originalDateString) {
  const originalDate = new Date(originalDateString);
  const currentDate = new Date();
  originalDate.setFullYear(currentDate.getFullYear());
  originalDate.setMonth(currentDate.getMonth());
  originalDate.setDate(currentDate.getDate());
  const year = originalDate.getFullYear();
  const month = originalDate.getMonth() + 1;
  const day = originalDate.getDate();
  const formattedCurrentDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  return formattedCurrentDate;

}
export function getTodaysDate() {
  const today = new Date();
  
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are zero-based
  const day = String(today.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}