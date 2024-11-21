import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access and refresh token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password, fullName } = req.body;
  if (
    [fullName, email, username, password].some(
      (element) => element?.trim() === "" || !element
    )
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existingUser = await User.findOne({ $or: [{ email }, { username }] });
  if (existingUser) {
    throw new ApiError(409, "User with email or username already exists");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar) {
    throw new ApiError(400, "Could not upload avatar on cloudinary");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    email,
    username: username.toLowerCase(),
    password,
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully!"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  if (!email && !username) {
    throw new ApiError(400, "username or email is required");
  }

  const user = await User.findOne({ $or: [{ username }, { email }] });
  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Incorrect password");
  }

  const { refreshToken, accessToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  // user.refreshToken = refreshToken
  // return user

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          refreshToken,
          accessToken,
        },
        "User logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    { $set: { refreshToken: undefined } },
    { new: true }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }
  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "invalid refresh token");
    }
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "invalid/expired refresh token");
    }

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const changeCorrectPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(401, "Incorrect old password");
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password has been changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(200, req.user, "Current user fetched successfully");
});

//You will need a username as a req param
//req.user exists because of use of auth middleware
// const subscribe =  (req, res) => {
//   const followUsername = req.query.username;
//   if (!followUsername) {
//     throw new ApiError(401, "User not found");
//   }
// };

const newFollow = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const followUsername = req.query.username;
  if (!followUsername) {
    throw new ApiError(401, "User not found");
  }
  const followUser = await User.findOne({ username: followUsername });
  if (!followUser) {
    throw new ApiError(401, "User not found");
  }
  if (user.following.includes(followUser._id)) {
    throw new ApiError(401, "You already follow this person");
    // return res
    //   .status(200)
    //   .json(
    //     new ApiResponse(200, followUser, "you are already following this user")
    //   );
  }
  user.following = [...user.following, followUser._id];
  followUser.followers = [...followUser.followers, user._id];
  await user.save({ validateBeforeSave: false });
  await followUser.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, followUser, "User followed successfully"));
});

const unfollow = async (req, res) => {
  const user = await User.findById(req.user._id);
  const unfollowUsername = req.query.username;
  if (!unfollowUsername) {
    throw new ApiError(401, "User not found");
  }
  const unfollowUser = await User.findOne({ username: unfollowUsername });
  if (!unfollowUser) {
    throw new ApiError(401, "User not found");
  }
  if (!user.following.includes(unfollowUser._id)) {
    throw new ApiError(401, "You do not follow this user");
  }
  user.following = user.following.filter((id) => !id.equals(unfollowUser._id));
  unfollowUser.followers = unfollowUser.followers.filter(
    (id) => !id.equals(user._id)
  );
  await user.save({ validateBeforeSave: false });
  await unfollowUser.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, null, "User unfollowed successfully"));
};

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCorrectPassword,
  getCurrentUser,
  newFollow,
  unfollow,
};
