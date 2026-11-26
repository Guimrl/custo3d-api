import mongoose from "mongoose";
import type { Brand as BrandType } from "../types/index";
import { numberField, schemaOptions } from "./utils";

/**
 * Marcas de filamento e o que cada uma vende:
 *   Voolt3D → PLA (Lite, Silk, Rainbow), PETG (Basic)
 * O cadastro do carretel usa isto para oferecer só os materiais e tipos da marca.
 */
const brandSchema = new mongoose.Schema<BrandType>(
  {
    name: { type: String, required: true, trim: true },
    materials: [
      {
        _id: false,
        material: { type: String, required: true, trim: true },
        types: { type: [{ type: String, trim: true }], default: [] },
      },
    ],
    emptySpoolGrams: numberField(), // tara padrão dos carretéis da marca (g)
    notes: { type: String },
  },
  schemaOptions,
);

// Nome único sem diferenciar maiúsculas: "Voolt3d" e "Voolt3D" são a mesma marca.
brandSchema.index({ name: 1 }, { unique: true, collation: { locale: "pt", strength: 2 } });

const brands = mongoose.model("brands", brandSchema);

export default brands;
