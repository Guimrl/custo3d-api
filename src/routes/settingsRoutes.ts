import express from "express";
import SettingsController from "../controllers/SettingsController";

const router = express.Router();

router
  .get("/settings", SettingsController.getSettings)
  .put("/settings", SettingsController.updateSettings);

export default router;
