import type { Express } from "express";

const routes = (app: Express) => {
  app.route("/").get((req, res) => {
    res.status(200).send({ title: "Custo 3D API" });
  });

  app.use((req, res) => {
    res
      .status(404)
      .json({ message: `Rota não encontrada: ${req.method} ${req.path}` });
  });
};

export default routes;
