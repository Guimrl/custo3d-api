import express from "express";
import cors from "cors";
import routes from "./routes/index.js";
import db from "./config/dbConnect.js";

db.on("error", console.log.bind(console, "Connection error"));
db.once("open", () => {
  console.log("Database connection was successful");
});

const app = express();
app.use(cors());

const jsonParser = express.json();
app.use((req, res, next) => jsonParser(req, res, next));

routes(app);

export default app;
