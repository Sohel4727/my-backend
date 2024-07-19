import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { options } from "../constants.js";
import jwt from "jsonwebtoken";

// here we generate access and refresh token

const generateAccessAndRefreshToken = async (userId) => {
  try {
    // here find userId from DB
    const user = await User.findById(userId);
    // generate access and refresh token via generate tokens methods
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    // here we save the refresh token in DB via save method with not validations befor saving
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "something went wrong while generating access and refresh tokens"
    );
  }
};

//  here we register users
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
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  // its check avatar is existence

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  // save user details in DB

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  // here find user via _id then it created successfully or not

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // it's check user is not created successfully then throw error

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  // finally give response to the frontend via custom ApiResponse function

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered Successfully"));
});

// here login user controller logic

const loginUser = asyncHandler(async (req, res) => {
  // getting data from req - body
  // getting username or email from req - body
  // find ther username or email in DB
  // if user is exist then checking password
  // generate access and refresh token
  // send tokens in cookies

  const { email, password, username } = req.body;
  // here we check username or email

  //   if (!username && !email) {
  //     throw new ApiError(400, "username or email is required");
  //   }
  // alternate login here
  if (!(username || email)) {
    throw new ApiError(400, "username or email is required");
  }

  // here we find username and email in DB
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  // if user is not found then throw an error
  if (!user) {
    throw new ApiError(404, "user does not exist");
  }

  // checking password is valid or not
  const isPasswordValid = await user.isPasswordCorrect(password);

  // if password is not valid then thro error
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  // we use generated access or refresh token via method using _id and destructuring
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  // we find user from DB by id and send access and refresh tokens using cookies
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // sending tokens in cookies ad send response to frontend

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        `User ${loggedInUser?.username || loggedInUser?.email} logged In Successfully`
      )
    );
});

// user logout controller

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1, // this removes the field from document
      },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
      new ApiResponse(
        200,
        {},
        `User ${req?.user?.username} logged Out successfully`
      )
    );
});

// refresh access token while its expired

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    // verify refresh token
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    //
    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    // match user incoming refresh token is match with database refresh token

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "refresh token is expired or used");
    }

    // we generate a new access and refresh token
    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);

      // we send new refresh token in cookie and response as well
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access Token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error.message || "Invalid refresh token");
  }
});

export { registerUser, loginUser, logoutUser,refreshAccessToken };
