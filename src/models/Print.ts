import mongoose, { type Types } from "mongoose";
import type { ColorMode, CostResult, PrintStatus } from "../types/index";
import { numberField, photoUrl, schemaOptions } from "./utils";

export interface PrintDb {
  name: string;
  customer?: string;
  status: PrintStatus;
  stockDeducted: boolean;
  printerId?: Types.ObjectId | null;
  dryerId?: Types.ObjectId | null;
  printHours: number;
  dryHours: number;
  laborMinutes: number;
  quantity: number;
  extraCost: number;
  filaments: {
    spoolId?: Types.ObjectId | null;
    label?: string;
    colorHex?: string;
    colors?: string[];
    colorMode?: ColorMode;
    grams: number;
    pricePerGram: number;
  }[];
  supplies: {
    supplyId?: Types.ObjectId | null;
    label?: string;
    unit?: string;
    qty: number;
    unitCost: number;
  }[];
  salePrice: number;
  result: CostResult;
  photoUrl?: string;
  /** Data do orçamento. */
  quotedAt?: Date;
  /** Data da venda do lote; null = ainda não vendido. */
  soldAt?: Date | null;
  notes?: string;
}

const { ObjectId, Mixed } = mongoose.Schema.Types;

const printSchema = new mongoose.Schema<PrintDb>(
  {
    name: { type: String, required: true, trim: true },
    customer: { type: String },
    status: {
      type: String,
      enum: ["orcamento", "concluida"],
      default: "orcamento",
    },
    stockDeducted: { type: Boolean, default: false },
    printerId: { type: ObjectId, ref: "equipment" },
    dryerId: { type: ObjectId, ref: "equipment" },
    printHours: numberField(), // horas decimais (1h30 = 1.5)
    dryHours: numberField(),
    laborMinutes: numberField(),
    quantity: numberField({ default: 1 }), // peças no lote
    extraCost: numberField(),
    filaments: [
      {
        _id: false, // itens da lista não precisam de id próprio
        spoolId: { type: ObjectId, ref: "spools" },
        label: { type: String },
        colorHex: { type: String },
        colors: { type: [String], default: undefined },
        colorMode: { type: String },
        grams: numberField(),
        pricePerGram: numberField(),
      },
    ],
    supplies: [
      {
        _id: false,
        supplyId: { type: ObjectId, ref: "supplies" },
        label: { type: String },
        unit: { type: String },
        qty: numberField(),
        unitCost: numberField(),
      },
    ],
    salePrice: numberField(), // preço unitário de venda escolhido
    result: { type: Mixed }, // resultado de calculateCost(), congelado
    // Sem "default" de propósito: o Mongoose aplicaria o padrão (hoje) também
    // ao ler impressões antigas, que ficariam com uma data falsa. O
    // PrintController preenche ao criar; as antigas usam o script db:migrate-dates.
    quotedAt: { type: Date },
    soldAt: { type: Date, default: null },
    photoUrl,
    notes: { type: String },
  },
  schemaOptions,
);

const prints = mongoose.model("prints", printSchema);

export default prints;
