// require('dotenv').config({path:"./env"});

import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";
const port  = process.env.PORT || 8080;
dotenv.config({
  path: "./env",
});

connectDB()
.then(()=>{
    app.on("error",(error)=>{
        console.log("Error: ", error);
        throw error;
    })
    app.listen(port,()=>{
        console.log(`server is listening on port : ${port}`)
    })
})
.catch((error)=>{
    console.log("MONGODB connection failed !!! ",error);
})
