import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";
import { ApiError } from "../utils/apiErrors.js";
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import { toQueryRef } from "firebase/data-connect";
import jwt from "jsonwebtoken"
import { ImagenPersonFilterLevel } from "firebase/ai";

const generateAccessAndRefreshToken = async function(userId){

    try {
        const user = await User.findById(userId)
console.log(user)
        const accessToken = await user.generateAccessToken()
        const refreshToken = await user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave:false})

        return {accessToken , refreshToken}
    } catch (error) {
    console.log("TOKEN ERROR:", error)  // ADD THIS
    throw error
}
}

const registerUser = asyncHandler( async (req,res)=>{
    const { fullname, email, username, password,} = req.body
    console.log("email : ", email)

if ([fullname,email,username,password].some((field)=> field?.trim() === ""))
{
    throw new ApiError(400,"All fields are required")
}

const existedUser = await User.findOne({
    $or: [{ username },{ email }]
})

if (existedUser) {
    throw new ApiError(409 , "User with email or username existed")
}

const avatarLocalPath = req.files?.avatar?.[0]?.path
// const coverImageLocalPath = req.files?.coverImage?.[0]?.path

let coverImageLocalPath;
if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
coverImageLocalPath = req.files.coverImage[0].path
}

if(!avatarLocalPath){
    throw new ApiError(400,"Avatar path is required")
}

const avatar = await uploadOnCloudinary(avatarLocalPath)
console.log("this is avatar ===> ",avatar)
const coverImage = await uploadOnCloudinary(coverImageLocalPath)
if(!avatar){
    throw new ApiError(400,"Avatar is required")
}

const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username:username.toLowerCase()
    })

const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
)

if (!createdUser){
    throw new ApiError(500,"something went wrong while storing user in DB")
}

return res.status(201).json(
    new ApiResponse(200,createdUser,"user added successfully")
)

})

const loginUser = asyncHandler( async (req,res) =>{

console.log(req.body)
    
        const { email , username , password } = req.body

        if (!username && !email) {
            throw new ApiError(400,"email or username is required")
        }

        const user = await User.findOne({
         $or:   [{username},{email}]
})
         if(!user) {
            throw new ApiError(400 , "user not extisted")
         }

const isPasswordValid = await user.isPasswordCorrect(password)

if (!isPasswordValid){
    throw new ApiError(400 , "password is not correct")
}

const {accessToken,refreshToken} = await generateAccessAndRefreshToken(user._id)


const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

const options = {
    httpOnly : true,
    secure : true
}

return res.status(200).cookie("accessToken" , accessToken , options).cookie("refreshToken" , refreshToken , options).json(
    new ApiResponse(200,{
        user:loggedInUser ,accessToken , refreshToken
    },"user loggedIn successfully")
)

})


const logoutUser = asyncHandler( async (req , res) => {
await User.findByIdAndUpdate(
    req.user._id,{
        $unset:{
            refreshToken:1
        }
    },{
        new:toQueryRef
    }
)

const options = {
    httpOnly : true,
    secure : true
}
return res.
status(200)
.clearCookie("accessToken")
.clearCookie("refreshToken")
.json(new ApiResponse(200, {} , "User logged out"))

})

const refreshAccessToken = asyncHandler( async (req,res) =>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (incomingRefreshToken) {
         throw new ApiError (401 , "unauthorized request")
    }

  try {
     const decodedToken = jwt.verify(incomingRefreshToken , process.env.REFRESH_TOKEN_SECRET)
  
      const user = await User.findById(decodedToken?._id)
  
      if (!user) {
           throw new ApiError (401 , "invalid refresh token")
      }
  
      if (!incomingRefreshToken !== user?.refreshToken){
          throw new ApiError(401 , "Refresh tokwn is expired  or unvalid")
      }
  
  const options = {
      httpOnly : true,
      secure : true
  }
  const { accessToken,newRefreshToken} = generateAccessAndRefreshToken(user._id)
  
  return res
  .status(200)
  .cookie("accessToken" , accessToken ,options)
  .cookie("refreshToken" , newRefreshToken , options)
  .json(
      new ApiResponse(
          200,
          {accessToken,refreshToken:newRefreshToken},
          "Access token refreshed"
  
      )
  )
  } catch (error) {
    throw new ApiError(401, error?.message || "invalid refresh token"
    )
  }
})


const changeCurrentPassword = asyncHandler(async (req,res) => {

    const {oldPassword , newPassword} = req.body
    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!oldPassword){
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave:false})

    return res
    .status(200)
    .json(new ApiResponse(200, {} , "password changed"))
})

const getCurrentUser = asyncHandler(async(req,res) => {
    return res
    .status(200)
    .json(new ApiResponse(200,req.user,"current user fetched"))
})

const updateAccountDetails =asyncHandler(async (req,res) => {
    
    const {fullName , email} = req.body

    if(!fullName || !email) {
        throw new ApiError(400,"All fields are required")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,{
        $set:{
            fullName:fullName,
            email:email
        }
    },{new:true}).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"Account details updated"))
})

const updateUserAvatar =  asyncHandler(async (req,res)=>{
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath) {
        throw new ApiError(400 , "avatar file is missing")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400 , "error while uploading the avatar")
    }

    const user = await User.findByIdAndUpdate(req.user?._id , {
        $set:{
            avatar:avatar.url
        }
    } , {new:true}).select("-password")

    return res
    .status(200)
    .json(new ApiResponse (200,user,"avatar is updated"))
})

const updateUserCoverImg =  asyncHandler(async (req,res)=>{
    const coverImgLocalPath = req.file?.path

    if(!coverImgLocalPath) {
        throw new ApiError(400 , "coverImg file is missing")
    }
    const coverImg = await uploadOnCloudinary(coverImgLocalPath)

    if (!coverImg.url) {
        throw new ApiError(400 , "error while uploading the coverImg")
    }

    const user = await User.findByIdAndUpdate(req.user?._id , {
        $set:{
            coverImage:coverImg.url
        }
    } , {new:true}).select("-password")

    return res
    .status(200)
    .json(new ApiResponse (200,user,"coverImg is updated"))
})


const getUserChannelProfile = asyncHandler(async(req,res)=>{
    const { username } = req.params
    if(!username?.trim()){
        throw new ApiError(400 , "username is missing")
    }

const channel = await User.aggregate([
    {
        $match:{
            username:username?.toLowerCase()
        }
    },{
        $lookup:{
            from:"subscriptions",
            localField:"_id",
            foreignField:"channel",
            as:"subscribers"
        }
    },{
        $lookup:{
            from:"subscriptions",
            localField:"_id",
            foreignField:"subscriber",
            as:"subscribedTo"
        }
    },{
        $addFields: {
            subscribersCount:{
                $size : "$subscribers"
            },
            channelsSubscribedToCount:{
                $size: "$subscribedTo"
            },
            isSubscribed:{
                $cond:{
                    if:{$in:[req.user?._id,"$subscribers.subscriber"]},then: true,
                    else:false
                }
            }
        }
    },{
    $project: {
        fullName: 1,
        username: 1,
        isSubscribed: 1,
        channelsSubscribedToCount: 1,
        subscribersCount: 1,
        avatar: 1,
        coverImage: 1,
        email: 1
    }
}
])



if (!channel?.length) {
    throw new ApiError(404, "channel does not exist")
}

return res
.status(200)
.json(
    new ApiResponse(200, channel, "user channel fetched successfully")
)
})



const getWatchHistory = asyncHandler(async(req,res)=>{

const user = await User.aggregate([
    {
        $match:{
            _id:new mongoose.Types.ObjectId(req.user._id)
        }
    },{
        $lookup: {
            from:"videos",
            localField:"watchHistory",
            foreignField:"_id",
            as:"watchHistory",
            pipeline: [
                {
                    $lookup:{
                        from:"users",
                        localField:"owner",
                        foreignField:"_id",
                        as:"owner",
                        pipeline:[
                            {
                                $project:{
                                    fullName:1,
                                    username:1,
                                    avatar:1

                                }
                            }
                        ]
                    }
                },{
                    $addFields:{
                        owner:{
                            $first:"$owner"
                        }
                    }
                }
            ]
        }
    }
])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "watch history fetched"
        )
    )
})
 












export {registerUser ,
     loginUser ,
     logoutUser ,
     refreshAccessToken ,
     changeCurrentPassword,
     updateAccountDetails ,
     updateUserAvatar ,
     getCurrentUser ,
     updateUserCoverImg,
     getUserChannelProfile,
     getWatchHistory
    }