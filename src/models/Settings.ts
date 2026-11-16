import mongoose from "mongoose";
import { DEFAULT_SETTINGS } from "../config/defaultSettings";
import { numberField, schemaOptions } from "./utils";

export const SETTINGS_ID = "global";

export interface SettingsType {
  _id: string;
  kwhPrice: number;
  failureRatePct: number;
  laborHourRate: number;
  platformFeePct: number;
  minMarginPct: number;
  lowStockGrams: number;
  tiers: { barato: number; ideal: number; caro: number };
  currency: string;
}

const settingsSchema = new mongoose.Schema<SettingsType>(
  {
    _id: { type: String, default: SETTINGS_ID },
    kwhPrice: numberField({ default: DEFAULT_SETTINGS.kwhPrice }),
    failureRatePct: numberField({ default: DEFAULT_SETTINGS.failureRatePct }),
    laborHourRate: numberField({ default: DEFAULT_SETTINGS.laborHourRate }),
    platformFeePct: numberField({
      default: DEFAULT_SETTINGS.platformFeePct,
      max: 99,
    }),
    minMarginPct: numberField({
      default: DEFAULT_SETTINGS.minMarginPct,
      max: 99,
    }),
    lowStockGrams: numberField({ default: DEFAULT_SETTINGS.lowStockGrams }),
    tiers: {
      barato: numberField({ default: DEFAULT_SETTINGS.tiers.barato }),
      ideal: numberField({ default: DEFAULT_SETTINGS.tiers.ideal }),
      caro: numberField({ default: DEFAULT_SETTINGS.tiers.caro }),
    },
    currency: { type: String, default: "BRL" },
  },
  schemaOptions,
);

const settings = mongoose.model("settings", settingsSchema);

export const getSettings = async () => {
  const existing = await settings.findById(SETTINGS_ID);

  if (existing) {
    return existing;
  }

  return settings.create({ _id: SETTINGS_ID });
};

export default settings;
