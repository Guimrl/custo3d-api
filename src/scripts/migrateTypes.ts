/**
 * Troca os acabamentos pelos tipos da marca (npm run db:migrate-types).
 *
 * - Os acabamentos do carretel (Silk, High Speed, Duo Color…) viram o tipo
 *   dele (`materialType`). Vários acabamentos viram um tipo só: "Duo Color Silk".
 * - Cor escrita com o tipo junto ("Preto - Lite", "Duo Color - Azul + Roxo")
 *   é separada: cor "Preto", tipo "Lite".
 * - O tipo entra no cadastro da marca, no material do carretel.
 * - Os acabamentos saem do carretel (finishIds). A coleção "finishes" fica
 *   no banco, sem uso; dá para apagar depois.
 *
 * Por padrão só mostra o que faria. Para gravar:
 *   npm run db:migrate-types -- --apply
 * Pode rodar de novo: só mexe em carretéis ainda sem tipo.
 */
import "dotenv/config";
import lodash from "lodash";
import mongoose from "mongoose";

const apply = process.argv.includes("--apply");

/** Tipos reconhecidos no nome da cor, além dos acabamentos cadastrados. */
const KNOWN_TYPES = [
  "Basic",
  "Lite",
  "Matte",
  "Silk",
  "Velvet",
  "High Speed",
  "Rainbow",
  "Duo Color",
  "Tri Color",
  "Glitter",
  "Translúcido",
  "Brilha no escuro",
  "Madeira",
  "Mármore",
  "Fibra de carbono",
];

interface SpoolRow {
  _id: mongoose.Types.ObjectId;
  brandId?: mongoose.Types.ObjectId | null;
  brand?: string;
  material?: string;
  materialType?: string;
  color?: string;
  finishIds?: mongoose.Types.ObjectId[];
}

interface FinishRow {
  _id: mongoose.Types.ObjectId;
  name: string;
  order?: number;
}

interface BrandMaterialRow {
  material: string;
  types: string[];
}

/** "Preto - Lite" → { color: "Preto", type: "Lite" }; sem tipo conhecido, devolve null. */
const splitColor = (color: string, knownTypes: string[]) => {
  const parts = color.split(" - ");
  if (parts.length !== 2) {
    return null;
  }

  const [left, right] = parts.map((part) => part.trim());
  const matchType = (text: string) => knownTypes.find((type) => type.toLowerCase() === text.toLowerCase());

  const leftType = matchType(left);
  if (leftType) {
    return { color: right, type: leftType };
  }

  const rightType = matchType(right);
  if (rightType) {
    return { color: left, type: rightType };
  }

  return null;
};

const migrateTypes = async () => {
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

    const spoolsCollection = database.collection("spools");
    const brandsCollection = database.collection("brands");

    const finishes = lodash.sortBy(
      (await database.collection("finishes").find().toArray()) as unknown as FinishRow[],
      "order",
    );
    const knownTypes = lodash.uniqBy([...KNOWN_TYPES, ...finishes.map((finish) => finish.name)], (type) => type.toLowerCase());

    const spools = (await spoolsCollection.find({}).toArray()) as unknown as SpoolRow[];
    const pending = spools.filter((spool) => !spool.materialType?.trim());
    let changed = 0;

    for (const spool of pending) {
      const finishIds = (spool.finishIds ?? []).map(String);
      const finishTypes = finishes.filter((finish) => finishIds.includes(String(finish._id))).map((finish) => finish.name);
      const fromColor = splitColor(spool.color ?? "", knownTypes);
      const types = lodash.uniqBy([...finishTypes, ...(fromColor ? [fromColor.type] : [])], (type) => type.toLowerCase());

      if (!types.length) {
        continue;
      }

      changed += 1;
      const materialType = types.join(" ");
      const color = fromColor?.color ?? spool.color;
      console.log(
        `${spool.brand ?? "sem marca"} ${spool.material} "${spool.color}" → tipo "${materialType}"` +
          (color !== spool.color ? `, cor "${color}"` : ""),
      );

      if (!apply) {
        continue;
      }

      await spoolsCollection.updateOne(
        { _id: spool._id },
        { $set: { materialType, color }, $unset: { finishIds: "" } },
      );

      if (!spool.brandId || !spool.material) {
        continue;
      }

      // Leva o tipo para o cadastro da marca, no material do carretel.
      const brand = await brandsCollection.findOne({ _id: spool.brandId });
      if (!brand) {
        continue;
      }

      const materials = (brand.materials ?? []) as BrandMaterialRow[];
      const row = materials.find((item) => item.material.toLowerCase() === spool.material!.toLowerCase());
      if (row) {
        if (!row.types.some((type) => type.toLowerCase() === materialType.toLowerCase())) {
          row.types.push(materialType);
        }
      } else {
        materials.push({ material: spool.material, types: [materialType] });
      }
      await brandsCollection.updateOne({ _id: brand._id }, { $set: { materials } });
    }

    if (!changed) {
      console.log("Nenhum carretel com acabamento ou tipo no nome da cor. Nada a fazer.");

      return;
    }

    console.log(
      apply
        ? `\n✓ ${changed} carretel(is) com tipo, e os tipos foram para o cadastro das marcas.`
        : `\n${changed} carretel(is). Nada foi gravado. Para aplicar: npm run db:migrate-types -- --apply`,
    );
  } catch (error) {
    console.error(`✗ Falhou: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

await migrateTypes();
