import { pgTable, serial, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";

// Table users
export const users = pgTable("users", {
    id: serial("id").primarykey(),

    name: text("name").notNull(),

    email: text("email").notNull().unique(),

    password: text("password").notNull(),

    role: text("role").notNull().default("user"), // admin / user

    is_active: boolean("is_active").default(true),
});


// Table Attendances
export const attendances = pgTable("attendances", {
     id: serial("id").primaryKey(),

    user_id: integer("user_id")
    .notNull()
    .references(() => users.id),

    check_in: timestamp("check_in").defaultNow(),

    check_out: timestamp("check_out"),

    note: text("note"),
});