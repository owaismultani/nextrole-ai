import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as tables from "@reactive-resume/db/schema";
import {
	careerAutomationInputSchema,
	careerScheduleInputSchema,
	careerSetupLaunchSchema,
	DEFAULT_COVER_LETTER_PROMPT,
	DEFAULT_RESUME_PROMPT,
} from "@reactive-resume/schema/career";
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
	/** The connection chosen in Automation was switched off or removed; the default still works. */
	chosenGone: false,
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
			if (!fixture.ai || fixture.chosenGone) throw new Error("not usable");
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
		fixture.chosenGone = false;
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
		// The letter waited for the tailored copy and was written from it.
		expect(letter).toMatchObject({ sourceApplicationId: app?.id, sourceResumeId: made[0]?.id });
		const letterCall = fixture.generate.mock.calls
			.map(([, request]) => request as { prompt: string })
			.find(({ prompt }) => prompt.includes("Write the body of a cover letter"));
		expect(letterCall?.prompt).toContain("Reliability-focused engineer.");
		expect((await resumes.getById({ id: base, userId: "alice" })).data).toEqual(before);
		expect(job?.steps.find((step) => step.kind === "letter")?.issues).toEqual([
			"Not in your resume or facts: Why this company",
		]);
	});

	it("uses default instructions and passes saved instructions to both generators", async () => {
		const initial = await automation.get("alice");
		expect(initial.resumePrompt).toBe(DEFAULT_RESUME_PROMPT);
		expect(initial.coverLetterPrompt).toBe(DEFAULT_COVER_LETTER_PROMPT);
		const base = await baseline();
		const resumePrompt = "Emphasize reliability work.";
		const coverLetterPrompt = "Use a direct, warm tone.";
		const saved = await save(
			"alice",
			settings({
				resumesEnabled: true,
				lettersEnabled: true,
				baselineResumeId: base,
				resumePrompt,
				coverLetterPrompt,
			}),
		);
		expect(saved).toMatchObject({ resumePrompt, coverLetterPrompt });
		await run();
		await runNow();
		const calls = fixture.generate.mock.calls.map(([, request]) => request as { prompt: string; system?: string });
		expect(calls.find(({ prompt }) => prompt.includes("Tailor this candidate"))?.prompt).toContain(resumePrompt);
		const letter = calls.find(({ prompt }) => prompt.includes("Write the body of a cover letter"));
		expect(letter?.prompt).toContain(coverLetterPrompt);
		expect(letter?.system).toContain("Additional-instruction markers contain the candidate's writing preferences");
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

	/** The generations kept in a document's History, oldest first. */
	const generations = async (table: "resume" | "letter", documentId: string) => {
		const rows =
			table === "resume"
				? await getDb().select().from(tables.resumeVersion).where(eq(tables.resumeVersion.resumeId, documentId))
				: await getDb()
						.select()
						.from(tables.coverLetterVersion)
						.where(eq(tables.coverLetterVersion.coverLetterId, documentId));
		return rows
			.filter((row) => row.kind === "generated")
			.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
			.map((row) => ({ name: row.name, data: row.data }));
	};

	it("flags stale and edited documents, and regenerates over the same resume with the edits kept in History", async () => {
		const base = await baseline();
		await save("alice", settings({ resumesEnabled: true, baselineResumeId: base }));
		await run();
		await settle(2);
		let [job] = await automation.preparations("alice");
		const step = job?.steps[0];
		expect(step).toMatchObject({ status: "done", stale: false, edited: false });
		const outputId = step?.outputId ?? "";
		// A person edits the generated resume and later the baseline changes.
		await new Promise((resolve) => setTimeout(resolve, 20));
		const [made] = await getDb().select().from(tables.resume).where(eq(tables.resume.id, outputId));
		const edited = structuredClone(made?.data);
		if (!edited) throw new Error("Expected the generated resume.");
		edited.summary.content = "<p>My own words.</p>";
		await getDb()
			.update(tables.resume)
			.set({ name: "My edit", data: edited, updatedAt: new Date(Date.now() + 60_000) })
			.where(eq(tables.resume.id, outputId));
		await getDb()
			.update(tables.resume)
			.set({ name: "Baseline v2", updatedAt: new Date(Date.now() + 120_000) })
			.where(eq(tables.resume.id, base));
		[job] = await automation.preparations("alice");
		expect(job?.steps[0]).toMatchObject({ stale: true, edited: true });

		fixture.generate.mockImplementation(async () => ({
			summary: "<p>Second generation.</p>",
			experience: [],
			skillOrder: [],
		}));
		await automation.regenerate("alice", step?.id ?? "");
		await settle(2);
		const mine = await getDb().select().from(tables.resume).where(eq(tables.resume.userId, "alice"));
		// One document: the same resume, keeping the name the person gave it, now holding generation 2.
		expect(mine.filter((row) => row.tags.includes("auto"))).toHaveLength(1);
		const current = mine.find((row) => row.id === outputId);
		expect(current?.name).toBe("My edit");
		expect(current?.data.summary.content).toBe("<p>Second generation.</p>");
		const history = await generations("resume", outputId);
		expect(history.map((version) => version.name)).toEqual(["Generation 1 · your edits", "Generation 2"]);
		expect(history[0]?.data).toMatchObject({ summary: { content: "<p>My own words.</p>" } });
		[job] = await automation.preparations("alice");
		expect(job?.steps[0]).toMatchObject({ status: "done", generation: 2, stale: false, edited: false, outputId });
		const [replaced] = await getDb()
			.select()
			.from(tables.resumeVersion)
			.where(eq(tables.resumeVersion.id, job?.steps[0]?.replacedVersionId ?? ""));
		expect(replaced?.name).toBe("Generation 1 · your edits");
		expect((await steps())[0]).toMatchObject({ outputId, outputGeneration: 2 });
	});

	it("regenerates a cover letter over the same letter and keeps the earlier one in History", async () => {
		const base = await baseline();
		await save("alice", settings({ lettersEnabled: true, baselineResumeId: base }));
		await run();
		let [job] = await automation.preparations("alice");
		const first = job?.steps[0];
		expect(first).toMatchObject({ kind: "letter", status: "done" });
		const letterId = first?.outputId ?? "";
		await automation.regenerate("alice", first?.id ?? "");
		[job] = await automation.preparations("alice");
		// While it is being made again the step shows no document, as before.
		expect(job?.steps[0]).toMatchObject({ status: "queued", outputId: null, generation: 2 });
		fixture.generate.mockImplementation(async () => ({ body: "Dear team\n\nA fresh start.", missing: [] }));
		await runNow();
		[job] = await automation.preparations("alice");
		expect(job?.steps[0]).toMatchObject({ status: "done", generation: 2, outputId: letterId, issues: [] });
		const letters = await getDb().select().from(tables.coverLetter);
		expect(letters).toHaveLength(1);
		expect(letters[0]?.content).toContain("A fresh start.");
		const history = await generations("letter", letterId);
		expect(history.map((version) => version.name)).toEqual(["Generation 1", "Generation 2"]);
		expect(history[0]?.data).toMatchObject({ content: expect.stringContaining("I would like to apply.") });
	});

	it("makes a new document when the earlier generation was trashed", async () => {
		const base = await baseline();
		await save("alice", settings({ resumesEnabled: true, baselineResumeId: base }));
		await run();
		await settle(2);
		const [step] = await steps();
		await getDb()
			.update(tables.resume)
			.set({ trashedAt: new Date() })
			.where(eq(tables.resume.id, step?.outputId ?? ""));
		await automation.regenerate("alice", step?.id ?? "");
		await settle(2);
		const [after] = await steps();
		expect(after).toMatchObject({ status: "done", generation: 2, outputGeneration: 2, replacedVersionId: null });
		expect(after?.outputId).not.toBe(step?.outputId);
		expect(await generations("resume", after?.outputId ?? "")).toEqual([]);
	});

	it("does not generate again when a regenerate was saved but the step was not yet marked done", async () => {
		const base = await baseline();
		await save("alice", settings({ resumesEnabled: true, baselineResumeId: base }));
		await run();
		await settle(2);
		const [step] = await steps();
		// The document already holds generation 2; the worker stopped before recording the step as done.
		await getDb()
			.update(tables.careerPreparation)
			.set({ status: "queued", generation: 2, outputGeneration: 2, nextAttemptAt: new Date(Date.now() - 1000) });
		fixture.generate.mockClear();
		await runNow();
		expect(fixture.generate).not.toHaveBeenCalled();
		expect((await steps())[0]).toMatchObject({ status: "done", outputId: step?.outputId, generation: 2 });
		expect(await generations("resume", step?.outputId ?? "")).toEqual([]);
	});

	it("uses the default AI connection when the one chosen for documents is gone", async () => {
		const base = await baseline();
		await getDb().insert(tables.aiProvider).values({
			id: "chosen",
			userId: "alice",
			label: "Chosen",
			provider: "openai",
			model: "m",
			enabled: true,
			testStatus: "success",
			encryptedApiKey: "",
			apiKeySalt: "",
			apiKeyHash: "",
			apiKeyPreview: "",
		});
		await save("alice", settings({ resumesEnabled: true, baselineResumeId: base, aiProviderId: "chosen" }));
		fixture.chosenGone = true;
		await run();
		await settle(2);
		expect((await steps())[0]).toMatchObject({ status: "done", error: null });
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

	it("summarises the whole pipeline for the dashboard, only for the person asking", async () => {
		const { careerOverview } = await import("./overview");
		const base = await baseline();
		await save(
			"alice",
			settings({ resumesEnabled: true, lettersEnabled: true, baselineResumeId: base, dailyLimit: 4 }),
		);
		fixture.search.mockResolvedValue([hit(1), hit(2)]);
		await run();
		await settle(6);

		const overview = await careerOverview("alice", 14);
		const stage = (key: string) => overview.stages.find((item) => item.key === key);
		expect(stage("search")).toMatchObject({ state: "ok", count: 2 });
		expect(stage("save")).toMatchObject({ state: "ok", count: 2 });
		expect(stage("prepare")).toMatchObject({ state: "ok", count: 2 });
		expect(stage("review")).toMatchObject({ state: "yours", count: 2 });
		expect(overview.needsYou).toMatchObject({
			readyDocuments: 2,
			attentionDocuments: 0,
			savedJobs: 2,
			discoveryFailing: false,
		});
		// The limit of four is fully used, which the checklist flags; everything else passes.
		expect(overview.checks.filter((check) => check.status !== "ok").map((check) => check.key)).toEqual(["limit"]);
		expect(overview.discovery).toMatchObject({ enabled: true, failing: false, totals: { runs: 1, matches: 2 } });
		expect(overview.discovery.runs).toHaveLength(1);
		expect(overview.discovery.latestRunId).toEqual(expect.any(String));
		// Two jobs with a resume and a letter each use the whole limit of four, and nothing is waiting.
		expect(overview.automation).toMatchObject({ limit: 4, used: 4, deferred: 0, stale: 0 });

		// The action list names each job's documents, and the latest discovery points at its first new job.
		expect(overview.actions.counts).toEqual({ ready: 2, followUps: 0, issues: 0 });
		expect(overview.actions.items.map((item) => item.kind)).toEqual(["ready", "ready"]);
		expect(overview.actions.items[0]).toMatchObject({ done: expect.arrayContaining(["resume", "letter"]) });
		expect(overview.latestDiscovery).toMatchObject({ outcome: "success", matches: 2, found: 2 });
		expect(overview.latestDiscovery?.job).toMatchObject({ company: expect.stringContaining("Company") });
		expect(overview.outcomes).toEqual({ submitted: 0, firstResponses: 0, interviews: 0, offers: 0 });
		expect(overview.nextInterview).toBeNull();
		expect(overview.automation.generating).toBe(0);

		// A shorter history window never hides a task that is still pending.
		const shortWindow = await careerOverview("alice", 7);
		expect(shortWindow.actions.items).toEqual(overview.actions.items);
		expect(shortWindow.actions.counts).toEqual(overview.actions.counts);

		const bobs = await careerOverview("bob", 14);
		expect(bobs.stages.find((item) => item.key === "schedule")?.state).toBe("off");
		expect(bobs.actions.items).toEqual([]);
		expect(bobs.latestDiscovery).toBeNull();
		expect(bobs.discovery.scheduleId).toBeNull();
		expect(bobs.needsYou.readyDocuments).toBe(0);
	});

	describe("what happens under the hood", () => {
		it("records every search result of a run with what became of it", async () => {
			const { careerActivity } = await import("./activity");
			await save("alice", settings());
			fixture.search.mockResolvedValue([hit(1), hit(2), { title: "Odd", url: "not a url", description: "" }, hit(3)]);
			fixture.read.mockImplementation(async (url) => {
				const n = Number(url.split("/").pop());
				if (n === 2) return null;
				if (n === 3) throw new Error("blocked");
				return posting(n);
			});
			await run();
			const [first] = (await automation.runs("alice", {})).items;
			const detail = await careerActivity.runDetail("alice", first?.id ?? "");
			const byDecision = Object.fromEntries(detail.items.map((item) => [item.url.split("/").pop(), item.decision]));
			expect(byDecision).toMatchObject({ "1": "new", "2": "rejected", "3": "unreadable", "not a url": "invalid" });
			expect(detail.items.find((item) => item.decision === "new")?.host).toBe("jobs.example.test");
			// A result that became a role points at it; an unusable address points at nothing.
			const roleItem = detail.items.find((item) => item.decision === "new");
			expect(roleItem?.opportunityId).toEqual(expect.any(String));
			expect(roleItem?.applicationId).toBeNull();
			expect(detail.items.find((item) => item.url === "not a url")?.opportunityId).toBeNull();
			await expect(careerActivity.runDetail("bob", first?.id ?? "")).rejects.toMatchObject({ code: "NOT_FOUND" });
		});

		it("tells one job's story from discovery to its finished documents, and nobody else's", async () => {
			const { careerActivity } = await import("./activity");
			const base = await baseline();
			await save("alice", settings({ resumesEnabled: true, lettersEnabled: true, baselineResumeId: base }));
			await discoverOnly();
			await settle(4);
			const [job] = await getDb().select().from(tables.careerOpportunity);
			const story = await careerActivity.journey("alice", job?.id ?? "");
			const kinds = story.events.map((event) => event.kind);
			expect(kinds[0]).toBe("job.saved");
			expect(kinds.filter((kind) => kind === "prep.queued")).toHaveLength(2);
			expect(kinds.filter((kind) => kind === "prep.done")).toHaveLength(2);
			expect(kinds.indexOf("prep.started")).toBeGreaterThan(kinds.indexOf("prep.queued"));
			expect(story.run).toMatchObject({
				query: "Reliability engineering roles job posting".replace(
					"Reliability engineering roles",
					"Reliability engineer",
				),
			});
			expect(story.events.every((event) => !JSON.stringify(event.data).includes("synthetic"))).toBe(true);
			await expect(careerActivity.journey("bob", job?.id ?? "")).rejects.toMatchObject({ code: "NOT_FOUND" });

			// The application finds the same story, and only its owner can; one added by hand has none.
			const applicationId = job?.trackedApplicationId ?? "";
			expect(applicationId).not.toBe("");
			expect((await careerActivity.applicationJourney("alice", applicationId))?.opportunityId).toBe(job?.id);
			expect(await careerActivity.applicationJourney("bob", applicationId)).toBeNull();
			expect(await careerActivity.applicationJourney("alice", "added-by-hand")).toBeNull();

			// Its documents list on their own, with the baseline they started from.
			const jobs = await automation.preparations("alice", applicationId);
			expect(jobs).toHaveLength(1);
			expect(jobs[0]?.steps.every((step) => step.baseline?.resumeId === base)).toBe(true);
			expect(await automation.preparations("alice", "added-by-hand")).toEqual([]);

			// Each finished document points back at its application and baseline; nobody else sees them.
			const origins = await automation.documentOrigins("alice");
			expect(origins.map((origin) => origin.kind).sort()).toEqual(["letter", "resume"]);
			expect(
				origins.every((origin) => origin.applicationId === applicationId && origin.baseline?.resumeId === base),
			).toBe(true);
			expect(await automation.documentOrigins("bob")).toEqual([]);

			// The activity log links each job's events to its application.
			const log = await careerActivity.list("alice", { limit: 50 });
			const forJob = log.items.filter((event) => event.opportunityId === job?.id);
			expect(forJob.length).toBeGreaterThan(0);
			expect(forJob.every((event) => event.applicationId === applicationId)).toBe(true);
			expect(
				log.items.filter((event) => event.opportunityId === null).every((event) => event.applicationId === null),
			).toBe(true);
		});

		it("logs retries, waits for the limit and failures, and filters the feed to problems", async () => {
			const { careerActivity } = await import("./activity");
			const base = await baseline();
			await save("alice", settings({ resumesEnabled: true, baselineResumeId: base, dailyLimit: 1 }));
			fixture.search.mockResolvedValue([hit(1), hit(2)]);
			await discoverOnly();
			fixture.generate.mockRejectedValueOnce(Object.assign(new Error("secret-token busy"), { statusCode: 503 }));
			await getDb()
				.update(tables.careerPreparation)
				.set({ nextAttemptAt: new Date(Date.now() - 1000) });
			await runNow(1);
			await getDb()
				.update(tables.careerPreparation)
				.set({ nextAttemptAt: new Date(Date.now() - 1000) });
			await settle(4);
			const all = await careerActivity.list("alice", { limit: 50 });
			const kinds = all.items.map((event) => event.kind);
			expect(kinds).toEqual(
				expect.arrayContaining(["run.finished", "job.saved", "prep.retry", "prep.deferred", "prep.done"]),
			);
			expect(JSON.stringify(all.items)).not.toContain("secret-token");
			const problems = await careerActivity.list("alice", { problems: true });
			expect(problems.items.every((event) => event.level !== "info")).toBe(true);
			expect(problems.items.some((event) => event.kind === "prep.retry")).toBe(true);
			// Paginated, newest first.
			const page = await careerActivity.list("alice", { limit: 2, offset: 1 });
			expect(page.items).toHaveLength(2);
			expect(page.total).toBe(all.total);
			expect(await careerActivity.list("bob", {})).toEqual({ total: 0, items: [] });
		});

		it("records setting changes and failed runs, and forgets history past the retention window", async () => {
			const { careerActivity } = await import("./activity");
			const { purgeOldActivity } = await import("./events");
			const base = await baseline();
			await save("alice", settings({ resumesEnabled: true, baselineResumeId: base }));
			await save("alice", settings({ resumesEnabled: false, baselineResumeId: base }));
			fixture.search.mockRejectedValue(new Error("service down"));
			await getDb()
				.update(tables.careerSchedule)
				.set({ nextRunAt: new Date(Date.now() - 1000), lastQueuedAt: null });
			await run();
			const feed = (await careerActivity.list("alice", { limit: 50 })).items;
			expect(feed.filter((event) => event.kind === "setting.changed").map((event) => event.data)).toEqual(
				expect.arrayContaining([
					{ what: "resumes", on: true },
					{ what: "resumes", on: false },
				]),
			);
			expect(feed.find((event) => event.kind === "run.finished")).toMatchObject({
				level: "error",
				data: { outcome: "failed", failure: "search" },
			});
			const old = new Date(Date.now() - 40 * 86_400_000);
			await getDb().update(tables.careerEvent).set({ createdAt: old });
			await getDb().update(tables.careerRun).set({ createdAt: old });
			await purgeOldActivity(Date.now() + 2 * 3_600_000);
			expect((await careerActivity.list("alice", {})).total).toBe(0);
			expect((await automation.runs("alice", {})).total).toBe(0);
			expect(await getDb().select().from(tables.careerSchedule)).toHaveLength(1);
		});
	});

	describe("first-run setup", () => {
		const launchInput = (patch: Record<string, unknown> = {}) =>
			careerSetupLaunchSchema.parse({ query: "Reliability engineer", timezone: "Europe/Berlin", ...patch });

		it("walks baseline, services and discovery in order, derived from what is configured", async () => {
			const { careerSetup } = await import("./setup");
			expect(await careerSetup.get("alice")).toMatchObject({ step: "baseline", baseline: null, completed: false });
			const base = await baseline();
			await expect(careerSetup.confirmBaseline("bob", base)).rejects.toMatchObject({ code: "NOT_FOUND" });
			fixture.search_connection = null;
			const confirmed = await careerSetup.confirmBaseline("alice", base);
			expect(confirmed).toMatchObject({
				step: "services",
				baseline: { resumeId: base, confirmed: true, changedSinceConfirm: false },
				services: { search: false, ai: true },
			});
			fixture.search_connection = { provider: "tavily", apiKey: "x" };
			expect((await careerSetup.get("alice")).step).toBe("discovery");
			await getDb()
				.update(tables.resume)
				.set({ updatedAt: new Date(Date.now() + 60_000) })
				.where(eq(tables.resume.id, base));
			expect((await careerSetup.get("alice")).baseline?.changedSinceConfirm).toBe(true);
			expect((await automation.get("alice")).baselineResumeId).toBe(base);
		});

		it("checks a baseline without blocking it", async () => {
			const { careerSetup } = await import("./setup");
			const base = await baseline();
			const report = await careerSetup.validateBaseline("alice", base);
			expect(report.checks.every((check) => check.ok)).toBe(true);
			const blank = await resumes.create({ userId: "alice", name: "Blank", tags: [], locale: "en-US" });
			const bad = await careerSetup.validateBaseline("alice", blank);
			expect(bad.checks.some((check) => !check.ok)).toBe(true);
			await expect(careerSetup.confirmBaseline("alice", blank)).resolves.toMatchObject({
				baseline: { confirmed: true },
			});
			await expect(careerSetup.validateBaseline("bob", base)).rejects.toMatchObject({ code: "NOT_FOUND" });
		});

		it("previews a search without saving anything, and never leaks provider errors", async () => {
			const { careerSetup } = await import("./setup");
			fixture.search.mockResolvedValue([hit(1), hit(2)]);
			const results = await careerSetup.previewSearch("alice", "Reliability engineer");
			expect(results).toHaveLength(2);
			expect(await getDb().select().from(tables.careerOpportunity)).toHaveLength(0);
			expect(await getDb().select().from(tables.careerRun)).toHaveLength(0);
			fixture.search.mockRejectedValue(new Error("secret-key-123 rejected"));
			await expect(careerSetup.previewSearch("alice", "Reliability engineer")).rejects.toMatchObject({
				code: "BAD_GATEWAY",
				message: expect.not.stringContaining("secret"),
			});
			fixture.search_connection = null;
			await expect(careerSetup.previewSearch("alice", "Reliability engineer")).rejects.toMatchObject({
				code: "PRECONDITION_FAILED",
			});
		});

		it("launches only after a baseline is confirmed, starts discovery at once and reuses one schedule", async () => {
			const { careerSetup } = await import("./setup");
			await expect(careerSetup.launch("alice", launchInput())).rejects.toMatchObject({
				code: "PRECONDITION_FAILED",
			});
			const base = await baseline();
			await careerSetup.confirmBaseline("alice", base);
			const done = await careerSetup.launch(
				"alice",
				launchInput({ resumesEnabled: true, dailyLimit: 5, resumePrompt: "Stress backend work." }),
			);
			expect(done).toMatchObject({ step: "done", completed: true, discovery: { enabled: true } });
			const [schedule] = await getDb().select().from(tables.careerSchedule);
			expect(schedule).toMatchObject({ intervalMinutes: 60, query: "Reliability engineer", enabled: true });
			expect(schedule?.nextRunAt.getTime()).toBeLessThanOrEqual(Date.now());
			expect(await automation.get("alice")).toMatchObject({
				resumesEnabled: true,
				lettersEnabled: false,
				dailyLimit: 5,
				resumePrompt: "Stress backend work.",
				coverLetterPrompt: DEFAULT_COVER_LETTER_PROMPT,
			});
			await run();
			expect(fixture.search).toHaveBeenCalledOnce();
			await careerSetup.launch("alice", launchInput({ query: "Platform engineer", interval: "daily" }));
			// A later launch without prompts keeps the ones that were saved.
			expect((await automation.get("alice")).resumePrompt).toBe("Stress backend work.");
			const schedules = await getDb().select().from(tables.careerSchedule);
			expect(schedules).toHaveLength(1);
			expect(schedules[0]).toMatchObject({ query: "Platform engineer", intervalDays: 1, intervalMinutes: null });
		});

		it("explains a missing AI connection when documents are chosen, and remembers a skip per person", async () => {
			const { careerSetup } = await import("./setup");
			const base = await baseline();
			await careerSetup.confirmBaseline("alice", base);
			fixture.ai = null;
			await expect(careerSetup.launch("alice", launchInput({ lettersEnabled: true }))).rejects.toMatchObject({
				data: { missing: "ai" },
			});
			expect((await careerSetup.get("alice")).completed).toBe(false);
			expect((await careerSetup.get("alice")).needsSetup).toBe(true);
			expect(await careerSetup.skip("bob")).toMatchObject({ skipped: true, needsSetup: false });
			expect((await careerSetup.get("alice")).skipped).toBe(false);
		});
	});
});
