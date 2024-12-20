import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();

// app.use(
//   cors({
//     origin: process.env.CORS_ORIGIN,
//   })
// );
app.use(
  express.json({
    limit: "16kb",
  })
);
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

import userRouter from "./routes/user.routes.js";
app.use("/api/v1/users", userRouter);

import postRouter from "./routes/post.routes.js";
app.use("/api/v1/posts", postRouter);

app.use(function (err, req, res, next) {
  console.log("ERROR: ", err.message); // Log error message in our server's console
  if (!err.statusCode) err.statusCode = 500; // If err has no specified error code, set error code to 'Internal Server Error (500)'
  res.status(err.statusCode).send({ error: err.message });
});

export { app };
