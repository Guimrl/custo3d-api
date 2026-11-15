export const DEFAULT_SETTINGS = {
  kwhPrice: 0.95, // R$ por kWh
  failureRatePct: 10, // % somado para cobrir impressões que falham
  laborHourRate: 0, // R$ por hora de trabalho manual
  platformFeePct: 0, // % que o marketplace / maquininha retém
  minMarginPct: 15, // margem mínima aceitável (base do "desconto seguro")
  lowStockGrams: 150, // abaixo disso o carretel aparece como "acabando"
  tiers: {
    barato: 60, // markup % sobre o custo
    ideal: 120,
    caro: 200,
  },
};
