import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Comment, Post } from "../models/post.model.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const newPost = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const { caption } = req.body;

    const postLocalPath = req.files?.postImage[0]?.path;
    if (!postLocalPath) {
      throw new ApiError(400, "an image is required to post");
    }

    const uploadedPost = await uploadOnCloudinary(postLocalPath);
    if (!uploadedPost) {
      throw new ApiError(400, "Could not upload image on cloudinary");
    }

    const post = await Post.create({
      caption,
      url: uploadedPost.url,
      user: user._id,
    });

    if (!post) {
      throw new ApiError(500, "Could not create post");
    }

    await User.findByIdAndUpdate(user._id, {
      posts: [...user.posts, post],
      lastPostedAt: new Date(),
    });

    return res
      .status(201)
      .json(new ApiResponse(200, post, "Posted successfully"));
  } catch (error) {
    next(error);
  }
};

// const newPost = asyncHandler(async (req, res) => {
//   try {
//     const user = await User.findById(req.user._id);
//     const { caption } = req.body;

//     const postLocalPath = req.files?.postImage[0]?.path;
//     if (!postLocalPath) {
//       throw new ApiError(400, "an image is required to post");
//     }

//     const uploadedPost = await uploadOnCloudinary(postLocalPath);
//     if (!uploadedPost) {
//       throw new ApiError(400, "Could not upload image on cloudinary");
//     }

//     const post = await Post.create({
//       caption,
//       url: uploadedPost.url,
//       user: user._id,
//     });

//     if (!post) {
//       throw new ApiError(500, "Could not create post");
//     }

//     await User.findByIdAndUpdate(user._id, {
//       posts: [...user.posts, post],
//       lastPostedAt: new Date(),
//     });

//     return res
//       .status(201)
//       .json(new ApiResponse(200, post, "Posted successfully"));
//   } catch (error) {
//     throw new ApiError(500, error.message);
//   }
// });

const getPost = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      throw new ApiError(401, "Id not found");
    }
    const post = await Post.findById(id);
    if (!post) {
      throw new ApiError(404, "Post not found");
    }
    return res.status(201).json(new ApiResponse(200, post, "Post found"));
  } catch (error) {
    next(error);
  }
};

const homeFeed = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      throw new ApiError(401, "Sign in to continue");
    }
    const { page } = req.params;
    const postsPerPage = 3;
    const posts = await Post.find({ user: { $in: user.following } })
      .sort({
        createdAt: "desc",
      })
      .skip(page * postsPerPage)
      .limit(postsPerPage);

    res.status(200).json(new ApiResponse(200, posts, "Posts found"));
  } catch (error) {
    next(error);
  }
};

const newComment = async (req, res, next) => {
  try {
    const commenter = req.user;
    const { postId, commentText } = req.body;
    if (!commentText) {
      throw new ApiError(401, "text is required");
    }
    console.log(postId);
    const post = await Post.findById(postId);
    if (!post) {
      throw new ApiError(404, "The post does not exist");
    }
    const comment = await Comment.create({
      comment: commentText,
      post: post._id,
      commenter: commenter._id,
    });

    if (!comment) {
      throw new ApiError(500, "Could not create comment");
    }

    await User.findByIdAndUpdate(commenter._id, {
      comments: [...commenter.comments, comment],
    });
    await Post.findByIdAndUpdate(post._id, {
      comments: [...post.comments, comment],
    });
    return res
      .status(201)
      .json(new ApiResponse(200, comment, "Comment posted successfully"));
  } catch (error) {
    next(error);
  }
};

const deleteComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      throw new ApiError(401, "Comment id required");
    }
    const comment = await Comment.findById(id);
    if (!comment) {
      throw new ApiError(401, "Invalid comment id");
    }
    if (!req.user.comments.includes(id)) {
      throw new ApiError(401, "user is not authorized to delete this comment");
    }

    const user = await User.findById(req.user._id);

    const post = await Post.findById(comment.post);
    if (!post) {
      throw new ApiError(501, "Post does not exist");
    }
    user.comments = user.comments.filter(function (item) {
      return !comment._id.equals(item);
    });
    await user.save({ validateBeforeSave: false });
    post.comments = post.comments.filter(function (item) {
      return !comment._id.equals(item);
    });
    await post.save({ validateBeforeSave: false });
    const deleteComment = await Comment.findByIdAndDelete(comment._id);
    return res
      .status(201)
      .json(
        new ApiResponse(200, deleteComment, "Comment deleted successfully")
      );
  } catch (error) {
    next(error);
  }
};

const getComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      throw new ApiError(401, "Comment id required");
    }
    const comment = await Comment.findById(id);
    if (!comment) {
      throw new ApiError(401, "Invalid comment id");
    }
    const commenter = await User.findById(comment.commenter).select(
      "-password -refreshToken"
    );
    return res
      .status(201)
      .json(new ApiResponse(200, { comment, commenter }, "comment retrieved"));
  } catch (error) {
    next(error);
  }
};

const getComments = async (req, res, next) => {
  try {
    const { id, page } = req.params;
    if (!id || !page) {
      throw new ApiError(401, "Missing post ID or page");
    }
    const commentsPerPage = 3;
    // const post = await Post.findById(id);
    const comments = await Comment.find({ post: id })
      .sort({
        createdAt: "desc",
      })
      .skip(page * commentsPerPage)
      .limit(commentsPerPage);

    res.status(200).json(new ApiResponse(200, comments, "Posts found"));
    // const comment = await Comment.findById(id);
    // if (!comment) {
    //   throw new ApiError(401, "Invalid comment id");
    // }
    // const commenter = await User.findById(comment.commenter).select(
    //   "-password -refreshToken"
    // );
    // return res
    //   .status(201)
    //   .json(new ApiResponse(200, { comment, commenter }, "comment retrieved"));
  } catch (error) {
    next(error);
  }
};

const getPosts = async (req, res, next) => {
  try {
    const { id, page } = req.params;
    if (!id || !page) {
      throw new ApiError(401, "Missing user ID or page");
    }
    const postsPerPage = 20;
    const user = await User.findById(id);
    if (!user) {
      throw new ApiError(500, "User does not exist");
    }
    for (let i = page * postsPerPage; i < user.posts.length; i++) {}
    // const post = await Post.findById(id);
    // const posts = await User.find({ post: id })
    //   .sort({
    //     createdAt: "asc",
    //   })
    //   .skip(page * commentsPerPage)
    //   .limit(commentsPerPage);

    res.status(200).json(new ApiResponse(200, comments, "Posts found"));
  } catch (error) {
    next(error);
  }
};

export {
  newPost,
  getPost,
  newComment,
  deleteComment,
  getComment,
  homeFeed,
  getComments,
};
