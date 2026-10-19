import { describe, expect, it } from "vitest";
import { collectExpectedColumns, verifyMigratedSchema } from "./schema-check";

describe("collectExpectedColumns", () => {
	it("collects every column of every schema table", () => {
		const expected = collectExpectedColumns();
		expect(expected.length).toBeGreaterThan(0);
		expect(expected).toContainEqual({ tableName: "ai_providers", columnName: "user_id" });
		expect(expected).toContainEqual({ tableName: "user", columnName: "id" });
	});
});

describe("verifyMigratedSchema", () => {
	it("fails with the table name when every column of a table is missing", async () => {
		const rows = collectExpectedColumns()
			.filter((e) => e.tableName === "ai_providers")
			.map((e) => ({ table_name: e.tableName, column_name: e.columnName }));

		const queryable = { query: async () => ({ rows }) };
		await expect(verifyMigratedSchema(queryable)).rejects.toThrow('table "ai_providers"');
	});
});
