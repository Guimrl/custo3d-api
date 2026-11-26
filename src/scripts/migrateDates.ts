/**
 * Ajusta os dados já cadastrados para as novas datas (npm run db:migrate-dates).
 *
 * - Impressões sem data de orçamento: recebem a data de cadastro (createdAt).
 *   A data de venda fica em branco: preencha nas que foram vendidas.
 * - Materiais sem histórico de compras: o histórico começa com uma compra
 *   (data da compra ou de cadastro, quantidade e valor totais). Reposições
 *   antigas já estão somadas nesses totais e não dá para separá-las.
 *
 * Por padrão só mostra o que seria alterado. Para gravar:
 *   npm run db:migrate-dates -- --apply
 * Pode rodar mais de uma vez: só mexe no que ainda não foi ajustado.
 */
import "dotenv/config";
import mongoose from "mongoose";

const apply = process.argv.includes("--apply");

const migrateDates = async () => {
  const uri = process.env.DB_CONNECTION;
  if (!uri) {
    console.error("✗ Defina DB_CONNECTION no arquivo .env (veja .env.example).");
    process.exitCode = 1;

    return;
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    const database = mongoose.connection.db;
    if (!database) {
      throw new Error("Conexão aberta, mas sem banco selecionado.");
    }

    const printsCollection = database.collection("prints");
    const suppliesCollection = database.collection("supplies");

    const printsWithoutQuote = { quotedAt: { $exists: false } };
    const suppliesWithoutHistory = { purchases: { $exists: false } };

    const [printCount, supplyCount, spoolsWithoutDate] = await Promise.all([
      printsCollection.countDocuments(printsWithoutQuote),
      suppliesCollection.countDocuments(suppliesWithoutHistory),
      database.collection("spools").countDocuments({ purchaseDate: { $in: [null, ""] } }),
    ]);

    console.log(`Impressões sem data de orçamento: ${printCount}`);
    console.log(`Materiais sem histórico de compras: ${supplyCount}`);
    console.log(`(só aviso) Carretéis sem data de compra: ${spoolsWithoutDate}. Preencha pelo app, se quiser.`);

    if (!apply) {
      console.log("\nNada foi gravado. Para aplicar: npm run db:migrate-dates -- --apply");

      return;
    }

    // Updates com "pipeline" (o array) para usar valores do próprio documento.
    const printResult = await printsCollection.updateMany(printsWithoutQuote, [
      { $set: { quotedAt: "$createdAt", soldAt: { $ifNull: ["$soldAt", null] } } },
    ]);
    const supplyResult = await suppliesCollection.updateMany(suppliesWithoutHistory, [
      {
        $set: {
          purchases: [
            {
              date: { $ifNull: ["$purchaseDate", "$createdAt"] },
              quantity: "$quantityPurchased",
              price: "$pricePaid",
            },
          ],
        },
      },
    ]);

    console.log(`\n✓ Impressões ajustadas: ${printResult.modifiedCount}`);
    console.log(`✓ Materiais ajustados: ${supplyResult.modifiedCount}`);
  } catch (error) {
    console.error(`✗ Falhou: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

await migrateDates();
