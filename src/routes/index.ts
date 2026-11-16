import type { Express } from "express";
import { authenticate } from "../middlewares/authenticate";
import auth from "./authRoutes";
import settings from "./settingsRoutes";
import spools from "./spoolRoutes";
import uploads from "./uploadRoutes";
import equipment from "./equipmentRoutes";
import supplies from "./supplyRoutes";
import prints from "./printRoutes";

const routes = (app: Express) => {
  app.route("/").get((_req, res) => {
    res.status(200).send({ title: "Custo 3D API" });
  });
  app.use(auth);

  app.use(authenticate);
  app.use(
    settings,
    spools,
    supplies,
    equipment,
    uploads,
    prints,
    // summary,
    // finishes,
  );

  app.use((req, res) => {
    res
      .status(404)
      .json({ message: `Rota não encontrada: ${req.method} ${req.path}` });
  });
};

export default routes;
