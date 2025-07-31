import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";

const client = createClient({
  url: "file:./db_data/app.db",
});

export const db = drizzle(client);
