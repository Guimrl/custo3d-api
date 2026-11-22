import express from "express";
import SummaryController from "../controllers/SummaryController";

const router = express.Router();

router.get("/summary", SummaryController.find);

export default router;
