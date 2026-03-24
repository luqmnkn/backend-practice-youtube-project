import { connectDB } from "./db/index.js"
// ('dotenv').config({path: './env'})
import dotenv from "dotenv"

dotenv.config({
    path:'./.env',
    quiet: true
})

connectDB()





































// import mongoose from "mongoose" 
// import { DB_NAME } from "./constants"
// import express from "express"
// const app = express()



// ; ( async ()=>{
//     try {
//        await mongoose.connect(`${process.env.MONGODB_URI}`/`${DB_NAME}`)
//        app.on("error" , ()=>{
//         console.log(error , "band aya ha");
//         throw error
//        })

//        app.listen(process.env.PORT , ()=>{
//         console.log("listening on" `${process.env.PORT}`)
//        })
//     } catch (error) {
//         console.error(error ,"this was you band")
//         throw err
//     }
// })


