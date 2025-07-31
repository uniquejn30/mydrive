import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.js",
  out: "./db_data/migrations",
  dbCredentials: {
    url: "file:./db_data/app.db",
  },
  dialect: "sqlite",
  verbose: true,
  strict: true,
});
