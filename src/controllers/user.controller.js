import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend server
  // validation - not empty
  // check if user is already registered : username, email
  // check for images, check for avatar
  // upload them to the cloudninary, avatar
  // create user object - create entery in db
  // remove password and refresh token field from response
  // check for user creation
  // return response

  console.log("===> req.body", req.body);
  const { username, email, password, fullName } = req.body;

  // here we check all fields fill compulsary
  if (
    [username, email, password, fullName].some((field) => field.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // here we find a user already exist in database via username and email

  const existedUSer = await User.findOne({
    $or: [{ username }, { email }],
  });

  // check if user already exists then throw error

  if (existedUSer) {
    throw new ApiError(409, "user with username and email already exists");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  //   const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    
// its check avatar is existence

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }

     // save user details in DB

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email, 
        password,
        username: username.toLowerCase()
    })

    // here find user via _id then it created successfully or not

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    // it's check user is not created successfully then throw error

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    // finally give response to the frontend via custom ApiResponse function

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )

});

export { registerUser };
