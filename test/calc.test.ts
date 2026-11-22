import { test } from "node:test";
import assert from "node:assert/strict";
import {
  analyzePrice,
  calculateCost,
  minUnitPriceForBundle,
  priceTiers,
  simulateBundle,
  simulateDiscount,
  spoolPricePerGram,
  supplyUnitCost,
} from "../src/services/calc";

const settings = {
  kwhPrice: 1,
  failureRatePct: 0,
  laborHourRate: 30,
  platformFeePct: 0,
  minMarginPct: 20,
  tiers: { barato: 50, ideal: 100, caro: 200 },
};

test("preço por grama do carretel", () => {
  assert.equal(spoolPricePerGram({ pricePaid: 100, weightGrams: 1000 }), 0.1);
  assert.equal(spoolPricePerGram({ pricePaid: 100, weightGrams: 0 }), 0);
});

test("custo unitário do material", () => {
  assert.equal(supplyUnitCost({ pricePaid: 15, quantityPurchased: 100 }), 0.15);
  assert.equal(supplyUnitCost(null), 0);
});

test("custo completo de um lote", () => {
  const result = calculateCost({
    settings,
    printer: {
      price: 3000,
      lifespanHours: 3000,
      powerWatts: 200,
      maintenancePerHour: 0,
    },
    dryer: { price: 500, lifespanHours: 1000, powerWatts: 100 },
    printHours: 5,
    dryHours: 2,
    laborMinutes: 30,
    quantity: 2,
    filaments: [{ grams: 100, pricePerGram: 0.1 }],
    supplies: [{ qty: 2, unitCost: 0.5 }],
  });

  // filamento 10 + materiais 1 + energia (1 kWh + 0,2 kWh) 1,2 + impressora 5 + secadora 1 + mão de obra 15 = 33,2
  assert.equal(result.totalCost, 33.2);
  assert.equal(result.unitCost, 16.6);
  assert.equal(result.pricing.find((tier) => tier.key === "ideal")?.price, 33.2);
});

test("quantidade inválida vira 1 peça", () => {
  const result = calculateCost({
    settings,
    quantity: "",
    filaments: [{ grams: 10, pricePerGram: 1 }],
  });

  assert.equal(result.quantity, 1);
  assert.equal(result.unitCost, 10);
});

test("taxa de falha incide sobre material/energia/desgaste", () => {
  const result = calculateCost({
    settings: { ...settings, failureRatePct: 10, laborHourRate: 0 },
    printHours: 0,
    filaments: [{ grams: 100, pricePerGram: 0.1 }],
  });

  assert.equal(result.totalCost, 11);
});

test("desconto máximo e margem", () => {
  const analysis = analyzePrice(10, 20, settings);

  assert.equal(analysis.profit, 10);
  assert.equal(analysis.marginPct, 50);
  assert.equal(analysis.maxDiscountPct, 50);
  assert.equal(analysis.minMarginPrice, 12.5);
  assert.equal(analysis.maxDiscountKeepingMarginPct, 37.5);
});

test("taxa da plataforma reduz o líquido", () => {
  const analysis = analyzePrice(10, 20, { ...settings, platformFeePct: 10 });

  assert.equal(analysis.net, 18);
  assert.equal(analysis.profit, 8);
});

test("simulação de desconto", () => {
  const discount = simulateDiscount(10, 20, 25, settings);

  assert.equal(discount.discountPct, 25);
  assert.equal(discount.price, 15);
  assert.equal(discount.profit, 5);
});

test("compre 1 leve 2", () => {
  const bundle = simulateBundle(10, 30, 2, 1, settings);

  assert.equal(bundle.profit, 10);
  assert.equal(bundle.viable, true);
  assert.equal(bundle.effectiveDiscountPct, 50);
  assert.equal(minUnitPriceForBundle(10, 2, 1, settings).breakEven, 20);
});

test("faixa guarda o markup configurado e o real separados quando há taxa", () => {
  // custo 10, markup 100%, taxa 10% → preço 22,22; líquido 20; lucro 10 → markup real 100%
  const [, ideal] = priceTiers(10, { ...settings, platformFeePct: 10 });

  assert.equal(ideal.price, 22.22);
  assert.equal(ideal.targetMarkupPct, 100);
  assert.equal(ideal.markupPct, 100);
});
