import mongoose from "mongoose";
import type { Supply as SupplyType } from "../types/index";
import { numberField, photoUrl, schemaOptions } from "./utils";

const supplySchema = new mongoose.Schema<SupplyType>(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, default: "Geral", trim: true },
    unit: { type: String, default: "un" }, // un, par, g, ml, m…
    quantityPurchased: numberField({ default: 1 }), // total já comprado (todas as reposições)
    pricePaid: numberField(), // total já pago por esse total
    quantityRemaining: numberField(), // em estoque
    supplier: { type: String },
    purchaseDate: { type: Date }, // primeira compra (cadastro)
    // Histórico de compras: o cadastro e cada reposição (botão Repor).
    purchases: [
      {
        _id: false,
        date: { type: Date, required: true },
        quantity: numberField(),
        price: numberField(), // valor total pago nesta compra
      },
    ],
    archived: { type: Boolean, default: false },
    photoUrl,
    notes: { type: String },
  },
  schemaOptions,
);

const supplies = mongoose.model("supplies", supplySchema);

export default supplies;
