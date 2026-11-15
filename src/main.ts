import express from "express";
import cors from "cors";
import routes from "./routes/index";
import db from "./config/dbConnect";

db.on("error", console.log.bind(console, "Connection error"));
db.once("open", () => {
  console.log("Database connection was successful");
});

const app = express();
app.use(cors());

const jsonParser = express.json();
app.use((req, res, next) =>
  req.path.startsWith("/uploads") ? next() : jsonParser(req, res, next),
);

routes(app);

export default app;
