import mongoose from "mongoose";
import type { Finish as FinishType } from "../types/index";
import { schemaOptions } from "./utils";

/** Acabamentos criados automaticamente quando a lista é pedida vazia (primeiro uso). */
export const DEFAULT_FINISHES = [
  "Basic",
  "Matte",
  "Silk",
  "High Speed",
  "Duo Color",
  "Tri Color",
  "Rainbow",
  "Glitter / Sparkle",
  "Brilha no escuro",
  "Translúcido",
  "Mármore",
  "Madeira",
  "Fibra de carbono",
];

const finishSchema = new mongoose.Schema<FinishType>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    order: { type: Number, default: 0 }, 
  },
  schemaOptions,
);

const finishes = mongoose.model("finishes", finishSchema);

export default finishes;
