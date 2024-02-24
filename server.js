import app from './app.js'
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });



// import { connectDB } from './utils/db.js';
import './utils/db2.js';
import './utils/db.js';

const port = process.env.PORT; 
// creating a server
app.listen(port, ()=>{
    console.log(`Server is Running at ${port}`);
    // connectDB();

})