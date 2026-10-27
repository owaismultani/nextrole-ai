import type { SourceKey } from "./types";
import type { JobSearchSource } from "@reactive-resume/schema/career";
import { ORPCError } from "@orpc/client";
import { and, eq } from "drizzle-orm";
import { db } from "@reactive-resume/db/client";
import { jobSourceCredential } from "@reactive-resume/db/schema";
import { env } from "@reactive-resume/env/server";
import { decryptCredential, encryptCredential } from "../ai/credentials";
import { searchSources } from "./registry";

/** The operator's shared key for a source, when every field is set. */
function serverKey(source: JobSearchSource): SourceKey | null {
	switch (source) {
		case "adzuna":
			return env.JOB_SOURCE_ADZUNA_APP_ID && env.JOB_SOURCE_ADZUNA_APP_KEY
				? { appId: env.JOB_SOURCE_ADZUNA_APP_ID, appKey: env.JOB_SOURCE_ADZUNA_APP_KEY }
				: null;
		case "reed":
			return env.JOB_SOURCE_REED_API_KEY ? { apiKey: env.JOB_SOURCE_REED_API_KEY } : null;
		case "jooble":
			return env.JOB_SOURCE_JOOBLE_API_KEY ? { apiKey: env.JOB_SOURCE_JOOBLE_API_KEY } : null;
		case "usajobs":
			return env.JOB_SOURCE_USAJOBS_API_KEY && env.JOB_SOURCE_USAJOBS_EMAIL
				? { apiKey: env.JOB_SOURCE_USAJOBS_API_KEY, email: env.JOB_SOURCE_USAJOBS_EMAIL }
				: null;
		case "themuse":
			return env.JOB_SOURCE_THEMUSE_API_KEY ? { apiKey: env.JOB_SOURCE_THEMUSE_API_KEY } : null;
		default:
			return null;
	}
}

const keyedSources = () =>
	Object.values(searchSources).filter((source) => source.key !== null) as Array<
		(typeof searchSources)[JobSearchSource] & { key: NonNullable<(typeof searchSources)[JobSearchSource]["key"]> }
	>;

async function savedKeys(userId: string) {
	if (!env.ENCRYPTION_SECRET) return new Map<string, string>();
	const rows = await db.select().from(jobSourceCredential).where(eq(jobSourceCredential.userId, userId));
	return new Map(rows.map((row) => [row.source, row.encryptedFields]));
}

function decrypt(payload: string): SourceKey | null {
	try {
		const fields = JSON.parse(decryptCredential(payload)) as unknown;
		return fields && typeof fields === "object" ? (fields as SourceKey) : null;
	} catch {
		// Sealed with another secret or damaged: the user enters the key again.
		return null;
	}
}

export const jobSourceKeys = {
	/** Each keyed source: which fields it takes, and whether a key is in place from the server or the user. */
	status: async (userId: string) => {
		const saved = await savedKeys(userId);
		return keyedSources().map((source) => {
			const managed = serverKey(source.id) !== null;
			return {
				source: source.id,
				fields: source.key.fields,
				optional: source.key.optional ?? false,
				managed,
				saved: !managed && saved.has(source.id),
				canSave: !managed && !!env.ENCRYPTION_SECRET,
			};
		});
	},

	/** The keys a search can use: the server's first, then the user's own. */
	resolve: async (userId: string): Promise<Map<JobSearchSource, SourceKey>> => {
		const saved = await savedKeys(userId);
		const keys = new Map<JobSearchSource, SourceKey>();
		for (const source of keyedSources()) {
			const key = serverKey(source.id) ?? (saved.has(source.id) ? decrypt(saved.get(source.id) ?? "") : null);
			if (key && source.key.fields.every((field) => key[field])) keys.set(source.id, key);
		}
		return keys;
	},

	save: async (userId: string, source: JobSearchSource, fields: Record<string, string>) => {
		const adapter = searchSources[source];
		if (!adapter.key) throw new ORPCError("BAD_REQUEST", { message: "This source doesn't take a key." });
		if (serverKey(source)) throw new ORPCError("FORBIDDEN", { message: "This source's key is managed by the server." });
		if (!env.ENCRYPTION_SECRET)
			throw new ORPCError("PRECONDITION_FAILED", { message: "Credential encryption is not configured." });
		const key: SourceKey = {};
		for (const field of adapter.key.fields) {
			const value = fields[field]?.trim();
			if (!value) throw new ORPCError("BAD_REQUEST", { message: `Enter the ${field}.` });
			key[field] = value;
		}
		const { encryptedApiKey } = encryptCredential(JSON.stringify(key));
		await db
			.insert(jobSourceCredential)
			.values({ userId, source, encryptedFields: encryptedApiKey })
			.onConflictDoUpdate({
				target: [jobSourceCredential.userId, jobSourceCredential.source],
				set: { encryptedFields: encryptedApiKey },
			});
	},

	delete: async (userId: string, source: JobSearchSource) => {
		await db
			.delete(jobSourceCredential)
			.where(and(eq(jobSourceCredential.userId, userId), eq(jobSourceCredential.source, source)));
	},
};
