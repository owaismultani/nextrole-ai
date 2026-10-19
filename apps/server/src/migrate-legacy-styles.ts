import type { StylesheetChange } from "@reactive-resume/api/features/resume/legacy-styles-migration";
import { closeSync, openSync, readFileSync, writeSync } from "node:fs";
import { parseArgs } from "node:util";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { migrateLegacyStyles, restoreLegacyStyles } from "@reactive-resume/api/features/resume/legacy-styles-migration";
import { env } from "@reactive-resume/env/server";

const usage = `Converts resumes and letters still styled by the old style editor (legacy style rules) to Semantic CSS.
Uses DATABASE_URL. Run it once after deploying the version without the legacy renderer.

  node apps/server/dist/migrate-legacy-styles.mjs
      Dry run: converts every row that needs it in memory and reports the counts. Writes nothing.

  node apps/server/dist/migrate-legacy-styles.mjs --apply --backup <file>
      Converts and saves. Every replaced stylesheet is appended to <file> (NDJSON) before its row is written.
      Safe to run again or after an interruption: converted rows are skipped. Use a new file or the same one.

  node apps/server/dist/migrate-legacy-styles.mjs --restore <file>
      Puts back the stylesheets recorded in <file>, except on rows whose stylesheet was edited since.
`;

const { values } = parseArgs({
	options: {
		apply: { type: "boolean", default: false },
		backup: { type: "string" },
		restore: { type: "string" },
		help: { type: "boolean", default: false },
	},
});

if (values.help || (values.apply && !values.backup) || (values.restore && (values.apply || values.backup))) {
	console.info(usage);
	process.exit(values.help ? 0 : 1);
}

// Opened before connecting, so an unwritable path fails before anything changes.
const backup = values.backup ? openSync(values.backup, "a") : undefined;

const pool = new Pool({ connectionString: env.DATABASE_URL, max: 1, connectionTimeoutMillis: 10_000 });
const client = await pool.connect();
const log = (message: string) => console.info(`[${new Date().toISOString()}] ${message}`);

try {
	// Finding the rows is one scan per table, which can outlast the database's default statement timeout.
	await client.query("SET statement_timeout = 0");
	const db = drizzle({ client });

	if (values.restore) {
		const changes = readFileSync(values.restore, "utf8")
			.split("\n")
			.filter((line) => line.trim())
			.map((line) => JSON.parse(line) as StylesheetChange);
		log(`Restoring ${changes.length} stylesheets from ${values.restore}`);
		log(`Done: ${JSON.stringify(await restoreLegacyStyles(db, changes))}`);
	} else {
		log(values.apply ? `Converting, backing up to ${values.backup}` : "Dry run: nothing will be written");
		const summary = await migrateLegacyStyles(db, {
			apply: values.apply,
			log,
			...(backup === undefined ? {} : { onChange: (change) => writeSync(backup, `${JSON.stringify(change)}\n`) }),
		});
		log(`Done: ${JSON.stringify(summary)}`);
	}
} finally {
	if (backup !== undefined) closeSync(backup);
	client.release();
	await pool.end();
}
