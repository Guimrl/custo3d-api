import express from "express";
import AuthController from "../controllers/AuthController";
import { authenticate } from "../middlewares/authenticate";

const router = express.Router();

router
  .post("/auth/login", AuthController.login)
  .get("/auth/me", authenticate, AuthController.me);

export default router;
