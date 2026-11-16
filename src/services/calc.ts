import lodash from "lodash";
import type {
  BundleResult,
  CostLine,
  CostResult,
  PriceAnalysis,
  PriceTier,
  Settings,
  Spool,
  Supply,
  TierKey,
} from "../types/index";

/**
 * Converte qualquer coisa em número "seguro". Campos de formulário vazios
 * chegam como '' ou undefined; em vez de virar NaN e contaminar a conta,
 * viram 0.
 */
const formatNumber = (param: unknown): number => {
  const value = lodash.toNumber(param);
  return lodash.isFinite(value) ? value : 0;
};

/** Converte porcentagem em fração: 15 → 0.15 */
const pct = (value: unknown): number => lodash.divide(formatNumber(value), 100);

/**
 * Arredonda para 2 casas (centavos). O Number.EPSILON evita o clássico
 * problema de ponto flutuante em que 1.005 vira 1.00 em vez de 1.01.
 */
export const round2 = (value: unknown): number =>
  lodash.round(formatNumber(value), 2);

// ---------------------------------------------------------------------------
// Valores padrão
// ---------------------------------------------------------------------------

/**
 * Configurações usadas quando o banco ainda não tem nenhuma salva, e também
 * para preencher campos que estejam faltando.
 */
export const DEFAULT_SETTINGS: Settings = {
  kwhPrice: 0.95,
  failureRatePct: 10,
  laborHourRate: 0,
  platformFeePct: 0,
  minMarginPct: 15,
  tiers: {
    barato: 60, // vende por 1,6× o custo
    ideal: 120, // 2,2× o custo
    caro: 200, // 3× o custo
  },
};

/** Nome amigável de cada faixa, exibido na tela. */
export const TIER_LABELS: Record<TierKey, string> = {
  barato: "Barato",
  ideal: "Ideal",
  caro: "Caro",
};

/**
 * Junta as configurações recebidas com as padrão. Faz o "merge" das faixas
 * separadamente para não perder uma faixa caso só outra tenha sido enviada.
 */
function withDefaults(settings?: Partial<Settings> | null): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...(settings || {}),
    tiers: { ...DEFAULT_SETTINGS.tiers, ...(settings?.tiers || {}) },
  };
}

// ---------------------------------------------------------------------------
// Custos unitários de cada cadastro
// ---------------------------------------------------------------------------

/** Quanto custa 1 grama de filamento deste carretel. Ex.: R$ 100 / 1000 g = R$ 0,10/g */
export function spoolPricePerGram(
  spool?: Pick<Spool, "pricePaid" | "weightGrams"> | null,
): number {
  const weight = formatNumber(spool?.weightGrams);
  return weight > 0 ? formatNumber(spool?.pricePaid) / weight : 0;
}

/** Quanto custa 1 unidade de um insumo. Ex.: 100 argolas por R$ 15 = R$ 0,15/un */
export function supplyUnitCost(
  supply?: Pick<Supply, "pricePaid" | "quantityPurchased"> | null,
): number {
  const unitCost = formatNumber(supply?.quantityPurchased);
  return unitCost > 0 ? formatNumber(supply?.pricePaid) / unitCost : 0;
}

/** Custos por hora de uso de um equipamento. */
export interface HourlyCost {
  /** R$/h de depreciação: preço ÷ vida útil. */
  depreciation: number;
  /** kWh consumidos por hora: watts ÷ 1000. */
  energyKwh: number;
  /** R$/h de manutenção informado no cadastro. */
  maintenance: number;
}

/**
 * Depreciação = quanto do valor do equipamento você "gasta" a cada hora de uso.
 * Ex.: impressora de R$ 3.000 com vida útil de 3.000 h → R$ 1,00 por hora.
 */
export function equipmentHourlyCost(
  eq?: EquipmentCostFields | null,
): HourlyCost {
  if (!eq) {
    return { depreciation: 0, energyKwh: 0, maintenance: 0 };
  }
  const life = formatNumber(eq.lifespanHours);
  return {
    depreciation: life > 0 ? formatNumber(eq.price) / life : 0,
    energyKwh: formatNumber(eq.powerWatts) / 1000,
    maintenance: formatNumber(eq.maintenancePerHour),
  };
}

// ---------------------------------------------------------------------------
// Cálculo do custo de uma impressão
// ---------------------------------------------------------------------------

/**
 * Só os campos de um equipamento que entram na conta. Aceita tanto o tipo do
 * front quanto o registro que vem do Prisma (que tem campos a mais).
 */
export type EquipmentCostFields = Partial<
  Record<"price" | "lifespanHours" | "powerWatts", number>
> & {
  maintenancePerHour?: number | null;
};

/** Tudo que o cálculo precisa saber sobre uma impressão. */
export interface CostInput {
  settings?: Partial<Settings> | null;
  printer?: EquipmentCostFields | null;
  dryer?: EquipmentCostFields | null;
  printHours?: number | string;
  dryHours?: number | string;
  laborMinutes?: number | string;
  /** Peças produzidas no lote (mínimo 1). */
  quantity?: number | string;
  /** Cada filamento: gramas usadas e preço por grama do carretel. */
  filaments?: { grams?: number | string; pricePerGram?: number }[];
  /** Cada insumo: quantidade usada e custo unitário. */
  supplies?: { qty?: number | string; unitCost?: number }[];
  extraCost?: number | string;
}

/**
 * Calcula o custo de produção de um lote de peças.
 *
 * Passo a passo:
 *  1. Filamento   = Σ gramas × preço/grama de cada carretel
 *  2. Materiais   = Σ quantidade × custo unitário de cada insumo
 *  3. Energia     = (kWh impressora × horas + kWh secadora × horas secagem) × R$/kWh
 *  4. Desgastes   = (depreciação + manutenção) × horas de cada equipamento
 *  5. Mão de obra = minutos ÷ 60 × R$/h
 *  6. Falha       = % sobre (filamento + energia + desgastes), que é o que se
 *                   perde quando uma impressão dá errado e precisa ser refeita
 *  7. Total ÷ quantidade = custo por peça
 */
export function calculateCost(cost: CostInput): CostResult {
  const settings = withDefaults(cost.settings);
  const printHours = formatNumber(cost.printHours);
  const dryHours = formatNumber(cost.dryHours);
  // Garante pelo menos 1 peça e número inteiro (evita divisão por zero).
  const quantity =
    lodash.max([1, lodash.floor(formatNumber(cost.quantity) || 1)]) ?? 1;

  const printer = equipmentHourlyCost(cost.printer);
  const dryer = equipmentHourlyCost(cost.dryer);

  // 1. Filamento
  const filamentGrams = lodash.sumBy(cost.filaments || [], (filament) =>
    formatNumber(filament.grams),
  );
  const filament = lodash.sumBy(
    cost.filaments || [],
    (filament) =>
      formatNumber(filament.grams) * formatNumber(filament.pricePerGram),
  );
  // 2. Outros materiais
  const supplies = lodash.sumBy(
    cost.supplies || [],
    (x) => formatNumber(x.qty) * formatNumber(x.unitCost),
  );
  // 3. Energia
  const energyKwh = printer.energyKwh * printHours + dryer.energyKwh * dryHours;
  const energy = energyKwh * formatNumber(settings.kwhPrice);
  // 4. Desgaste dos equipamentos
  const printerWear = (printer.depreciation + printer.maintenance) * printHours;
  const dryerWear = dryer.depreciation * dryHours;
  // 5. Mão de obra e extras
  const labor =
    (formatNumber(cost.laborMinutes) / 60) *
    formatNumber(settings.laborHourRate);
  const extra = formatNumber(cost.extraCost);
  // 6. Margem de falha: só sobre o que é perdido numa reimpressão.
  //    Insumos (argola, ímã) e mão de obra normalmente não se perdem.
  const failureBase = filament + energy + printerWear + dryerWear;
  const failure = failureBase * pct(settings.failureRatePct);

  // 7. Totais
  const total =
    filament +
    supplies +
    energy +
    printerWear +
    dryerWear +
    labor +
    extra +
    failure;
  const unitCost = total / quantity;

  const breakdown: CostLine[] = (
    [
      { key: "filament", label: "Filamento", value: filament },
      { key: "supplies", label: "Outros materiais", value: supplies },
      { key: "energy", label: "Energia", value: energy },
      {
        key: "printerWear",
        label: "Desgaste da impressora",
        value: printerWear,
      },
      { key: "dryerWear", label: "Desgaste da secadora", value: dryerWear },
      { key: "labor", label: "Mão de obra", value: labor },
      { key: "extra", label: "Custos extras", value: extra },
      {
        key: "failure",
        label: `Margem de falha (${formatNumber(settings.failureRatePct)}%)`,
        value: failure,
      },
    ] satisfies CostLine[]
  ).map((b) => ({ ...b, value: round2(b.value) }));

  return {
    quantity,
    filamentGrams: round2(filamentGrams),
    energyKwh: round2(energyKwh),
    breakdown,
    totalCost: round2(total),
    unitCost: round2(unitCost),
    pricing: priceTiers(unitCost, settings),
  };
}

// ---------------------------------------------------------------------------
// Precificação
// ---------------------------------------------------------------------------

/**
 * Preço de venda para um markup, já compensando a taxa da plataforma.
 *
 * Por que dividir por (1 − taxa)? Se a plataforma fica com 10%, você recebe só
 * 90% do preço. Para receber R$ 20 líquidos, precisa cobrar 20 ÷ 0,9 = R$ 22,22.
 */
export function priceForMarkup(
  unitCost: number,
  markupPct: number,
  platformFeePct = 0,
): number {
  const feeFactor = 1 - pct(platformFeePct);
  if (feeFactor <= 0) {
    return 0;
  } // taxa de 100% ou mais: impossível precificar
  return (formatNumber(unitCost) * (1 + pct(markupPct))) / feeFactor;
}

/**
 * Analisa um preço de venda: lucro, margem e quanto de desconto ainda cabe.
 *
 * Margem × Markup (confusão comum):
 *  - Markup = lucro ÷ CUSTO  → "somei 100% em cima do custo"
 *  - Margem = lucro ÷ PREÇO  → "50% do que o cliente paga é lucro"
 *  Custo 10, preço 20: markup 100%, margem 50%.
 */
export function analyzePrice(
  unitCost: number,
  price: number,
  settings: Partial<Settings> = {},
): PriceAnalysis {
  const s = withDefaults(settings);
  const cost = formatNumber(unitCost);
  const p = formatNumber(price);
  const feeFactor = 1 - pct(s.platformFeePct);
  const net = p * feeFactor;
  const fee = p - net;
  const profit = net - cost;
  const marginPct = p > 0 ? (profit / p) * 100 : 0;
  const markupPct = cost > 0 ? (profit / cost) * 100 : 0;

  // Preço de empate: aquele em que o líquido cobre exatamente o custo.
  const breakEvenPrice = feeFactor > 0 ? cost / feeFactor : Infinity;
  // Preço com margem mínima: líquido − custo = margemMín × preço
  //   → preço × (1 − taxa − margemMín) = custo
  const minMarginFactor = feeFactor - pct(s.minMarginPct);
  const minMarginPrice =
    minMarginFactor > 0 ? cost / minMarginFactor : Infinity;

  /** Quanto % dá para descontar do preço atual até chegar no preço-alvo. */
  const discountTo = (target: number) =>
    p > 0 && lodash.isFinite(target)
      ? (lodash.max([0, (1 - target / p) * 100]) ?? 0)
      : 0;

  return {
    price: round2(p),
    fee: round2(fee),
    net: round2(net),
    profit: round2(profit),
    marginPct: round2(marginPct),
    markupPct: round2(markupPct),
    breakEvenPrice: round2(breakEvenPrice),
    minMarginPrice: round2(minMarginPrice),
    maxDiscountPct: round2(discountTo(breakEvenPrice)),
    maxDiscountKeepingMarginPct: round2(discountTo(minMarginPrice)),
  };
}

/** Calcula as faixas Barato / Ideal / Caro a partir do custo por peça. */
export function priceTiers(
  unitCost: number,
  settings: Partial<Settings> = {},
): PriceTier[] {
  const s = withDefaults(settings);
  return (Object.entries(s.tiers) as [TierKey, number][]).map(
    ([key, markupPct]) => {
      const price = priceForMarkup(unitCost, markupPct, s.platformFeePct);
      // targetMarkupPct = o markup configurado; markupPct (de analyzePrice) = o markup real
      // depois da taxa de venda. Sem taxa, os dois são iguais.
      return {
        key,
        label: TIER_LABELS[key] || key,
        targetMarkupPct: formatNumber(markupPct),
        ...analyzePrice(unitCost, price, s),
      };
    },
  );
}

/** Simula um desconto percentual sobre um preço e devolve a análise do preço final. */
export function simulateDiscount(
  unitCost: number,
  price: number,
  discountPct: number,
  settings: Partial<Settings> = {},
): PriceAnalysis & { discountPct: number } {
  const finalPrice = formatNumber(price) * (1 - pct(discountPct));
  return {
    discountPct: formatNumber(discountPct),
    ...analyzePrice(unitCost, finalPrice, settings),
  };
}

/**
 * Promoção "leve X, pague Y". Ex.: compre 1 leve 2 → take = 2, pay = 1.
 *
 * O cliente paga Y peças, mas você produz X peças. A promoção só vale a pena
 * se o que entra (Y × preço, menos taxa) for maior que X × custo.
 */
export function simulateBundle(
  unitCost: number,
  unitPrice: number,
  take: number,
  pay: number,
  settings: Partial<Settings> = {},
): BundleResult {
  const s = withDefaults(settings);
  const t = lodash.max([1, lodash.floor(formatNumber(take))]) ?? 1;
  const y = lodash.clamp(lodash.floor(formatNumber(pay)), 0, t); // não dá para pagar mais do que leva
  const bundlePrice = formatNumber(unitPrice) * y;
  const bundleCost = formatNumber(unitCost) * t;
  // Reaproveita analyzePrice tratando o pacote como se fosse "uma peça".
  const a = analyzePrice(bundleCost, bundlePrice, s);
  return {
    take: t,
    pay: y,
    bundlePrice: round2(bundlePrice),
    bundleCost: round2(bundleCost),
    effectiveUnitPrice: round2(bundlePrice / t),
    effectiveDiscountPct: round2((1 - y / t) * 100),
    profit: a.profit,
    marginPct: a.marginPct,
    viable: a.profit > 0,
    meetsMinMargin: a.marginPct >= formatNumber(s.minMarginPct),
  };
}

/**
 * Preço unitário mínimo para que "leve X, pague Y" não dê prejuízo
 * (breakEven) ou mantenha a margem mínima (keepingMinMargin).
 * Ex.: custo 10, leve 2 pague 1 → precisa vender a peça por pelo menos R$ 20.
 */
export function minUnitPriceForBundle(
  unitCost: number,
  take: number,
  pay: number,
  settings: Partial<Settings> = {},
): { breakEven: number; keepingMinMargin: number } {
  const s = withDefaults(settings);
  const t = lodash.max([1, formatNumber(take)]) ?? 1;
  const y = lodash.max([1, formatNumber(pay)]) ?? 1;
  const feeFactor = 1 - pct(s.platformFeePct);
  const mm = feeFactor - pct(s.minMarginPct);
  return {
    breakEven:
      feeFactor > 0
        ? round2((formatNumber(unitCost) * t) / y / feeFactor)
        : Infinity,
    keepingMinMargin:
      mm > 0 ? round2((formatNumber(unitCost) * t) / y / mm) : Infinity,
  };
}
