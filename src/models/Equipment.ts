import mongoose from "mongoose";
import type { Equipment as EquipmentType } from "../types/index";
import { numberField, photoUrl, schemaOptions } from "./utils";

const equipmentSchema = new mongoose.Schema<EquipmentType>(
  {
    type: { type: String, enum: ["printer", "dryer"], required: true },
    name: { type: String, required: true, trim: true },
    brand: { type: String, trim: true },
    price: numberField(), // valor pago
    lifespanHours: numberField({ default: 5000 }), // vida útil estimada (h de uso)
    powerWatts: numberField({ default: 150 }), // consumo médio (W)
    maintenancePerHour: numberField(), // R$/h de manutenção (só impressoras)
    active: { type: Boolean, default: true },
    photoUrl,
    notes: { type: String },
  },
  schemaOptions,
);

const equipment = mongoose.model("equipment", equipmentSchema, "equipment");

export default equipment;
