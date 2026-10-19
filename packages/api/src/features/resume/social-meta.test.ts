import { describe, expect, it, vi } from "vitest";
import { sampleResumeData } from "@reactive-resume/schema/resume/sample";
import { getPublicResumeSocialMeta } from "./social-meta";

// The real lookup query, run against a stand-in `pg` client that records the SQL and returns `rows`.
const pg = vi.hoisted(() => ({ queries: [] as { text: string; params: unknown[] }[], rows: [] as unknown[][] }));
vi.mock("@reactive-resume/db/client", async () => {
	const { drizzle } = await import("drizzle-orm/node-postgres");
	const client = {
		query: ({ text }: { text: string }, params: unknown[]) => {
			pg.queries.push({ text, params });
			return Promise.resolve({ rows: pg.rows });
		},
	};
	return { db: drizzle({ client: client as never }) };
});

describe("getPublicResumeSocialMeta", () => {
	it("cards only public, password-free resumes outside Trash, showing what an anonymous visitor sees", async () => {
		const data = structuredClone(sampleResumeData);
		data.basics.name = "";
		data.summary.hidden = true;
		pg.rows = [["Senior Eng @ Foo — final draft", data]];

		const meta = await getPublicResumeSocialMeta({ username: "jane", slug: "resume" });

		const [query] = pg.queries;
		expect(query?.text).toContain('"resume"."is_public" = $3');
		expect(query?.params[2]).toBe(true);
		expect(query?.text).toContain('"resume"."password" is null');
		expect(query?.text).toContain('"resume"."trashed_at" is null');
		expect(meta).toMatchObject({ name: "Resume", description: data.basics.headline });
	});
});
