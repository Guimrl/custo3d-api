/**
 * Cria o cadastro de marcas a partir dos carretéis que já existem
 * (npm run db:migrate-brands).
 *
 * - Junta grafias que só diferem em maiúsculas/espaços ("Voolt3d" e "Voolt3D")
 *   numa marca só, usando a grafia mais usada.
 * - Cada marca recebe os materiais dos carretéis dela (sem tipos: preencha
 *   pelo app, em Marcas).
 * - Liga cada carretel à marca (brandId) e padroniza o nome nele.
 *
 * Por padrão só mostra o que faria. Para gravar:
 *   npm run db:migrate-brands -- --apply
 * Pode rodar de novo: só mexe em carretéis com marca e ainda sem brandId.
 */
import "dotenv/config";
import lodash from "lodash";
import mongoose from "mongoose";

const apply = process.argv.includes("--apply");

interface SpoolRow {
  _id: mongoose.Types.ObjectId;
  brand?: string;
  material?: string;
}

const keyOf = (name: string) => name.trim().replace(/\s+/g, " ").toLowerCase();

const migrateBrands = async () => {
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

    // brandId: null também encontra carretéis antigos que nem têm o campo.
    const pending = (await spoolsCollection
      .find({ brand: { $exists: true }, brandId: null })
      .toArray()) as unknown as SpoolRow[];
    const groups = lodash.groupBy(
      pending.filter((spool) => spool.brand?.trim()),
      (spool) => keyOf(spool.brand!),
    );

    if (!pending.length) {
      console.log("Nenhum carretel com marca sem cadastro. Nada a fazer.");

      return;
    }

    for (const spoolsOfBrand of Object.values(groups)) {
      // Grafia mais usada vira o nome oficial.
      const spellings = lodash.countBy(spoolsOfBrand, (spool) => spool.brand!.trim());
      const name = lodash.maxBy(Object.keys(spellings), (spelling) => spellings[spelling])!;
      const materials = lodash.uniq(spoolsOfBrand.map((spool) => spool.material).filter(Boolean)) as string[];

      const existing = await brandsCollection.findOne(
        { name },
        { collation: { locale: "pt", strength: 2 } },
      );
      const variations = Object.keys(spellings).filter((spelling) => spelling !== name);

      console.log(
        `${existing ? "usa existente" : "cria"} "${name}"` +
          (variations.length ? ` (junta: ${variations.map((spelling) => `"${spelling}"`).join(", ")})` : "") +
          ` · ${spoolsOfBrand.length} carretel(is) · materiais: ${materials.join(", ") || "—"}`,
      );

      if (!apply) {
        continue;
      }

      let brandId: mongoose.Types.ObjectId;
      if (existing) {
        brandId = existing._id;
        // Marca já cadastrada: acrescenta materiais que ainda não estão nela.
        const known = new Set(((existing.materials ?? []) as { material: string }[]).map((row) => row.material.toLowerCase()));
        const missing = materials.filter((material) => !known.has(material.toLowerCase()));
        if (missing.length) {
          await brandsCollection.updateOne(
            { _id: brandId },
            { $push: { materials: { $each: missing.map((material) => ({ material, types: [] })) } } } as never,
          );
        }
      } else {
        const now = new Date();
        const inserted = await brandsCollection.insertOne({
          name,
          materials: materials.map((material) => ({ material, types: [] })),
          createdAt: now,
          updatedAt: now,
        });
        brandId = inserted.insertedId;
      }

      await spoolsCollection.updateMany(
        { _id: { $in: spoolsOfBrand.map((spool) => spool._id) } },
        { $set: { brandId, brand: name } },
      );
    }

    console.log(apply ? "\n✓ Marcas criadas e carretéis ligados." : "\nNada foi gravado. Para aplicar: npm run db:migrate-brands -- --apply");
  } catch (error) {
    console.error(`✗ Falhou: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

await migrateBrands();
