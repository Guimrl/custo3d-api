import mongoose from "mongoose";

const uri = process.env.DB_CONNECTION;

if (!uri) {
  console.error("Defina DB_CONNECTION no arquivo .env (veja .env.example).");
  process.exit(1);
}
if (uri.includes("<db_password>")) {
  console.error(
    "Troque <db_password> pela senha real do banco no arquivo .env.",
  );
  process.exit(1);
}

mongoose.set("strictQuery", true);
mongoose.connect(uri);

const db = mongoose.connection;

export default db;
