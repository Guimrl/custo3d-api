import express from "express";
import FinishController from "../controllers/FinishController";

const router = express.Router();

router
  .get("/finishes", FinishController.findAll)
  .post("/finishes", FinishController.post)
  .put("/finishes/:id", FinishController.update)
  .delete("/finishes/:id", FinishController.delete);

export default router;
