import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    fullName: {
      type: String,
    },
    avatar: {
      type: String,
    },
    likedPosts: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Post",
        },
      ],
    },
  },
  { timestamps: true }
);

export const User = mongoose.model("USER", userSchema);
