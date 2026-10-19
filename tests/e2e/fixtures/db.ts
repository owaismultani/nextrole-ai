import type { E2EAccount } from "./data";
import { Pool } from "pg";

function getDatabaseUrl() {
	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) throw new Error("DATABASE_URL is required for E2E cleanup.");

	return databaseUrl;
}

export async function deleteE2EUser(account: E2EAccount) {
	const pool = new Pool({ connectionString: getDatabaseUrl() });

	try {
		await pool.query('delete from "user" where email = $1 or username = $2', [account.email, account.username]);
	} finally {
		await pool.end();
	}
}
