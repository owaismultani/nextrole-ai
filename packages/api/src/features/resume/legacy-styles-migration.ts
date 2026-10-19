import type { SemanticStylesheet } from "@reactive-resume/schema/resume/stylesheet";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { migrateLetterStylesheet, migrateResumeStylesheet } from "./legacy-styles";

const BATCH = 200;

type Target = {
	table: string;
	column: string;
	/** Where the `metadata` object sits inside the column (a letter version keeps it under `style`). */
	owner: readonly string[];
	convert: (owner: unknown) => SemanticStylesheet | null;
};

const TARGETS: readonly Target[] = [
	{ table: "resume", column: "data", owner: [], convert: migrateResumeStylesheet },
	{ table: "resume_version", column: "data", owner: [], convert: migrateResumeStylesheet },
	{ table: "cover_letter", column: "style", owner: [], convert: migrateLetterStylesheet },
	{ table: "cover_letter_version", column: "data", owner: ["style"], convert: migrateLetterStylesheet },
];

/** One row's stylesheet before and after conversion: enough to put it back. `before` is the stored JSON text, or null when there was none. */
export type StylesheetChange = {
	table: string;
	id: string;
	before: string | null;
	after: SemanticStylesheet;
};

export type MigrateLegacyStylesOptions = {
	/** Without it nothing is written: rows are only converted and counted. */
	apply: boolean;
	/** Receives each change right before it's written, so it can be backed up first. */
	onChange?: (change: StylesheetChange) => void;
	log?: (message: string) => void;
};

type Counts = { candidates: number; migrated: number; changed: number; failed: number };
export type MigrateLegacyStylesSummary = Record<string, Counts>;

const jsonPath = (...keys: string[]) => sql.raw(`'{${keys.join(",")}}'`);

const targetSql = (target: Target) => {
	const column = sql.identifier(target.column);
	const path = (...keys: string[]) => jsonPath(...target.owner, ...keys);
	const stylesheetPath = path("metadata", "stylesheet");
	return {
		table: sql.identifier(target.table),
		column,
		owner: jsonPath(...target.owner),
		stylesheetPath,
		// Mirrors `needsLegacyStyleConversion`: still in the old editor's legacy mode, or legacy rules and no stylesheet.
		needsMigration: sql`(
			jsonb_typeof(${column} #> ${path("metadata")}) = 'object'
			AND (
				${column} #>> ${path("metadata", "stylesheet", "mode")} = 'legacy'
				OR (
					jsonb_typeof(${column} #> ${stylesheetPath}) IS DISTINCT FROM 'object'
					AND jsonb_typeof(${column} #> ${path("metadata", "styleRules")}) = 'array'
					AND jsonb_array_length(${column} #> ${path("metadata", "styleRules")}) > 0
				)
			)
		)`,
	};
};

/**
 * Converts every stored legacy style (old editor rules, or a legacy-mode stylesheet) to Semantic CSS. Only
 * `metadata.stylesheet` is rewritten, in place, so edits to the rest of a row aren't lost and the rules stay for
 * rollback. A row whose stylesheet changed after it was read is left alone (it's counted as `changed`; running again
 * picks it up if it still needs it), and one whose data doesn't parse is left as it is (`failed`). Safe to run again:
 * a converted row no longer matches.
 *
 * Each table is scanned once for the rows that need it, so it takes a connection without a statement timeout.
 */
export async function migrateLegacyStyles(
	db: NodePgDatabase,
	{ apply, onChange, log = () => {} }: MigrateLegacyStylesOptions,
): Promise<MigrateLegacyStylesSummary> {
	const summary: MigrateLegacyStylesSummary = {};

	for (const target of TARGETS) {
		const { table, column, owner, stylesheetPath, needsMigration } = targetSql(target);
		const found = await db.execute<{ id: string }>(
			sql`SELECT "id" FROM ${table} WHERE ${needsMigration} ORDER BY "id"`,
		);
		const ids = found.rows.map((row) => row.id);
		const counts: Counts = { candidates: ids.length, migrated: 0, changed: 0, failed: 0 };
		summary[target.table] = counts;
		log(`${target.table}: ${ids.length} rows need converting`);

		for (let start = 0; start < ids.length; start += BATCH) {
			const batch = await db.execute<{ id: string; owner: unknown; stylesheet: string | null }>(sql`
				SELECT "id", ${column} #> ${owner} AS "owner", (${column} #> ${stylesheetPath})::text AS "stylesheet"
				FROM ${table}
				WHERE "id" IN (SELECT jsonb_array_elements_text(${JSON.stringify(ids.slice(start, start + BATCH))}::jsonb))
					AND ${needsMigration}
			`);
			counts.changed += Math.min(BATCH, ids.length - start) - batch.rows.length;

			for (const row of batch.rows) {
				let after: SemanticStylesheet | null;
				try {
					after = target.convert(row.owner);
				} catch (error) {
					counts.failed++;
					log(`${target.table} ${row.id}: not converted, ${String((error as Error)?.message ?? error).slice(0, 200)}`);
					continue;
				}
				if (!after) continue;
				if (!apply) {
					counts.migrated++;
					continue;
				}

				onChange?.({ table: target.table, id: row.id, before: row.stylesheet, after });
				const updated = await db.execute(sql`
					UPDATE ${table}
					SET ${column} = jsonb_set(${column}, ${stylesheetPath}, ${JSON.stringify(after)}::jsonb)
					WHERE "id" = ${row.id} AND (${column} #> ${stylesheetPath}) IS NOT DISTINCT FROM ${row.stylesheet}::jsonb
				`);
				if (updated.rowCount) counts.migrated++;
				else counts.changed++;
			}
			log(
				`${target.table}: ${Math.min(start + BATCH, ids.length)}/${ids.length} (${apply ? "converted" : "would convert"} ${counts.migrated}, changed meanwhile ${counts.changed}, failed ${counts.failed})`,
			);
		}
	}

	return summary;
}

/**
 * Puts back the stylesheets `migrateLegacyStyles` replaced, from the changes it reported. A row whose stylesheet
 * isn't the converted one any more (edited since) is left alone and counted as `changed`.
 */
export async function restoreLegacyStyles(
	db: NodePgDatabase,
	changes: Iterable<StylesheetChange>,
): Promise<{ restored: number; changed: number }> {
	const counts = { restored: 0, changed: 0 };
	for (const change of changes) {
		const target = TARGETS.find(({ table }) => table === change.table);
		if (!target) throw new Error(`Unknown table in backup: ${change.table}`);
		const { table, column, stylesheetPath } = targetSql(target);
		const restored =
			change.before === null
				? sql`${column} #- ${stylesheetPath}`
				: sql`jsonb_set(${column}, ${stylesheetPath}, ${change.before}::jsonb)`;
		const updated = await db.execute(sql`
			UPDATE ${table}
			SET ${column} = ${restored}
			WHERE "id" = ${change.id} AND (${column} #> ${stylesheetPath}) = ${JSON.stringify(change.after)}::jsonb
		`);
		if (updated.rowCount) counts.restored++;
		else counts.changed++;
	}
	return counts;
}
