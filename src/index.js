import 'dotenv/config'
import express from "express";
const app = express();

app.get("/", (req, res) => {
  res.send("hello world");
});

app.get("/api/jokes", (req, res) => {
  const jokes = [
    {
      id: 1,
      title: "A joke",
      content: "Joke number 1",
    },
    {
      id: 2,
      title: "Another joke",
      content: "Joke number 2",
    },
  ];
  res.send(jokes);
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Running on port ${port}`);
});
