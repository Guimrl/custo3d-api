import express from "express";
import SpoolController from "../controllers/SpoolController";

const router = express.Router();

router
  .get("/spools", SpoolController.findAll)
  .get("/spools/search", SpoolController.findBySearch)
  .get("/spools/:id", SpoolController.findById)
  .post("/spools", SpoolController.post)
  .put("/spools/:id", SpoolController.update)
  .delete("/spools/:id", SpoolController.delete);

export default router;
