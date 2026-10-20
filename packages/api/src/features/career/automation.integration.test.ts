import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as tables from "@reactive-resume/db/schema";
import { careerAutomationInputSchema, careerScheduleInputSchema } from "@reactive-resume/schema/career";
import { sampleResumeData } from "@reactive-resume/schema/resume/sample";

const fixture = vi.hoisted(() => ({
	db: undefined as ReturnType<typeof import("drizzle-orm/node-postgres").drizzle> | undefined,
	search: vi.fn<typeof import("../applications/posting").searchJobPostings>(),
	read: vi.fn<typeof import("../applications/posting").readOpenPosting>(),
	generate: vi.fn(),
	/** Holds the preparation worker back so a test can look at queued work. */
	skipPrep: false,
	search_connection: { provider: "tavily", apiKey: "synthetic" } as { provider: string; apiKey: string } | null,
	ai: { id: "fixture", label: "Fixture", provider: "openai", model: "m", apiKey: "k", baseURL: "" } as object | null,
}));
vi.mock("@reactive-resume/db/client", () => ({
	get db() {
		return fixture.db;
	},
}));
vi.mock("@reactive-resume/env/server", async () => {
	const actual = await vi.importActual<typeof import("@reactive-resume/env/server")>("@reactive-resume/env/server");
	return {
		...actual,
		env: { ...actual.env, APP_URL: "http://localhost:3000", CLOUDFLARE: false, CRON_SECRET: undefined },
	};
});
vi.mock("../applications/posting", () => ({
	searchJobPostings: fixture.search,
	readOpenPosting: fixture.read,
	jobSearchQuery: (query: string) => `${query} job posting`,
}));
vi.mock("../web-access/credentials", () => ({
	webAccessService: { resolve: async () => fixture.search_connection },
}));
vi.mock("@reactive-resume/email/transport", () => ({ sendCareerNotification: vi.fn() }));
vi.mock("../ai-providers/service", () => ({
	aiProvidersService: {
		getRunnableById: async () => {
			if (!fixture.ai) throw new Error("not usable");
			return fixture.ai;
		},
		getDefaultRunnable: async () => fixture.ai,
	},
}));
vi.mock("../ai/service", () => ({ getModel: () => ({}) }));
vi.mock("../ai/generate-json", () => ({ generateJson: fixture.generate }));
vi.mock("./generate", () => ({ generateCareer: vi.fn() }));
vi.mock("./prepare", async (importOriginal) => {
	const actual = await importOriginal<typeof import("./prepare")>();
	return {
		...actual,
		runPreparations: async (limit?: number) => (fixture.skipPrep ? 0 : actual.runPreparations(limit)),
		runNow: actual.runPreparations,
	};
});
vi.mock("../resume/events", async () => ({
	...(await vi.importActual<object>("../resume/events")),
	publishResumeUpdated: async () => {},
}));

const databaseUrl = process.env.INTEGRATIONS_TEST_DATABASE_URL ?? process.env.COVER_LETTER_TEST_DATABASE_URL;
const getDb = () => {
	if (!fixture.db) throw new Error("Test database is not initialized.");
	return fixture.db;
};

const hit = (n: number) => ({
	title: `Engineer ${n}`,
	url: `https://jobs.example.test/opening/${n}`,
	description: "Build reliable things.",
});
const posting = (n: number) => ({
	page: {
		role: `Engineer ${n}`,
		company: `Company ${n}`,
		location: "Berlin",
		description: `Build reliable things at company ${n}.`,
		closesAt: "",
	},
	text: `Build reliable things at company ${n}.`,
	company: "",
});

describe.skipIf(!databaseUrl)("autonomous discovery and document preparation", () => {
	let automation: typeof import("./automation").careerAutomation;
	let jobs: typeof import("./jobs").careerJobs;
	let run: typeof import("./jobs").runCareerJobs;
	let prepare: typeof import("./prepare");
	let resumes: typeof import("../resume/service").resumeService;
	let admin: Pool;
	let pool: Pool;
	const schemaName = `career_auto_test_${randomUUID().replaceAll("-", "")}`;

	beforeAll(async () => {
		admin = new Pool({ connectionString: databaseUrl });
		await admin.query(`CREATE SCHEMA ${schemaName}`);
		pool = new Pool({
			connectionString: databaseUrl,
			options: `-c search_path=${schemaName} -c statement_timeout=15000`,
		});
		fixture.db = drizzle({ client: pool });
		const migrations = new URL("../../../../../migrations/", import.meta.url);
		const directories = (await readdir(migrations, { withFileTypes: true }))
			.filter((entry) => entry.isDirectory() && /^\d+_/.test(entry.name))
			.map((entry) => entry.name)
			.sort();
		for (const directory of directories) {
			const file = new URL(`${directory}/migration.sql`, migrations);
			if (existsSync(file)) await pool.query((await readFile(file, "utf8")).replaceAll('"public".', ""));
		}
		({ careerAutomation: automation } = await import("./automation"));
		({ careerJobs: jobs, runCareerJobs: run } = await import("./jobs"));
		prepare = await import("./prepare");
		({ resumeService: resumes } = await import("../resume/service"));
	}, 30_000);

	afterAll(async () => {
		await pool?.end();
		await admin?.query(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`);
		await admin?.end();
	});

	beforeEach(async () => {
		vi.stubEnv("VERCEL", "");
		fixture.skipPrep = false;
		fixture.search_connection = { provider: "tavily", apiKey: "synthetic" };
		fixture.ai = { id: "fixture", label: "Fixture", provider: "openai", model: "m", apiKey: "k", baseURL: "" };
		fixture.search.mockReset().mockResolvedValue([hit(1)]);
		fixture.read.mockReset().mockImplementation(async (url) => posting(Number(url.split("/").pop())));
		fixture.generate
			.mockReset()
			.mockImplementation(async (_model, { prompt }: { prompt: string }) =>
				prompt.includes("Tailor this candidate")
					? { summary: "<p>Reliability-focused engineer.</p>", experience: [], skillOrder: [] }
					: { body: "Dear hiring team\n\nI would like to apply.", missing: ["Why this company"] },
			);
		await pool.query('TRUNCATE "user" CASCADE');
		for (const id of ["alice", "bob"])
			await getDb()
				.insert(tables.user)
				.values({
					id,
					name: id,
					email: `${id}@example.test`,
					username: id,
					displayUsername: id,
					emailVerified: true,
				});
	});
	afterEach(() => vi.unstubAllEnvs());

	async function baseline(userId = "alice") {
		const id = await resumes.create({
			userId,
			name: "Baseline",
			tags: ["base"],
			data: structuredClone(sampleResumeData),
			locale: "en-US",
		});
		return id;
	}
	/** Everything one person sets up: discovery (a schedule in Career → Schedules) and document preparation. */
	const settings = (patch: Record<string, unknown> = {}) => ({
		discoveryEnabled: true,
		query: "Reliability engineer",
		retrievalBudget: null as number | null,
		resumesEnabled: false,
		lettersEnabled: false,
		baselineResumeId: null as string | null,
		aiProviderId: null as string | null,
		dailyLimit: 10,
		...patch,
	});
	/** Saves the documents settings, then the discovery schedule, as the two screens do. */
	async function save(userId: string, input: ReturnType<typeof settings>) {
		const { discoveryEnabled, query, retrievalBudget, ...docs } = input;
		const saved = await automation.save(userId, careerAutomationInputSchema.parse(docs));
		const [existing] = await getDb()
			.select()
			.from(tables.careerSchedule)
			.where(eq(tables.careerSchedule.userId, userId));
		if (discoveryEnabled || query)
			await jobs.save(userId, {
				...careerScheduleInputSchema.parse({
					kind: "discovery",
					query,
					enabled: discoveryEnabled,
					timezone: "Europe/Berlin",
					nextRunAt: existing?.nextRunAt ?? new Date(Date.now() + 3_600_000),
					intervalMinutes: 60,
					retrievalBudget,
				}),
				...(existing ? { id: existing.id } : {}),
			});
		return saved;
	}
	const runNow = (limit?: number) => (prepare as unknown as { runNow: typeof prepare.runPreparations }).runNow(limit);
	/** One scheduler tick that discovers but leaves the preparation worker idle. */
	async function discoverOnly() {
		fixture.skipPrep = true;
		try {
			await run();
		} finally {
			fixture.skipPrep = false;
		}
	}
	/** Runs ticks until the preparation queue is quiet. */
	async function settle(ticks = 6) {
		for (let i = 0; i < ticks; i++) await run();
	}
	const steps = () => getDb().select().from(tables.careerPreparation);
	const counts = async () => ({
		resumes: (await getDb().select().from(tables.resume).where(eq(tables.resume.userId, "alice"))).length,
		letters: (await getDb().select().from(tables.coverLetter)).length,
		applications: (await getDb().select().from(tables.application)).length,
	});

	it("explains missing configuration before turning anything on", async () => {
		await expect(save("alice", settings({ query: "" }))).rejects.toMatchObject({ code: "BAD_REQUEST" });
		fixture.search_connection = null;
		await expect(save("alice", settings())).rejects.toMatchObject({
			code: "PRECONDITION_FAILED",
			data: { missing: "search" },
		});
		fixture.search_connection = { provider: "tavily", apiKey: "x" };
		await expect(save("alice", settings({ resumesEnabled: true }))).rejects.toMatchObject({
			data: { missing: "baseline" },
		});
		const bobs = await baseline("bob");
		await expect(save("alice", settings({ resumesEnabled: true, baselineResumeId: bobs }))).rejects.toMatchObject({
			data: { missing: "baseline" },
		});
		fixture.ai = null;
		await expect(
			save("alice", settings({ lettersEnabled: true, baselineResumeId: await baseline() })),
		).rejects.toMatchObject({ data: { missing: "ai" } });
		expect(await getDb().select().from(tables.careerSchedule)).toHaveLength(0);
	});

	it("starts hourly discovery at once, keeps one schedule when it is edited, and defaults to off", async () => {
		expect(await automation.get("alice")).toMatchObject({
			resumesEnabled: false,
			lettersEnabled: false,
			discovery: null,
		});
		const existing = await jobs.save("alice", {
			kind: "discovery",
			query: "Old query",
			enabled: true,
			timezone: "Europe/Berlin",
			nextRunAt: new Date(Date.now() + 86_400_000),
			intervalDays: 3,
			intervalMinutes: null,
			email: false,
			interviewId: null,
			lead: null,
			aiProviderId: null,
			applicationId: null,
		} as never);
		expect((await automation.get("alice")).discovery).toMatchObject({
			scheduleId: existing.id,
			query: "Old query",
			intervalDays: 3,
		});
		await save("alice", settings());
		const schedules = await getDb().select().from(tables.careerSchedule);
		expect(schedules).toHaveLength(1);
		expect(schedules[0]).toMatchObject({ id: existing.id, intervalMinutes: 60, intervalDays: null });
		expect(schedules[0]?.nextRunAt.getTime()).toBeLessThanOrEqual(Date.now());
		await run();
		expect(fixture.search).toHaveBeenCalledOnce();
		const [after] = await getDb().select().from(tables.careerSchedule);
		expect(after?.nextRunAt.getTime()).toBeGreaterThan(Date.now());
	});

	it("queues the first run immediately for a brand new hourly schedule", async () => {
		await save("alice", settings());
		const [created] = await getDb().select().from(tables.careerSchedule);
		expect(created?.nextRunAt.getTime()).toBeLessThanOrEqual(Date.now());
		await run();
		expect(fixture.search).toHaveBeenCalledOnce();
	});

	it("saves discoveries without preparation work when both generation toggles are off", async () => {
		await save("alice", settings());
		await run();
		expect(await getDb().select().from(tables.careerOpportunity)).toHaveLength(1);
		expect(await steps()).toHaveLength(0);
		expect((await counts()).applications).toBe(0);
		expect(await automation.preparations("alice")).toEqual([]);
	});

	it("prepares only the requested document types for new jobs, linked to the application, leaving the baseline alone", async () => {
		const base = await baseline();
		const before = (await resumes.getById({ id: base, userId: "alice" })).data;
		await save("alice", settings({ resumesEnabled: true, lettersEnabled: true, baselineResumeId: base }));
		await discoverOnly();
		const queued = await steps();
		expect(queued.map((step) => step.kind).sort()).toEqual(["letter", "resume"]);
		expect((await counts()).applications).toBe(1);
		await settle(3);
		const [job] = await automation.preparations("alice");
		expect(job).toMatchObject({ summary: "ready", company: "Company 1" });
		const [app] = await getDb().select().from(tables.application);
		const made = await getDb()
			.select()
			.from(tables.resume)
			.where(eq(tables.resume.applicationId, app?.id ?? ""));
		expect(made).toHaveLength(1);
		expect(made[0]?.data.summary.content).toBe("<p>Reliability-focused engineer.</p>");
		expect(made[0]?.data.sections.experience.items.map((item) => item.company)).toEqual(
			before.sections.experience.items.map((item) => item.company),
		);
		expect(app?.resumeId).toBe(made[0]?.id);
		expect(app?.status).toBe("saved");
		const [letter] = await getDb().select().from(tables.coverLetter);
		expect(letter).toMatchObject({ sourceApplicationId: app?.id, sourceResumeId: base });
		expect((await resumes.getById({ id: base, userId: "alice" })).data).toEqual(before);
		expect(job?.steps.find((step) => step.kind === "letter")?.issues).toEqual([
			"Not in your resume or facts: Why this company",
		]);
	});

	it("keeps the two toggles independent", async () => {
		const base = await baseline();
		await save("alice", settings({ lettersEnabled: true, baselineResumeId: base }));
		await run();
		await settle(2);
		expect((await steps()).map((step) => step.kind)).toEqual(["letter"]);
		const [job] = await automation.preparations("alice");
		expect(job?.summary).toBe("ready");
		expect((await counts()).letters).toBe(1);
		expect((await counts()).resumes).toBe(1);
	});

	it("does not regenerate or duplicate anything when a job is found again", async () => {
		const base = await baseline();
		await save("alice", settings({ resumesEnabled: true, baselineResumeId: base }));
		await run();
		await settle(2);
		const first = await counts();
		await getDb()
			.update(tables.careerSchedule)
			.set({ nextRunAt: new Date(Date.now() - 1000), lastQueuedAt: null });
		await settle(3);
		expect(await counts()).toEqual(first);
		expect(await steps()).toHaveLength(1);
	});

	it("never prepares the backlog when a toggle is turned on later, and does not resurrect canceled work", async () => {
		const base = await baseline();
		await save("alice", settings());
		await run();
		await save("alice", settings({ resumesEnabled: true, baselineResumeId: base }));
		await settle(2);
		expect(await steps()).toHaveLength(0);

		// New discovery, then switch the toggle off while its step is still queued.
		fixture.search.mockResolvedValue([hit(2)]);
		await getDb()
			.update(tables.careerSchedule)
			.set({ nextRunAt: new Date(Date.now() - 1000), lastQueuedAt: null });
		await discoverOnly();
		const [queued] = await steps();
		expect(queued?.status).toBe("queued");
		await save("alice", settings({ resumesEnabled: false, baselineResumeId: base }));
		expect((await steps())[0]).toMatchObject({ status: "canceled", error: "setting-off" });
		await save("alice", settings({ resumesEnabled: true, baselineResumeId: base }));
		await settle(2);
		expect((await steps())[0]?.status).toBe("canceled");
		expect((await automation.preparations("alice"))[0]?.summary).toBe("skipped");
	});

	it("checks the toggle again when queued work is claimed, and lets running work finish", async () => {
		const base = await baseline();
		await save("alice", settings({ resumesEnabled: true, baselineResumeId: base }));
		await discoverOnly();
		// The toggle changes directly in the row, as if saved between enqueueing and claiming.
		await getDb().update(tables.careerAutomation).set({ resumesEnabled: false });
		await runNow();
		expect((await steps())[0]).toMatchObject({ status: "canceled", error: "setting-off" });

		// Work that is already running when the toggle is switched off may still save its output.
		await automation.regenerate("alice", (await steps())[0]?.id ?? "");
		const claimed = await prepare.claimPreparation();
		await getDb().update(tables.careerAutomation).set({ resumesEnabled: false });
		await save("alice", settings({ resumesEnabled: false, baselineResumeId: base }));
		expect((await steps())[0]?.status).toBe("running");
		expect(claimed).not.toBeNull();
	});

	it("prepares chosen existing jobs on request, even with the automatic toggle off", async () => {
		const base = await baseline();
		await save("alice", settings());
		await run();
		const [opportunity] = await getDb().select().from(tables.careerOpportunity);
		await expect(
			automation.prepare("bob", { opportunityIds: [opportunity?.id ?? ""], resume: true, letter: false }),
		).rejects.toThrow();
		await getDb().insert(tables.careerAutomation).values({ userId: "bob" });
		await expect(
			automation.prepare("bob", { opportunityIds: [opportunity?.id ?? ""], resume: true, letter: false }),
		).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
		await getDb()
			.update(tables.careerAutomation)
			.set({ baselineResumeId: base })
			.where(eq(tables.careerAutomation.userId, "alice"));
		await expect(
			automation.prepare("alice", { opportunityIds: [opportunity?.id ?? ""], resume: true, letter: false }),
		).resolves.toEqual({
			queued: 1,
		});
		await settle(2);
		expect((await automation.preparations("alice"))[0]?.summary).toBe("ready");
	});

	it("applies the daily limit once per generation even under concurrent workers, and defers the rest", async () => {
		const base = await baseline();
		await save("alice", settings({ resumesEnabled: true, baselineResumeId: base, dailyLimit: 2 }));
		fixture.search.mockResolvedValue([hit(1), hit(2), hit(3), hit(4), hit(5)]);
		await discoverOnly();
		const rows = await steps();
		expect(rows).toHaveLength(5);
		const outcomes = await Promise.all(rows.map((row) => prepare.reserveSlot(row, "Europe/Berlin")));
		expect(outcomes.filter((outcome) => outcome.ok)).toHaveLength(2);
		const [automationRow] = await getDb().select().from(tables.careerAutomation);
		expect(automationRow?.usageCount).toBe(2);
		expect((await steps()).filter((row) => row.counted)).toHaveLength(2);
		const deferred = outcomes.find((outcome) => !outcome.ok);
		expect(deferred && !deferred.ok && deferred.resetsAt.getTime()).toBeGreaterThan(Date.now());
		expect((await automation.get("alice")).usage).toMatchObject({ used: 2, limit: 2 });
	});

	it("defers work past the limit, shows when it may start, and does not count a retry twice", async () => {
		const base = await baseline();
		await save("alice", settings({ resumesEnabled: true, baselineResumeId: base, dailyLimit: 1 }));
		fixture.search.mockResolvedValue([hit(1), hit(2)]);
		await discoverOnly();
		// One step fails transiently once, then succeeds: still one slot.
		fixture.generate.mockRejectedValueOnce(Object.assign(new Error("busy"), { statusCode: 503 }));
		await getDb()
			.update(tables.careerPreparation)
			.set({ nextAttemptAt: new Date(Date.now() - 1000) });
		await runNow(1);
		let rows = await steps();
		const failedOnce = rows.find((row) => row.error === "provider");
		expect(failedOnce).toMatchObject({ status: "queued", counted: true });
		expect(failedOnce?.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());
		await getDb()
			.update(tables.careerPreparation)
			.set({ nextAttemptAt: new Date(Date.now() - 1000) });
		await settle(4);
		rows = await steps();
		expect(rows.filter((row) => row.status === "done")).toHaveLength(1);
		const waiting = rows.find((row) => row.status === "queued");
		expect(waiting).toMatchObject({ error: "daily-limit", attempts: 0 });
		expect(waiting?.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());
		const jobsView = await automation.preparations("alice");
		expect(jobsView.map((job) => job.summary).sort()).toEqual(["deferred", "ready"]);
		expect(jobsView.find((job) => job.summary === "deferred")?.steps[0]?.eligibleAt).toBeInstanceOf(Date);
		expect((await getDb().select().from(tables.careerAutomation))[0]?.usageCount).toBe(1);
	});

	it("backs off with Retry-After, then stops for attention after bounded attempts", async () => {
		const base = await baseline();
		await save("alice", settings({ resumesEnabled: true, baselineResumeId: base }));
		await discoverOnly();
		fixture.generate.mockRejectedValue(
			Object.assign(new Error("slow down"), { statusCode: 429, responseHeaders: { "retry-after": "1800" } }),
		);
		for (let attempt = 1; attempt <= prepare.MAX_ATTEMPTS; attempt++) {
			await getDb()
				.update(tables.careerPreparation)
				.set({ nextAttemptAt: new Date(Date.now() - 1000) });
			await runNow();
			const [row] = await steps();
			if (attempt < prepare.MAX_ATTEMPTS) {
				expect(row).toMatchObject({ status: "queued", error: "rate-limit", attempts: attempt });
				expect(row?.nextAttemptAt.getTime()).toBeGreaterThan(Date.now() + 1_700_000);
			} else expect(row).toMatchObject({ status: "failed", error: "rate-limit" });
		}
		expect((await automation.preparations("alice"))[0]?.summary).toBe("attention");
		// A failed run is not the end of discovery.
		expect((await getDb().select().from(tables.careerSchedule))[0]?.enabled).toBe(true);
	});

	it("keeps a finished document when the other step fails, and retries only the failed one", async () => {
		const base = await baseline();
		await save("alice", settings({ resumesEnabled: true, lettersEnabled: true, baselineResumeId: base }));
		await discoverOnly();
		fixture.generate.mockImplementation(async (_model, { prompt }: { prompt: string }) => {
			if (prompt.includes("Tailor this candidate")) return { summary: "<p>Ok.</p>", experience: [], skillOrder: [] };
			throw Object.assign(new Error("bad"), { statusCode: 400 });
		});
		for (let i = 0; i < 6; i++) {
			await getDb()
				.update(tables.careerPreparation)
				.set({ nextAttemptAt: new Date(Date.now() - 1000) })
				.where(eq(tables.careerPreparation.status, "queued"));
			await runNow();
		}
		const [job] = await automation.preparations("alice");
		expect(job?.summary).toBe("attention");
		expect(job?.steps.find((step) => step.kind === "resume")).toMatchObject({ status: "done" });
		const resumeCount = (await counts()).resumes;
		fixture.generate.mockImplementation(async () => ({ body: "Dear team\n\nHello.", missing: [] }));
		await automation.retry("alice", job?.steps.find((step) => step.kind === "letter")?.id ?? "");
		await settle(2);
		expect((await automation.preparations("alice"))[0]?.summary).toBe("ready");
		expect((await counts()).resumes).toBe(resumeCount);
		expect((await counts()).letters).toBe(1);
	});

	it("flags stale and edited documents, and regenerates only as a new copy beside the edited one", async () => {
		const base = await baseline();
		await save("alice", settings({ resumesEnabled: true, baselineResumeId: base }));
		await run();
		await settle(2);
		let [job] = await automation.preparations("alice");
		const step = job?.steps[0];
		expect(step).toMatchObject({ status: "done", stale: false, edited: false });
		// A person edits the generated resume and later the baseline changes.
		await new Promise((resolve) => setTimeout(resolve, 20));
		await getDb()
			.update(tables.resume)
			.set({ name: "My edit", updatedAt: new Date(Date.now() + 60_000) })
			.where(eq(tables.resume.id, step?.outputId ?? ""));
		await getDb()
			.update(tables.resume)
			.set({ name: "Baseline v2", updatedAt: new Date(Date.now() + 120_000) })
			.where(eq(tables.resume.id, base));
		[job] = await automation.preparations("alice");
		expect(job?.steps[0]).toMatchObject({ stale: true, edited: true });
		await automation.regenerate("alice", step?.id ?? "");
		await settle(2);
		const mine = await getDb().select().from(tables.resume).where(eq(tables.resume.userId, "alice"));
		expect(mine.find((row) => row.id === step?.outputId)?.name).toBe("My edit");
		expect(mine.filter((row) => row.tags.includes("auto"))).toHaveLength(2);
		[job] = await automation.preparations("alice");
		expect(job?.steps[0]).toMatchObject({ status: "done", generation: 2, stale: false });
	});

	it("isolates people from each other", async () => {
		const base = await baseline();
		await save("alice", settings({ resumesEnabled: true, baselineResumeId: base }));
		await run();
		const [step] = await steps();
		await expect(automation.retry("bob", step?.id ?? "")).rejects.toMatchObject({ code: "NOT_FOUND" });
		await expect(automation.regenerate("bob", step?.id ?? "")).rejects.toMatchObject({ code: "NOT_FOUND" });
		expect(await automation.preparations("bob")).toEqual([]);
		expect((await automation.get("bob")).discovery).toBeNull();
		await expect(
			jobs.runNow("bob", (await getDb().select().from(tables.careerSchedule))[0]?.id ?? ""),
		).rejects.toMatchObject({
			code: "NOT_FOUND",
		});
	});

	it("runs overlapping scheduler ticks without duplicating applications or documents", async () => {
		const base = await baseline();
		await save("alice", settings({ resumesEnabled: true, lettersEnabled: true, baselineResumeId: base }));
		await Promise.all([run(), run(), run()]);
		await Promise.all([run(), run(), run()]);
		expect((await counts()).applications).toBe(1);
		expect(await steps()).toHaveLength(2);
		await settle(3);
		expect(await counts()).toMatchObject({ applications: 1, letters: 1 });
		expect((await counts()).resumes).toBe(2);
	});

	it("serves different people before a long backlog from one", async () => {
		const aliceBase = await baseline();
		const bobBase = await baseline("bob");
		for (const [user, base] of [
			["alice", aliceBase],
			["bob", bobBase],
		] as const) {
			await save(user, settings({ resumesEnabled: true, baselineResumeId: base }));
		}
		fixture.search.mockResolvedValue([hit(1), hit(2), hit(3)]);
		await run();
		await getDb()
			.update(tables.careerPreparation)
			.set({ nextAttemptAt: new Date(Date.now() - 1000) });
		const first = await prepare.claimPreparation();
		const second = await prepare.claimPreparation();
		expect(first && second && first.userId !== second.userId).toBe(true);
	});

	it("pauses and resumes promptly, without replaying missed runs", async () => {
		await save("alice", settings());
		await run();
		const [schedule] = await getDb().select().from(tables.careerSchedule);
		await jobs.setEnabled("alice", schedule?.id ?? "", false);
		await getDb()
			.update(tables.careerSchedule)
			.set({ nextRunAt: new Date(Date.now() - 3 * 86_400_000) });
		const resumed = await jobs.setEnabled("alice", schedule?.id ?? "", true);
		expect(Date.now() - resumed.nextRunAt.getTime()).toBeLessThan(5_000);
		fixture.search.mockClear();
		await run();
		await run();
		expect(fixture.search).toHaveBeenCalledOnce();
	});

	it("passes the retrieval budget and a freshness window to the search, only for scheduled discovery", async () => {
		await save("alice", settings({ retrievalBudget: 18 }));
		await run();
		expect(fixture.search).toHaveBeenLastCalledWith(expect.any(String), expect.anything(), {
			limit: 18,
			since: undefined,
		});
		await getDb()
			.update(tables.careerSchedule)
			.set({ nextRunAt: new Date(Date.now() - 1000), lastQueuedAt: null });
		await run();
		const options = fixture.search.mock.calls.at(-1)?.[2];
		expect(options?.limit).toBe(18);
		expect(options?.since).toBeInstanceOf(Date);
		// At least two hours of overlap before the last success.
		expect(Date.now() - (options?.since?.getTime() ?? 0)).toBeGreaterThan(2 * 3_600_000 - 5_000);
	});

	it("keeps each discovery attempt as a paginated run that links its jobs to their own resume and letter", async () => {
		const base = await baseline();
		await save("alice", settings({ resumesEnabled: true, lettersEnabled: true, baselineResumeId: base }));
		const due = () =>
			getDb()
				.update(tables.careerSchedule)
				.set({ nextRunAt: new Date(Date.now() - 1000), lastQueuedAt: null });
		fixture.search.mockResolvedValue([hit(1)]);
		await run();
		await settle(3);
		fixture.search.mockResolvedValue([hit(2)]);
		await due();
		await run();
		await settle(3);
		fixture.search.mockRejectedValue(new Error("service down"));
		await due();
		await getDb().update(tables.careerJob).set({ status: "failed" });
		await run();

		const all = await automation.runs("alice", {});
		expect(all.total).toBe(3);
		expect(all.items.map((item) => item.report.outcome)).toEqual(["failed", "success", "success"]);
		expect(all.items[0]?.jobs).toEqual([]);

		// Newest first, one page at a time.
		const first = await automation.runs("alice", { limit: 1 });
		expect(first.items).toHaveLength(1);
		expect(first.total).toBe(3);
		const second = await automation.runs("alice", { limit: 1, offset: 1 });
		const third = await automation.runs("alice", { limit: 1, offset: 2 });
		expect(second.items[0]?.jobs).toMatchObject([{ company: "Company 2", summary: "ready" }]);
		expect(third.items[0]?.jobs).toMatchObject([{ company: "Company 1", summary: "ready" }]);

		// Each job points at the documents made for it, not another job's.
		const apps = await getDb().select().from(tables.application);
		for (const [item, company] of [
			[second, "Company 2"],
			[third, "Company 1"],
		] as const) {
			const job = item.items[0]?.jobs[0];
			const app = apps.find((row) => row.company === company);
			expect(job?.applicationId).toBe(app?.id);
			expect(job?.resume?.outputId).toBe(app?.resumeId);
			const [letter] = await getDb()
				.select()
				.from(tables.coverLetter)
				.where(eq(tables.coverLetter.sourceApplicationId, app?.id ?? ""));
			expect(job?.letter?.outputId).toBe(letter?.id);
		}
		expect(second.items[0]?.jobs[0]?.resume?.outputId).not.toBe(third.items[0]?.jobs[0]?.resume?.outputId);

		// A trashed document is no longer linked, and other people see none of this.
		const trashed = second.items[0]?.jobs[0]?.resume?.outputId ?? "";
		await getDb().update(tables.resume).set({ trashedAt: new Date() }).where(eq(tables.resume.id, trashed));
		expect((await automation.runs("alice", { limit: 1, offset: 1 })).items[0]?.jobs[0]?.resume?.outputId).toBeNull();
		expect(await automation.runs("bob", {})).toEqual({ total: 0, items: [] });
	});
});
