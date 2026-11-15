import type { Express } from "express";
import { authenticate } from "../middlewares/authenticate";
import auth from "./authRoutes";
import settings from "./settingsRoutes";

const routes = (app: Express) => {
  app.route("/").get((_req, res) => {
    res.status(200).send({ title: "Custo 3D API" });
  });
  app.use(auth);

  app.use(authenticate);
  app.use(settings);

  app.use((req, res) => {
    res
      .status(404)
      .json({ message: `Rota não encontrada: ${req.method} ${req.path}` });
  });
};

export default routes;
