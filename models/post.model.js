import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    caption: {
      type: String,
    },
    url: {
      type: String,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    comments: {
      type: [
        {
          commenter: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
          commentContent: {
            type: String,
            required: true,
          },
        },
      ],
    },
    likes: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

export const Post = mongoose.model("POST", postSchema);
