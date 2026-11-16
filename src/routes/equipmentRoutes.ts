import express from "express";
import EquipmentController from "../controllers/EquipmentController";

const router = express.Router();

router
  .get("/equipment", EquipmentController.findAll)
  .get("/equipment/:id", EquipmentController.findById)
  .post("/equipment", EquipmentController.post)
  .put("/equipment/:id", EquipmentController.update)
  .delete("/equipment/:id", EquipmentController.delete);

export default router;
