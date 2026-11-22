/**
 * Teste de conexão com o banco (npm run db:check).
 * Conecta, faz um ping, conta os registros de cada coleção e encerra, sem
 * subir a API. Útil para validar a senha e o IP liberado no Atlas.
 */
import "dotenv/config";
import mongoose from "mongoose";

const COLLECTIONS = [
  "users",
  "settings",
  "spools",
  "supplies",
  "equipment",
  "prints",
  "finishes",
];

/** Esconde a senha para poder exibir a URL no terminal. */
const maskPassword = (uri: string) =>
  uri.replace(/\/\/([^:/@]+):[^@/]+@/, "//$1:****@");

const hintFor = (message: string): string | null => {
  if (/auth|Authentication failed/i.test(message)) {
    return "Usuário ou senha errados. No Atlas: Database Access → edite o usuário ou crie um novo.";
  }

  if (/whitelist|IP|ECONNREFUSED|timed out|Server selection/i.test(message)) {
    return "Seu IP pode não estar liberado (Atlas: Network Access) ou o cluster está pausado (botão Resume).";
  }

  if (/ENOTFOUND|querySrv/i.test(message)) {
    return "Endereço do cluster errado ou sem internet/DNS.";
  }

  return null;
};

const checkDb = async () => {
  const uri = process.env.DB_CONNECTION;
  if (!uri) {
    console.error("✗ Defina DB_CONNECTION no arquivo .env (veja .env.example).");
    process.exitCode = 1;

    return;
  }

  console.log(`Conectando em ${maskPassword(uri)}…`);

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    const database = mongoose.connection.db;
    if (!database) {
      throw new Error("Conexão aberta, mas sem banco selecionado.");
    }

    const startedAt = Date.now();
    await database.admin().ping();
    console.log(
      `✓ Conectado ao banco "${database.databaseName}"! ping ${Date.now() - startedAt} ms`,
    );

    const counts = await Promise.all(
      COLLECTIONS.map(async (name) => ({
        name,
        count: await database.collection(name).countDocuments(),
      })),
    );
    console.log(
      counts.map(({ name, count }) => `  ${name}: ${count}`).join("\n"),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`✗ Falhou: ${message}`);

    const hint = hintFor(message);
    if (hint) {
      console.error(`  → ${hint}`);
    }

    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

await checkDb();
