import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("user", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: text("createdAt").default(`CURRENT_TIMESTAMP`),
});

export const files = sqliteTable("files", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  size: integer("size").notNull(),
  key: text("key").notNull(),
  uploadedAt: text("uploadedAt").default(`CURRENT_TIMESTAMP`),
  userId: integer("userId").references(() => users.id, { onDelete: "cascade" }),
});
