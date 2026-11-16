import express from "express";
import SettingsController from "../controllers/SettingsController";

const router = express.Router();

router
  .get("/settings", SettingsController.find)
  .put("/settings", SettingsController.update);

export default router;
