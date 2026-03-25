import { connectDB } from "./db/index.js"
// ('dotenv').config({path: './env'})
import dotenv from "dotenv"

dotenv.config({
    path:'./.env',
    quiet: true
})

connectDB()
.then(()=>{
    app.listen(process.env.PORT || 3000 , ()=>{
        console.log("server is listening on port ", process.env.PORT)
    })
    app.on("error" , (error)=>{
console.log("server error" , error)
    })
})
.catch((err) => {
    console.log("monogodb connection error" , err)
})





































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


