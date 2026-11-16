import express from "express";
import SupplyController from "../controllers/SupplyController";

const router = express.Router();

router
  .get("/supplies", SupplyController.findAll)
  .get("/supplies/:id", SupplyController.findById)
  .post("/supplies", SupplyController.post)
  .post("/supplies/:id/restock", SupplyController.restock)
  .put("/supplies/:id", SupplyController.update)
  .delete("/supplies/:id", SupplyController.delete);

export default router;
