import mongoose from "mongoose";
import type { Spool as SpoolType } from "../types/index";
import { photoUrl, numberField, schemaOptions } from "./utils";

const hexColor = {
  type: String,
  match: [/^#[0-9a-f]{6}$/i, "Cor inválida (use o formato #RRGGBB)."] as [
    RegExp,
    string,
  ],
};

const spoolSchema = new mongoose.Schema<SpoolType>(
  {
    material: { type: String, default: "PLA", trim: true },
    brand: { type: String, trim: true },
    color: { type: String, required: true, trim: true }, // nome da cor
    colorHex: { type: String, default: "#cccccc" }, // primeira cor (compatibilidade)
    colors: { type: [hexColor], default: undefined }, // todas as cores
    colorMode: {
      type: String,
      enum: ["solid", "stripes", "gradient"],
      default: "solid",
    },
    finishIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "finishes" }], // acabamentos
    photoUrl,
    diameter: { type: Number, default: 1.75 },
    weightGrams: numberField({ default: 1000 }), // peso líquido original (g)
    remainingGrams: numberField({ default: 1000 }), // quanto resta (g)
    emptySpoolGrams: numberField(), // tara: peso do carretel vazio (g)
    pricePaid: numberField(), // quanto pagou pelo carretel (R$)
    purchaseDate: { type: Date },
    supplier: { type: String },
    archived: { type: Boolean, default: false }, // some das listas, mas não é apagado
    notes: { type: String },
  },
  schemaOptions,
);

const spools = mongoose.model("spools", spoolSchema);

export default spools;
