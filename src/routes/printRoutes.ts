import express from "express";
import PrintController from "../controllers/PrintController";

const router = express.Router();

router
  .get("/prints", PrintController.findAll)
  .get("/prints/:id", PrintController.findById)
  .post("/prints", PrintController.post)
  .post("/prints/:id/complete", PrintController.complete)
  .post("/prints/:id/sale", PrintController.sell)
  .delete("/prints/:id/sale", PrintController.unsell)
  .put("/prints/:id", PrintController.update)
  .delete("/prints/:id", PrintController.delete);

export default router;
