import type { Request, Response } from "express";
import lodash from "lodash";
import prints from "../models/Print";
import { getSettings } from "../models/Settings";
import spools from "../models/Spools";
import supplies from "../models/Supply";
import { round2, spoolPricePerGram, supplyUnitCost } from "../services/calc";
import { handleError } from "../utils/handleError";

const LOW_SUPPLY_RATIO = 0.1;

interface ISummaryController {
  find(req: Request, res: Response): Promise<void>;
}

class SummaryController implements ISummaryController {
  find = async (_req: Request, res: Response): Promise<void> => {
    try {
      const [settings, spoolList, supplyList, donePrints] = await Promise.all([
        getSettings(),
        spools.find({ archived: { $ne: true } }),
        supplies.find({ archived: { $ne: true } }),
        prints.find({ status: "concluida" }),
      ]);

      const filamentGrams = lodash.sumBy(spoolList, "remainingGrams");
      const filamentValue = lodash.sumBy(
        spoolList,
        (spool) => spoolPricePerGram(spool) * spool.remainingGrams,
      );
      const suppliesValue = lodash.sumBy(
        supplyList,
        (supply) => supplyUnitCost(supply) * supply.quantityRemaining,
      );

      const soldPrints = donePrints.filter((print) => print.salePrice > 0);
      const revenue = lodash.sumBy(
        soldPrints,
        (print) => print.salePrice * (print.quantity || 1),
      );
      const cost = lodash.sumBy(
        soldPrints,
        (print) => print.result?.totalCost || 0,
      );

      const lowStockGrams = settings.lowStockGrams ?? 150;

      res.status(200).json({
        spoolCount: spoolList.length,
        filamentGrams: round2(filamentGrams),
        filamentValue: round2(filamentValue),
        suppliesValue: round2(suppliesValue),
        lowSpools: spoolList.filter(
          (spool) => spool.remainingGrams <= lowStockGrams,
        ),
        lowSupplies: supplyList.filter(
          (supply) =>
            supply.quantityPurchased > 0 &&
            supply.quantityRemaining / supply.quantityPurchased <=
              LOW_SUPPLY_RATIO,
        ),
        printsDone: donePrints.length,
        printHours: round2(
          lodash.sumBy(donePrints, (print) => print.printHours || 0),
        ),
        gramsUsed: round2(
          lodash.sumBy(donePrints, (print) => print.result?.filamentGrams || 0),
        ),
        revenue: round2(revenue),
        cost: round2(cost),
        profit: round2(revenue - cost),
      });
    } catch (error) {
      handleError(res, error, "Erro ao montar o resumo");
    }
  };
}

export default new SummaryController();
