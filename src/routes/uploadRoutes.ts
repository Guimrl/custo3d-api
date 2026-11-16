import express from "express";
import UploadController from "../controllers/UploadController";

const router = express.Router();

router
  .get("/uploads/status", UploadController.getStatus)
  .post(
    "/uploads/image",
    express.json({ limit: "12mb" }),
    UploadController.postImage,
  );

export default router;
