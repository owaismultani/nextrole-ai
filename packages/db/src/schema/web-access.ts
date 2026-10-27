import * as pg from "drizzle-orm/pg-core";
import { user } from "./auth";

/** One selected web connection per user. */
export const webAccessCredential = pg.pgTable("web_access_credentials", {
	userId: pg
		.text("user_id")
		.primaryKey()
		.references(() => user.id, { onDelete: "cascade" }),
	provider: pg.text("provider", { enum: ["firecrawl", "tavily", "exa"] }).notNull(),
	encryptedApiKey: pg.text("encrypted_api_key").notNull(),
});

/** A personal key for one keyed job source (Adzuna, Reed, Jooble, USAJOBS, The Muse); the fields are encrypted as JSON. */
export const jobSourceCredential = pg.pgTable(
	"job_source_credentials",
	{
		userId: pg
			.text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		source: pg.text("source").notNull(),
		encryptedFields: pg.text("encrypted_fields").notNull(),
	},
	(t) => [pg.primaryKey({ columns: [t.userId, t.source] })],
);
