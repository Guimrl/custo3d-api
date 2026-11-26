import express from "express";
import BrandController from "../controllers/BrandController";

const router = express.Router();

router
  .get("/brands", BrandController.findAll)
  .post("/brands", BrandController.post)
  .put("/brands/:id", BrandController.update)
  .delete("/brands/:id", BrandController.delete);

export default router;
